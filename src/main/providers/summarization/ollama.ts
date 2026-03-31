import { SummarizationProvider, SummarizeRequest } from './types';
import { MeetingNotes } from '../../../shared/types';
import { buildMeetingNotesPrompt } from './prompts';
import { parseMeetingNotes } from './parse-notes';
import { getConfig } from '../../config/store';

export class OllamaProvider implements SummarizationProvider {
  readonly id = 'ollama';
  readonly name = 'Ollama (Local)';

  private getBaseUrl(): string {
    return (getConfig().ollamaUrl || 'http://localhost:11434').replace(/\/+$/, '');
  }

  async summarize(req: SummarizeRequest): Promise<MeetingNotes> {
    const prompt = buildMeetingNotesPrompt(req.transcript, req.language);
    const baseUrl = this.getBaseUrl();

    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: req.model,
        prompt,
        stream: true,
        options: { temperature: 0.3, num_predict: 2048 },
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Ollama error (${res.status}): ${error}`);
    }

    let fullResponse = '';
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n').filter(Boolean)) {
        try {
          const parsed = JSON.parse(line) as { response: string; done: boolean };
          fullResponse += parsed.response;
          req.onProgress?.(fullResponse);
        } catch {}
      }
    }

    return parseMeetingNotes(fullResponse);
  }

  async listModels(): Promise<string[]> {
    try {
      const baseUrl = this.getBaseUrl();
      const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return [];
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      return (data.models || []).map((m) => m.name);
    } catch {
      return [];
    }
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    try {
      const baseUrl = this.getBaseUrl();
      const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      return res.ok ? { valid: true } : { valid: false, error: 'Ollama not responding' };
    } catch {
      return { valid: false, error: 'Ollama not running' };
    }
  }
}
