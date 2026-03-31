import { SummarizationProvider, SummarizeRequest } from './types';
import { MeetingNotes } from '../../../shared/types';
import { buildMeetingNotesPrompt } from './prompts';
import { parseMeetingNotes } from './parse-notes';
import { getConfig } from '../../config/store';

export class AzureOpenAIProvider implements SummarizationProvider {
  readonly id = 'azure-openai';
  readonly name = 'Azure OpenAI';

  async summarize(req: SummarizeRequest): Promise<MeetingNotes> {
    const config = getConfig().apiKeys;
    if (!config.azureOpenaiKey || !config.azureOpenaiEndpoint || !config.azureOpenaiDeployment) {
      throw new Error('Azure OpenAI not fully configured. Go to Settings.');
    }

    const prompt = buildMeetingNotesPrompt(req.transcript, req.language);
    const deployment = req.model || config.azureOpenaiDeployment;
    const url = `${config.azureOpenaiEndpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': config.azureOpenaiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      throw new Error(`Azure OpenAI error (${res.status}): ${error}`);
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

  async listModels(): Promise<string[]> {
    const deployment = getConfig().apiKeys.azureOpenaiDeployment;
    return deployment ? [deployment] : [];
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    const config = getConfig().apiKeys;
    if (!config.azureOpenaiKey) return { valid: false, error: 'No API key' };
    if (!config.azureOpenaiEndpoint) return { valid: false, error: 'No endpoint URL' };
    if (!config.azureOpenaiDeployment) return { valid: false, error: 'No deployment name' };
    return { valid: true };
  }
}
