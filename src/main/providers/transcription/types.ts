import { Transcript } from '../../../shared/types';

export interface TranscribeRequest {
  audioPath: string;
  model: string;
  language: string;
  onProgress?: (percent: number, text: string) => void;
}

export interface TranscriptionProvider {
  readonly id: string;
  readonly name: string;
  transcribe(request: TranscribeRequest): Promise<Transcript>;
  listModels(): Promise<string[]>;
  validateConfig(): Promise<{ valid: boolean; error?: string }>;
}
