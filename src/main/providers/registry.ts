import { TranscriptionProvider } from './transcription/types';
import { SummarizationProvider } from './summarization/types';

class ProviderRegistry {
  private transcription = new Map<string, TranscriptionProvider>();
  private summarization = new Map<string, SummarizationProvider>();

  registerTranscription(provider: TranscriptionProvider): void {
    this.transcription.set(provider.id, provider);
  }

  registerSummarization(provider: SummarizationProvider): void {
    this.summarization.set(provider.id, provider);
  }

  getTranscription(id: string): TranscriptionProvider {
    const p = this.transcription.get(id);
    if (!p) throw new Error(`Transcription provider '${id}' not found`);
    return p;
  }

  getSummarization(id: string): SummarizationProvider {
    const p = this.summarization.get(id);
    if (!p) throw new Error(`Summarization provider '${id}' not found`);
    return p;
  }

  listTranscriptionProviders(): { id: string; name: string }[] {
    return Array.from(this.transcription.values()).map((p) => ({ id: p.id, name: p.name }));
  }

  listSummarizationProviders(): { id: string; name: string }[] {
    return Array.from(this.summarization.values()).map((p) => ({ id: p.id, name: p.name }));
  }
}

export const registry = new ProviderRegistry();
