import * as fs from 'fs';
import * as path from 'path';
import { TranscriptionProvider, TranscribeRequest } from './types';
import { Transcript } from '../../../shared/types';
import { transcribe as whisperTranscribe } from '../../whisper/engine';
import { getWhisperBinPath, getModelsDir } from '../../setup/scanner';

export class WhisperLocalProvider implements TranscriptionProvider {
  readonly id = 'whisper-local';
  readonly name = 'Local (Whisper)';

  async transcribe(req: TranscribeRequest): Promise<Transcript> {
    return whisperTranscribe({
      audioPath: req.audioPath,
      model: req.model,
      language: req.language,
      onProgress: req.onProgress,
    });
  }

  async listModels(): Promise<string[]> {
    const dir = getModelsDir();
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((f) => f.startsWith('ggml-') && f.endsWith('.bin'))
      .map((f) => f.replace('ggml-', '').replace('.bin', ''));
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    if (!fs.existsSync(getWhisperBinPath())) {
      return { valid: false, error: 'whisper-cli.exe not found' };
    }
    const models = await this.listModels();
    if (models.length === 0) {
      return { valid: false, error: 'No whisper models downloaded' };
    }
    return { valid: true };
  }
}
