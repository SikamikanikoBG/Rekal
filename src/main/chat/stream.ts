import { getConfig } from '../config/store';
import { Transcript, MeetingNotes } from '../../shared/types';

const OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];
function resolveOpenAIModel(model?: string): string {
  if (model && OPENAI_MODELS.includes(model)) return model;
  return 'gpt-4o-mini';
}

export interface ChatStreamOptions {
  provider: string;
  model: string;
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  onToken: (token: string, done: boolean) => void;
}

function formatTranscript(transcript: Transcript): string {
  if (!transcript?.segments?.length) return '(No transcript available)';
  return transcript.segments
    .map((s) => {
      const m = Math.floor(s.start / 60);
      const sec = Math.floor(s.start % 60);
      const ts = `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
      return `[${ts}] ${s.text}`;
    })
    .join('\n');
}

export function buildChatSystemPrompt(transcript: Transcript, notes: MeetingNotes): string {
  const transcriptText = formatTranscript(transcript);
  const decisions = notes?.keyDecisions?.length
    ? notes.keyDecisions.map((d) => `- ${d}`).join('\n')
    : '(None)';
  const actions = notes?.actionItems?.length
    ? notes.actionItems.map((a) => `- ${a.text}${a.assignee ? ` (${a.assignee})` : ''}`).join('\n')
    : '(None)';
  const topics = notes?.topics?.length ? notes.topics.join(', ') : '(None)';

  return `You are an AI assistant analyzing a meeting transcript and notes. Answer questions about this meeting accurately and concisely. Reference specific parts of the transcript when relevant. Here is the meeting data:

[TRANSCRIPT]
${transcriptText}

[MEETING NOTES]
Summary: ${notes?.summary || '(No summary available)'}
Key Decisions: ${decisions}
Action Items: ${actions}
Topics: ${topics}`;
}

export async function streamChat(opts: ChatStreamOptions): Promise<string> {
  const { provider, model, systemPrompt, messages, onToken } = opts;

  switch (provider) {
    case 'ollama':
      return streamOllama(model, systemPrompt, messages, onToken);
    case 'openai':
      return streamOpenAI(model, systemPrompt, messages, onToken);
    case 'claude':
      return streamClaude(model, systemPrompt, messages, onToken);
    case 'azure-openai':
      return streamAzureOpenAI(model, systemPrompt, messages, onToken);
    case 'haiper-proxy':
      return streamHaiperProxy(model, systemPrompt, messages, onToken);
    default:
      throw new Error(`Unsupported chat provider: ${provider}`);
  }
}

async function streamOllama(
  model: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  onToken: (token: string, done: boolean) => void
): Promise<string> {
  const baseUrl = (getConfig().ollamaUrl || 'http://localhost:11434').replace(/\/+$/, '');

  const ollamaMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: ollamaMessages,
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
        const parsed = JSON.parse(line) as { message?: { content: string }; done: boolean };
        const token = parsed.message?.content || '';
        if (token) {
          fullResponse += token;
          onToken(token, false);
        }
        if (parsed.done) {
          onToken('', true);
        }
      } catch {}
    }
  }

  onToken('', true);
  return fullResponse;
}

async function streamOpenAI(
  model: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  onToken: (token: string, done: boolean) => void
): Promise<string> {
  const apiKey = getConfig().apiKeys.openai;
  if (!apiKey) throw new Error('OpenAI API key not configured. Go to Settings.');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: resolveOpenAIModel(model),
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.3,
      stream: true,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI error (${res.status}): ${error}`);
  }

  let fullResponse = '';
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const parsed = JSON.parse(line.slice(6));
          const token = parsed.choices?.[0]?.delta?.content || '';
          if (token) {
            fullResponse += token;
            onToken(token, false);
          }
        } catch {}
      }
    }
  }

  onToken('', true);
  return fullResponse;
}

async function streamClaude(
  model: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  onToken: (token: string, done: boolean) => void
): Promise<string> {
  const apiKey = getConfig().apiKeys.anthropic;
  if (!apiKey) throw new Error('Anthropic API key not configured. Go to Settings.');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
      stream: true,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Anthropic error (${res.status}): ${error}`);
  }

  let fullResponse = '';
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            fullResponse += parsed.delta.text;
            onToken(parsed.delta.text, false);
          }
        } catch {}
      }
    }
  }

  onToken('', true);
  return fullResponse;
}

async function streamHaiperProxy(
  _model: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  onToken: (token: string, done: boolean) => void
): Promise<string> {
  const { net } = await import('electron');

  const res = await net.fetch('https://haiper.test.postbank.bg/api/meeting-ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system_prompt: systemPrompt, messages }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`hAIper chat error (${res.status}): ${error}`);
  }

  let fullResponse = '';
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const parsed = JSON.parse(line.slice(6));
          const token = parsed.choices?.[0]?.delta?.content || '';
          if (token) {
            fullResponse += token;
            onToken(token, false);
          }
        } catch {}
      }
    }
  }

  onToken('', true);
  return fullResponse;
}

async function streamAzureOpenAI(
  model: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  onToken: (token: string, done: boolean) => void
): Promise<string> {
  const config = getConfig().apiKeys;
  if (!config.azureOpenaiKey || !config.azureOpenaiEndpoint || !config.azureOpenaiDeployment) {
    throw new Error('Azure OpenAI not fully configured. Go to Settings.');
  }

  const deployment = model || config.azureOpenaiDeployment;
  const url = `${config.azureOpenaiEndpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': config.azureOpenaiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.3,
      stream: true,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Azure OpenAI error (${res.status}): ${error}`);
  }

  let fullResponse = '';
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const parsed = JSON.parse(line.slice(6));
          const token = parsed.choices?.[0]?.delta?.content || '';
          if (token) {
            fullResponse += token;
            onToken(token, false);
          }
        } catch {}
      }
    }
  }

  onToken('', true);
  return fullResponse;
}
