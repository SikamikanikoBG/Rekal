import { Transcript, MeetingNotes } from '../../../shared/types';

export interface SummarizeRequest {
  transcript: Transcript;
  model: string;
  language?: string;
  onProgress?: (text: string) => void;
}

export interface SummarizationProvider {
  readonly id: string;
  readonly name: string;
  summarize(request: SummarizeRequest): Promise<MeetingNotes>;
  listModels(): Promise<string[]>;
  validateConfig(): Promise<{ valid: boolean; error?: string }>;
}
