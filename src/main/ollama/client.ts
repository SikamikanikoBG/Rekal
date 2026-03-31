import { MeetingNotes, Transcript } from '../../shared/types';
import { buildMeetingNotesPrompt } from './prompts';
import { getConfig } from '../config/store';

interface OllamaOptions {
  model: string;
  language?: string;
  baseUrl?: string;
  onProgress?: (text: string) => void;
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

function getDefaultOllamaUrl(): string {
  return (getConfig().ollamaUrl || 'http://localhost:11434').replace(/\/+$/, '');
}

/**
 * Checks if Ollama is running and responsive.
 */
export async function isOllamaRunning(baseUrl = getDefaultOllamaUrl()): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Lists available models from the running Ollama instance.
 */
export async function listModels(baseUrl = getDefaultOllamaUrl()): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    return (data.models || []).map((m) => m.name);
  } catch {
    return [];
  }
}

/**
 * Generates meeting notes from a transcript using the user's chosen Ollama model.
 * Streams the response for progress feedback.
 */
export async function generateMeetingNotes(
  transcript: Transcript,
  options: OllamaOptions
): Promise<MeetingNotes> {
  const { model, language, baseUrl = getDefaultOllamaUrl(), onProgress } = options;

  const prompt = buildMeetingNotesPrompt(transcript, language);

  const res = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: true,
      options: {
        temperature: 0.3,
        num_predict: 2048,
      },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Ollama error (${res.status}): ${error}`);
  }

  // Stream the response
  let fullResponse = '';
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as OllamaGenerateResponse;
        fullResponse += parsed.response;
        onProgress?.(fullResponse);
      } catch {
        // Skip malformed lines
      }
    }
  }

  return parseMeetingNotes(fullResponse);
}

/**
 * Parses the LLM response into structured MeetingNotes.
 * Handles both JSON responses and markdown-formatted responses.
 */
function parseMeetingNotes(response: string): MeetingNotes {
  // Try JSON first
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.summary && parsed.actionItems) {
        return {
          summary: parsed.summary,
          actionItems: (parsed.actionItems || parsed.action_items || []).map(
            (item: string | { text: string }, i: number) => ({
              id: `ai-${i}`,
              text: typeof item === 'string' ? item : item.text,
              done: false,
            })
          ),
          keyDecisions: parsed.keyDecisions || parsed.key_decisions || [],
          topics: parsed.topics || [],
        };
      }
    }
  } catch {
    // Fall through to markdown parsing
  }

  // Parse markdown-style response
  const sections = response.split(/^#+\s+/m);
  let summary = '';
  let actionItems: string[] = [];
  let keyDecisions: string[] = [];
  let topics: string[] = [];

  for (const section of sections) {
    const lower = section.toLowerCase();
    const lines = section
      .split('\n')
      .slice(1)
      .map((l) => l.replace(/^[-*]\s+/, '').trim())
      .filter(Boolean);

    if (lower.startsWith('summary')) {
      summary = lines.join(' ');
    } else if (lower.startsWith('action')) {
      actionItems = lines;
    } else if (lower.startsWith('decision') || lower.startsWith('key decision')) {
      keyDecisions = lines;
    } else if (lower.startsWith('topic') || lower.startsWith('key topic')) {
      topics = lines;
    }
  }

  // If no sections found, treat the whole thing as a summary
  if (!summary && !actionItems.length) {
    summary = response.trim();
  }

  return {
    summary,
    actionItems: actionItems.map((text, i) => ({ id: `ai-${i}`, text, done: false })),
    keyDecisions,
    topics,
  };
}
