import * as fs from 'fs';
import { net } from 'electron';
import { TranscriptionProvider, TranscribeRequest } from './types';
import { Transcript, TranscriptSegment } from '../../../shared/types';
import { getConfig } from '../../config/store';

export class AzureSpeechProvider implements TranscriptionProvider {
  readonly id = 'azure-speech';
  readonly name = 'Azure Speech';

  async transcribe(req: TranscribeRequest): Promise<Transcript> {
    const config = getConfig().apiKeys;
    const key = config.azureSpeechKey;
    const region = config.azureSpeechRegion;
    if (!key || !region) throw new Error('Azure Speech key/region not configured. Go to Settings.');

    req.onProgress?.(10, 'Uploading to Azure Speech...');

    const audioData = fs.readFileSync(req.audioPath);
    const lang = req.language === 'auto' ? 'en-US' : mapLanguageCode(req.language);

    const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${lang}&format=detailed`;

    console.log('[DEBUG] Azure Speech request', { url, region, audioSize: audioData.length, lang, keyPrefix: key?.substring(0, 6) + '...', keyLength: key?.length });
    const res = await net.fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
      },
      body: audioData,
    });

    if (!res.ok) {
      const error = await res.text();
      console.log('[DEBUG] Azure Speech 401 details', { status: res.status, body: error, headers: Object.fromEntries(res.headers.entries()) });
      throw new Error(`Azure Speech error (${res.status}): ${error}`);
    }

    req.onProgress?.(80, 'Parsing results...');

    const data = await res.json() as {
      RecognitionStatus: string;
      DisplayText?: string;
      Duration?: number;
      NBest?: Array<{
        Display: string;
        Words?: Array<{ Word: string; Offset: number; Duration: number }>;
      }>;
    };

    if (data.RecognitionStatus !== 'Success') {
      throw new Error(`Recognition failed: ${data.RecognitionStatus}`);
    }

    const text = data.NBest?.[0]?.Display || data.DisplayText || '';
    const durationTicks = data.Duration || 0;
    const durationSec = durationTicks / 10_000_000;

    // Azure simple recognition returns a single segment
    const segments: TranscriptSegment[] = text ? [{ start: 0, end: durationSec, text }] : [];

    req.onProgress?.(100, 'Done');

    return {
      segments,
      language: req.language === 'auto' ? 'en' : req.language,
      duration: durationSec,
    };
  }

  async listModels(): Promise<string[]> {
    return ['default'];
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    const config = getConfig().apiKeys;
    if (!config.azureSpeechKey) return { valid: false, error: 'No API key configured' };
    if (!config.azureSpeechRegion) return { valid: false, error: 'No region configured' };
    return { valid: true };
  }
}

function mapLanguageCode(code: string): string {
  const map: Record<string, string> = {
    en: 'en-US',
    bg: 'bg-BG',
  };
  return map[code] || code;
}
