import { SummarizationProvider, SummarizeRequest } from './types';
import { MeetingNotes } from '../../../shared/types';
import { buildMeetingNotesPrompt } from './prompts';
import { parseMeetingNotes } from './parse-notes';
import { getConfig } from '../../config/store';

export class OpenAIProvider implements SummarizationProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';

  async summarize(req: SummarizeRequest): Promise<MeetingNotes> {
    const apiKey = getConfig().apiKeys.openai;
    if (!apiKey) throw new Error('OpenAI API key not configured. Go to Settings.');

    const prompt = buildMeetingNotesPrompt(req.transcript, req.language);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.resolveModel(req.model),
        messages: [
          { role: 'system', content: 'You are a meeting notes assistant. Respond only with valid JSON.' },
          { role: 'user', content: prompt },
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
            const delta = parsed.choices?.[0]?.delta?.content || '';
            fullResponse += delta;
            req.onProgress?.(fullResponse);
          } catch {}
        }
      }
    }

    return parseMeetingNotes(fullResponse);
  }

  private readonly MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];

  private resolveModel(model?: string): string {
    if (model && this.MODELS.includes(model)) return model;
    return 'gpt-4o-mini';
  }

  async listModels(): Promise<string[]> {
    return this.MODELS;
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    const apiKey = getConfig().apiKeys.openai;
    if (!apiKey) return { valid: false, error: 'No API key configured' };
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return res.ok ? { valid: true } : { valid: false, error: `API returned ${res.status}` };
    } catch (e) {
      return { valid: false, error: (e as Error).message };
    }
  }
}
