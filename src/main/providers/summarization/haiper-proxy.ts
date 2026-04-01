import { net } from 'electron';
import { SummarizationProvider, SummarizeRequest } from './types';
import { MeetingNotes } from '../../../shared/types';
import { parseMeetingNotes } from './parse-notes';

const HAIPER_BASE_URL = 'https://haiper.test.postbank.bg';

export class HaiperSummarizationProvider implements SummarizationProvider {
  readonly id = 'haiper-proxy';
  readonly name = 'hAIper (Remote)';

  async summarize(req: SummarizeRequest): Promise<MeetingNotes> {
    const transcriptText = req.transcript.segments.map((s) => s.text).join('\n');

    const res = await net.fetch(`${HAIPER_BASE_URL}/api/meeting-ai/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: transcriptText }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`hAIper summarization error (${res.status}): ${error}`);
    }

    const data = await res.json() as any;

    if (data.error) throw new Error(data.error);

    // Structured JSON response (summary/actionItems/keyDecisions/topics)
    if (data.summary !== undefined || data.actionItems !== undefined) {
      const text = JSON.stringify(data);
      req.onProgress?.(text);
      return parseMeetingNotes(text);
    }

    // Fallback: plain text in content field
    const text = data.content || '';
    req.onProgress?.(text);
    return parseMeetingNotes(text);
  }

  async listModels(): Promise<string[]> {
    return ['default'];
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    return { valid: true };
  }
}
