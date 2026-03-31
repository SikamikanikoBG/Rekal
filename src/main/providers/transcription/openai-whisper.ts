import * as fs from 'fs';
import * as path from 'path';
import { TranscriptionProvider, TranscribeRequest } from './types';
import { Transcript, TranscriptSegment } from '../../../shared/types';
import { getConfig } from '../../config/store';

export class OpenAIWhisperProvider implements TranscriptionProvider {
  readonly id = 'openai-whisper';
  readonly name = 'OpenAI Whisper';

  async transcribe(req: TranscribeRequest): Promise<Transcript> {
    const apiKey = getConfig().apiKeys.openai;
    if (!apiKey) throw new Error('OpenAI API key not configured. Go to Settings to add it.');

    req.onProgress?.(10, 'Uploading audio to OpenAI...');

    const fileBuffer = fs.readFileSync(req.audioPath);
    const fileName = path.basename(req.audioPath);

    // Build multipart form data manually (Node.js)
    const boundary = '----Rekal' + Date.now();
    const parts: Buffer[] = [];

    // File part
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: audio/wav\r\n\r\n`
    ));
    parts.push(fileBuffer);
    parts.push(Buffer.from('\r\n'));

    // Model part
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${req.model || 'whisper-1'}\r\n`
    ));

    // Response format
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\nverbose_json\r\n`
    ));

    // Timestamp granularities
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="timestamp_granularities[]"\r\n\r\nsegment\r\n`
    ));

    // Language (if not auto)
    if (req.language && req.language !== 'auto') {
      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${req.language}\r\n`
      ));
    }

    parts.push(Buffer.from(`--${boundary}--\r\n`));
    const body = Buffer.concat(parts);

    req.onProgress?.(30, 'Transcribing with OpenAI...');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${error}`);
    }

    req.onProgress?.(90, 'Parsing results...');

    const data = await res.json() as {
      text: string;
      language: string;
      duration: number;
      segments?: Array<{
        start: number;
        end: number;
        text: string;
      }>;
    };

    const segments: TranscriptSegment[] = (data.segments || []).map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    }));

    // If no segments, create one from the full text
    if (segments.length === 0 && data.text) {
      segments.push({ start: 0, end: data.duration || 0, text: data.text.trim() });
    }

    req.onProgress?.(100, 'Done');

    return {
      segments,
      language: data.language || req.language || 'en',
      duration: data.duration || 0,
    };
  }

  async listModels(): Promise<string[]> {
    return ['whisper-1'];
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
