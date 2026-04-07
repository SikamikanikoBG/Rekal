import * as fs from 'fs';
import { net } from 'electron';
import { TranscriptionProvider, TranscribeRequest } from './types';
import { Transcript } from '../../../shared/types';
import { getConfig } from '../../config/store';

const HAIPER_BASE_URL = 'https://haiper.test.postbank.bg';

export class HaiperTranscriptionProvider implements TranscriptionProvider {
  readonly id = 'haiper-proxy';
  readonly name = 'hAIper (Remote)';

  async transcribe(req: TranscribeRequest): Promise<Transcript> {
    req.onProgress?.(10, 'Uploading to hAIper...');

    const audioData = fs.readFileSync(req.audioPath);
    const lang = req.language || 'auto';
    const filename = req.audioPath.split(/[\\/]/).pop() || 'audio.wav';

    // Build multipart/form-data manually
    const boundary = `----FormBoundary${Date.now()}`;
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="${filename}"\r\nContent-Type: audio/wav\r\n\r\n`
      ),
      audioData,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const apiKey = getConfig().apiKeys.haiperApiKey || '';
    const res = await net.fetch(
      `${HAIPER_BASE_URL}/api/meeting-ai/transcribe?language=${lang}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'X-API-Key': apiKey,
        },
        body,
      }
    );

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`hAIper transcription error (${res.status}): ${error}`);
    }

    req.onProgress?.(80, 'Parsing results...');

    const data = await res.json() as { transcript: string; status: string };

    req.onProgress?.(100, 'Done');

    return {
      segments: data.transcript ? [{ start: 0, end: 0, text: data.transcript }] : [],
      language: lang.split('-')[0],
      duration: 0,
    };
  }

  async listModels(): Promise<string[]> {
    return ['default'];
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    return { valid: true };
  }
}
