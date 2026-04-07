import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Setup
  scanDependencies: () => ipcRenderer.invoke('scan-dependencies'),
  installMissing: (scan: unknown) => ipcRenderer.invoke('install-missing', scan),
  onInstallProgress: (cb: (data: { step: string; detail: string; percent: number }) => void) => {
    ipcRenderer.on('install-progress', (_e, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('install-progress');
  },

  // Ethical TTS
  tts: {
    recordingStarted: () => ipcRenderer.invoke('tts:recording-started'),
    recordingStopped: () => ipcRenderer.invoke('tts:recording-stopped'),
    recordingInProgress: () => ipcRenderer.invoke('tts:recording-in-progress'),
  },

  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (partial: unknown) => ipcRenderer.invoke('set-config', partial),
  setApiKey: (key: string, value: string) => ipcRenderer.invoke('set-api-key', key, value),

  // Providers
  listProviders: () => ipcRenderer.invoke('list-providers'),
  listProviderModels: (type: string, providerId: string) =>
    ipcRenderer.invoke('list-provider-models', type, providerId),
  validateProvider: (type: string, providerId: string) =>
    ipcRenderer.invoke('validate-provider', type, providerId),

  // Ollama URL config
  getOllamaUrl: () => ipcRenderer.invoke('get-ollama-url'),
  setOllamaUrl: (url: string) => ipcRenderer.invoke('set-ollama-url', url),
  testOllamaConnection: (url: string) => ipcRenderer.invoke('test-ollama-connection', url),

  // Legacy Ollama (for Setup screen)
  getOllamaModels: () => ipcRenderer.invoke('get-ollama-models'),
  checkOllama: () => ipcRenderer.invoke('check-ollama'),

  // Audio
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  saveAudioBlob: (data: number[], mimeType: string) =>
    ipcRenderer.invoke('save-audio-blob', data, mimeType),
  transcribeChunk: (data: number[], language: string) =>
    ipcRenderer.invoke('transcribe-chunk', data, language),

  // Transcription (provider-based)
  transcribe: (providerId: string, audioPath: string, model: string, language: string) =>
    ipcRenderer.invoke('transcribe', providerId, audioPath, model, language),
  onTranscriptionProgress: (cb: (data: { percent: number; text: string }) => void) => {
    ipcRenderer.on('transcription-progress', (_e, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('transcription-progress');
  },

  // Summarization (provider-based)
  summarize: (providerId: string, transcript: unknown, model: string, language?: string) =>
    ipcRenderer.invoke('summarize', providerId, transcript, model, language),
  onSummaryProgress: (cb: (data: { text: string }) => void) => {
    ipcRenderer.on('summary-progress', (_e, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('summary-progress');
  },

  // Meetings
  getMeetings: (limit?: number) => ipcRenderer.invoke('get-meetings', limit),
  getMeeting: (id: string) => ipcRenderer.invoke('get-meeting', id),
  searchMeetings: (query: string) => ipcRenderer.invoke('search-meetings', query),
  saveMeeting: (meeting: unknown) => ipcRenderer.invoke('save-meeting', meeting),

  // Export
  openMailto: (subject: string, body: string) => ipcRenderer.invoke('open-mailto', subject, body),
  saveTextFile: (content: string, defaultName: string) => ipcRenderer.invoke('save-text-file', content, defaultName),

  // Tray
  onStartRecording: (cb: () => void) => {
    ipcRenderer.on('start-recording', () => cb());
    return () => ipcRenderer.removeAllListeners('start-recording');
  },

  // Dashboard
  dashboard: {
    getStats: () => ipcRenderer.invoke('dashboard:stats'),
  },

  // Tasks
  tasks: {
    getAll: () => ipcRenderer.invoke('tasks:get-all'),
    toggle: (meetingId: string, taskId: string) => ipcRenderer.invoke('tasks:toggle', meetingId, taskId),
  },

  // Chat
  chat: {
    send: (meetingId: string, message: string) =>
      ipcRenderer.invoke('chat:send', { meetingId, message }),
    onToken: (cb: (data: { token: string; done: boolean; error?: string }) => void) => {
      ipcRenderer.on('chat:token', (_e, data) => cb(data));
      return () => ipcRenderer.removeAllListeners('chat:token');
    },
    history: (meetingId: string) => ipcRenderer.invoke('chat:history', meetingId),
    clear: (meetingId: string) => ipcRenderer.invoke('chat:clear', meetingId),
    sendGlobal: (message: string) =>
      ipcRenderer.invoke('chat:send-global', { message }),
    onGlobalToken: (cb: (data: { token: string; done: boolean; error?: string }) => void) => {
      ipcRenderer.on('chat:global-token', (_e, data) => cb(data));
      return () => ipcRenderer.removeAllListeners('chat:global-token');
    },
    globalHistory: () => ipcRenderer.invoke('chat:global-history'),
    clearGlobal: () => ipcRenderer.invoke('chat:clear-global'),
  },

  // Gamification
  gamification: {
    getStats: () => ipcRenderer.invoke('gamification:stats'),
    getAchievements: () => ipcRenderer.invoke('gamification:achievements'),
    awardXP: (eventType: string, meetingId?: string) =>
      ipcRenderer.invoke('gamification:award-xp', eventType, meetingId),
    getChallenge: () => ipcRenderer.invoke('gamification:challenge'),
    getXPHistory: (limit?: number) => ipcRenderer.invoke('gamification:xp-history', limit),
  },

  // Usage Costs
  costs: {
    save: (record: { meetingId?: string; serviceType: string; provider: string; model: string; inputTokens?: number; outputTokens?: number; audioSeconds?: number; costUsd: number }) =>
      ipcRenderer.invoke('costs:save', record),
    forMeeting: (meetingId: string) => ipcRenderer.invoke('costs:meeting', meetingId),
    summary: () => ipcRenderer.invoke('costs:summary'),
  },

  // Failed Sessions
  failedSessions: {
    save: (session: { id: string; audioPath: string; transcript: any; failedStep: string; errorMessage: string }) =>
      ipcRenderer.invoke('failed-sessions:save', session),
    getAll: () => ipcRenderer.invoke('failed-sessions:get-all'),
    delete: (id: string) => ipcRenderer.invoke('failed-sessions:delete', id),
  },

  // Managed config mode
  getManagedMode: () => ipcRenderer.invoke('get-managed-mode'),

  // MCP Server
  mcp: {
    status: () => ipcRenderer.invoke('mcp:status'),
    toggle: () => ipcRenderer.invoke('mcp:toggle'),
  },
});
