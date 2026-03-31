import Store from 'electron-store';

export interface ConfigSchema {
  transcriptionProvider: string;
  transcriptionModel: string;
  summarizationProvider: string;
  summarizationModel: string;
  language: string;
  ollamaUrl: string;
  apiKeys: {
    openai?: string;
    anthropic?: string;
    azureSpeechKey?: string;
    azureSpeechRegion?: string;
    azureOpenaiKey?: string;
    azureOpenaiEndpoint?: string;
    azureOpenaiDeployment?: string;
  };
}

const store = new Store<ConfigSchema>({
  name: 'config',
  encryptionKey: 'rekal-local-enc-2026',
  defaults: {
    transcriptionProvider: 'whisper-local',
    transcriptionModel: 'small',
    summarizationProvider: 'ollama',
    summarizationModel: '',
    language: 'auto',
    ollamaUrl: 'http://localhost:11434',
    apiKeys: {},
  },
});

export function getConfig(): ConfigSchema {
  return store.store;
}

export function setConfig(partial: Partial<ConfigSchema>): void {
  for (const [key, value] of Object.entries(partial)) {
    if (key === 'apiKeys' && typeof value === 'object') {
      const current = store.get('apiKeys') || {};
      store.set('apiKeys', { ...current, ...value });
    } else {
      store.set(key as keyof ConfigSchema, value as any);
    }
  }
}

export function getApiKey(key: keyof ConfigSchema['apiKeys']): string | undefined {
  return store.get('apiKeys')?.[key];
}

export function setApiKey(key: keyof ConfigSchema['apiKeys'], value: string): void {
  const current = store.get('apiKeys') || {};
  store.set('apiKeys', { ...current, [key]: value });
}
