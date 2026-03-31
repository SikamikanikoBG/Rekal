import { SummarizationProvider, SummarizeRequest } from './types';
import { MeetingNotes } from '../../../shared/types';
import { buildMeetingNotesPrompt } from './prompts';
import { parseMeetingNotes } from './parse-notes';
import { getConfig } from '../../config/store';

export class ClaudeProvider implements SummarizationProvider {
  readonly id = 'claude';
  readonly name = 'Claude';

  async summarize(req: SummarizeRequest): Promise<MeetingNotes> {
    const apiKey = getConfig().apiKeys.anthropic;
    if (!apiKey) throw new Error('Anthropic API key not configured. Go to Settings.');

    const prompt = buildMeetingNotesPrompt(req.transcript, req.language);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.resolveModel(req.model),
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
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
              req.onProgress?.(fullResponse);
            }
          } catch {}
        }
      }
    }

    return parseMeetingNotes(fullResponse);
  }

  private readonly MODELS = ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'];

  private resolveModel(model?: string): string {
    if (model && this.MODELS.includes(model)) return model;
    return 'claude-sonnet-4-20250514';
  }

  async listModels(): Promise<string[]> {
    return this.MODELS;
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    const apiKey = getConfig().apiKeys.anthropic;
    if (!apiKey) return { valid: false, error: 'No API key configured' };
    // Light validation — just check the key format
    if (!apiKey.startsWith('sk-ant-')) return { valid: false, error: 'Invalid key format' };
    return { valid: true };
  }
}
