import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { ChildProcess, fork } from 'child_process';
import { scanDependencies } from './setup/scanner';
import { installMissing } from './setup/installer';
import { initDatabase, saveMeeting, getMeeting, getMeetings, searchMeetings, saveChatMessage, getChatMessages, clearChatMessages, getDashboardStats, getAllTasks, updateMeetingNotes } from './storage/db';
import { getNewRecordingPath } from './audio/recorder';
import { registry } from './providers';
import { getConfig, setConfig, setApiKey } from './config/store';
import { ScanResult, Meeting } from '../shared/types';
import { streamChat, buildChatSystemPrompt } from './chat/stream';
import { awardXP, getStats, getAchievements, getActiveChallenge, startWeeklyChallenge, updateStreak, getLevelInfo, getXPHistory, checkSpecialAchievement } from './gamification/engine';
import { logger } from './logging/logger';

// ── Input Validation Helpers ──

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function hasPathTraversal(value: string): boolean {
  return /\.\.[/\\]/.test(value) || value.includes('\0');
}

function validateStringArg(value: unknown, name: string): string {
  if (!isNonEmptyString(value)) {
    throw new Error(`Invalid argument: ${name} must be a non-empty string`);
  }
  return value;
}

function validateId(value: unknown, name: string): string {
  const s = validateStringArg(value, name);
  if (hasPathTraversal(s)) {
    throw new Error(`Invalid argument: ${name} contains invalid characters`);
  }
  return s;
}

function validatePath(value: unknown, name: string): string {
  const s = validateStringArg(value, name);
  if (hasPathTraversal(s)) {
    throw new Error(`Invalid argument: ${name} contains path traversal`);
  }
  return s;
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let mcpProcess: ChildProcess | null = null;

function getMcpEntryPath(): string {
  return path.join(__dirname, 'mcp', 'index.js');
}

function startMcpServer(): boolean {
  if (mcpProcess && !mcpProcess.killed) {
    return true; // already running
  }
  const entryPath = getMcpEntryPath();
  if (!fs.existsSync(entryPath)) {
    return false;
  }
  mcpProcess = fork(entryPath, [], {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    silent: true,
  });
  mcpProcess.on('exit', () => {
    mcpProcess = null;
  });
  return true;
}

function stopMcpServer(): void {
  if (mcpProcess && !mcpProcess.killed) {
    mcpProcess.kill();
    mcpProcess = null;
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    backgroundColor: '#FAFAFA',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const rendererPath = path.join(__dirname, '..', '..', 'renderer', 'index.html');
  const isDev = process.env.NODE_ENV === 'development';
  const useDevServer = isDev && process.env.VITE_DEV === '1';

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  if (useDevServer) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(rendererPath);
  }
}

function createTray(): void {
  try {
    tray = new Tray(nativeImage.createEmpty());
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Open Rekal', click: () => mainWindow?.show() },
      { type: 'separator' },
      { label: 'Quick Record', click: () => mainWindow?.webContents.send('start-recording') },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]);
    tray.setToolTip('Rekal');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => mainWindow?.show());
  } catch {}
}

// ── IPC Handlers ──

function registerIpcHandlers(): void {
  // Dependency scanning
  ipcMain.handle('scan-dependencies', async (): Promise<ScanResult> => {
    return scanDependencies();
  });

  ipcMain.handle('install-missing', async (_event, scan: ScanResult) => {
    try {
      logger.info('Installing missing dependencies');
      await installMissing(scan, (step, detail, percent) => {
        mainWindow?.webContents.send('install-progress', { step, detail, percent });
      });
      logger.info('Dependencies installed successfully');
      return { success: true };
    } catch (e) {
      logger.error('Dependency installation failed', { error: (e as Error).message });
      return { success: false, error: (e as Error).message };
    }
  });

  // ── Config ──

  ipcMain.handle('get-config', async () => getConfig());
  ipcMain.handle('set-config', async (_e, partial) => setConfig(partial));
  ipcMain.handle('set-api-key', async (_e, key, value) => setApiKey(key, value));

  // ── Providers ──

  ipcMain.handle('list-providers', async () => ({
    transcription: registry.listTranscriptionProviders(),
    summarization: registry.listSummarizationProviders(),
  }));

  ipcMain.handle('list-provider-models', async (_e, type: string, providerId: string) => {
    validateStringArg(type, 'type');
    validateStringArg(providerId, 'providerId');
    if (type === 'transcription') return registry.getTranscription(providerId).listModels();
    return registry.getSummarization(providerId).listModels();
  });

  ipcMain.handle('validate-provider', async (_e, type: string, providerId: string) => {
    validateStringArg(type, 'type');
    validateStringArg(providerId, 'providerId');
    logger.debug('Validating provider', { type, providerId });
    if (type === 'transcription') return registry.getTranscription(providerId).validateConfig();
    return registry.getSummarization(providerId).validateConfig();
  });

  // ── Audio ──

  ipcMain.handle('save-audio-blob', async (_event, data: number[], _mimeType: string) => {
    const filePath = getNewRecordingPath();
    fs.writeFileSync(filePath, Buffer.from(data));
    return filePath;
  });

  // ── Transcription (via provider) ──

  ipcMain.handle('transcribe', async (_event, providerId: string, audioPath: string, model: string, language: string) => {
    try {
      validateStringArg(providerId, 'providerId');
      validatePath(audioPath, 'audioPath');
      validateStringArg(model, 'model');
      logger.info('Starting transcription', { providerId, model, language });
      const provider = registry.getTranscription(providerId);
      const transcript = await provider.transcribe({
        audioPath,
        model,
        language,
        onProgress: (pct, text) => {
          mainWindow?.webContents.send('transcription-progress', { percent: pct, text });
        },
      });
      logger.info('Transcription completed', { providerId, model });
      return { success: true, transcript };
    } catch (e) {
      logger.error('Transcription failed', { providerId, model, error: (e as Error).message });
      return { success: false, error: (e as Error).message };
    }
  });

  // ── Summarization (via provider) ──

  ipcMain.handle('summarize', async (_event, providerId: string, transcript, model: string, language?: string) => {
    try {
      validateStringArg(providerId, 'providerId');
      validateStringArg(model, 'model');
      logger.info('Starting summarization', { providerId, model, language });
      const provider = registry.getSummarization(providerId);
      const notes = await provider.summarize({
        transcript,
        model,
        language,
        onProgress: (text) => {
          mainWindow?.webContents.send('summary-progress', { text });
        },
      });
      logger.info('Summarization completed', { providerId, model });
      return { success: true, notes };
    } catch (e) {
      logger.error('Summarization failed', { providerId, model, error: (e as Error).message });
      return { success: false, error: (e as Error).message };
    }
  });

  // ── Meetings ──

  ipcMain.handle('get-meetings', async (_event, limit?: number) => {
    if (limit !== undefined && (typeof limit !== 'number' || limit < 0)) {
      throw new Error('Invalid argument: limit must be a non-negative number');
    }
    return getMeetings(limit);
  });
  ipcMain.handle('get-meeting', async (_event, id: string) => {
    validateId(id, 'meetingId');
    return getMeeting(id);
  });
  ipcMain.handle('search-meetings', async (_event, query: string) => {
    validateStringArg(query, 'query');
    return searchMeetings(query);
  });
  ipcMain.handle('save-meeting', async (_event, meeting: Meeting) => {
    validateId(meeting?.id, 'meeting.id');
    logger.info('Saving meeting', { meetingId: meeting.id, title: meeting.title });
    saveMeeting(meeting);

    // ── Gamification: award XP for saving a meeting ──
    updateStreak();
    const result = awardXP('MEETING_RECORDED', meeting.id);

    // Check special time-based achievements
    const hour = new Date(meeting.date).getHours();
    if (hour < 7) checkSpecialAchievement('early_bird');
    if (hour >= 22) checkSpecialAchievement('night_owl');

    // Check marathon achievement (duration > 2 hours = 7200 seconds)
    if (meeting.duration > 7200) checkSpecialAchievement('marathon');

    return result;
  });

  // ── Dashboard Stats ──

  ipcMain.handle('dashboard:stats', async () => {
    return getDashboardStats();
  });

  // ── Tasks ──

  ipcMain.handle('tasks:get-all', async () => {
    return getAllTasks();
  });

  ipcMain.handle('tasks:toggle', async (_event, meetingId: string, taskId: string) => {
    validateId(meetingId, 'meetingId');
    validateId(taskId, 'taskId');
    const meeting = getMeeting(meetingId);
    if (!meeting) throw new Error('Meeting not found');
    const notes = meeting.notes;
    if (notes.actionItems) {
      notes.actionItems = notes.actionItems.map((a: any) =>
        a.id === taskId ? { ...a, done: !a.done } : a
      );
    }
    updateMeetingNotes(meetingId, notes);
    return { success: true };
  });

  // ── Global Chat ──

  ipcMain.handle('chat:send-global', async (event, { message, provider, model }: { message: string; provider: string; model: string }) => {
    try {
      validateStringArg(message, 'message');
      validateStringArg(provider, 'provider');
      validateStringArg(model, 'model');
      logger.info('Global chat message received', { provider, model });

      const globalMeetingId = 'global';

      // Save user message
      saveChatMessage(globalMeetingId, 'user', message);

      // Gather all meeting summaries for context
      const allMeetings = getMeetings(20, 0);
      const meetingContext = allMeetings.map((m) => {
        const actions = m.notes?.actionItems?.length
          ? m.notes.actionItems.map((a: any) => `- [${a.done ? 'x' : ' '}] ${a.text}`).join('\n')
          : '(None)';
        const decisions = m.notes?.keyDecisions?.length
          ? m.notes.keyDecisions.map((d: string) => `- ${d}`).join('\n')
          : '(None)';
        const topics = m.notes?.topics?.length ? m.notes.topics.join(', ') : '(None)';
        return `## ${m.title} (${new Date(m.date).toLocaleDateString()})
Summary: ${m.notes?.summary || '(No summary)'}
Topics: ${topics}
Key Decisions:
${decisions}
Action Items:
${actions}`;
      }).join('\n\n---\n\n');

      const systemPrompt = `You are an AI assistant with access to all the user's meeting notes and transcripts. Answer questions about patterns, find information across meetings, and provide insights. When referencing a specific meeting, mention it by name and date.

Here are the meeting summaries:

${meetingContext || '(No meetings recorded yet)'}`;

      // Get chat history
      const history = getChatMessages(globalMeetingId);
      const chatMessages = history.map((m) => ({ role: m.role, content: m.content }));

      // Stream response
      const fullResponse = await streamChat({
        provider,
        model,
        systemPrompt,
        messages: chatMessages,
        onToken: (token, done) => {
          event.sender.send('chat:global-token', { token, done });
        },
      });

      // Save assistant response
      saveChatMessage(globalMeetingId, 'assistant', fullResponse);

      // Gamification
      awardXP('CHAT_QUESTION');

      return { success: true };
    } catch (e) {
      logger.error('Global chat failed', { error: (e as Error).message });
      event.sender.send('chat:global-token', { token: '', done: true, error: (e as Error).message });
      return { success: false, error: (e as Error).message };
    }
  });

  ipcMain.handle('chat:global-history', async () => {
    return getChatMessages('global');
  });

  ipcMain.handle('chat:clear-global', async () => {
    clearChatMessages('global');
    return { success: true };
  });

  // ── Export ──

  ipcMain.handle('open-mailto', async (_event, subject: string, body: string) => {
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    await shell.openExternal(mailto);
  });

  // ── Ollama URL ──

  ipcMain.handle('get-ollama-url', async () => {
    return getConfig().ollamaUrl || 'http://localhost:11434';
  });

  ipcMain.handle('set-ollama-url', async (_e, url: string) => {
    validateStringArg(url, 'url');
    logger.info('Ollama URL updated', { url });
    setConfig({ ollamaUrl: url });
  });

  ipcMain.handle('test-ollama-connection', async (_e, url: string) => {
    try {
      const baseUrl = url.replace(/\/+$/, '');
      const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = (await res.json()) as { models?: Array<{ name: string }> };
        const count = data.models?.length ?? 0;
        return { success: true, message: `Connected. ${count} model${count !== 1 ? 's' : ''} available.` };
      }
      return { success: false, message: `Server returned ${res.status}` };
    } catch (e) {
      return { success: false, message: (e as Error).message || 'Connection failed' };
    }
  });

  // ── Legacy compatibility (Ollama direct) ──

  ipcMain.handle('get-ollama-models', async () => {
    return registry.getSummarization('ollama').listModels();
  });

  ipcMain.handle('check-ollama', async () => {
    const result = await registry.getSummarization('ollama').validateConfig();
    return result.valid;
  });

  // ── Gamification ──

  ipcMain.handle('gamification:stats', async () => {
    const stats = getStats();
    const levelInfo = getLevelInfo(stats.xp);
    return { stats, levelInfo };
  });

  ipcMain.handle('gamification:achievements', async () => {
    return getAchievements();
  });

  ipcMain.handle('gamification:award-xp', async (_event, eventType: string, meetingId?: string) => {
    return awardXP(eventType, meetingId);
  });

  ipcMain.handle('gamification:challenge', async () => {
    let challenge = getActiveChallenge();
    if (!challenge) {
      challenge = startWeeklyChallenge();
    }
    return challenge;
  });

  ipcMain.handle('gamification:xp-history', async (_event, limit?: number) => {
    return getXPHistory(limit);
  });

  // ── Chat ──

  ipcMain.handle('chat:send', async (event, { meetingId, message, provider, model }: { meetingId: string; message: string; provider: string; model: string }) => {
    try {
      validateId(meetingId, 'meetingId');
      validateStringArg(message, 'message');
      validateStringArg(provider, 'provider');
      validateStringArg(model, 'model');
      logger.info('Chat message received', { meetingId, provider, model });
      // Save user message
      saveChatMessage(meetingId, 'user', message);

      // Load meeting data for context
      const meeting = getMeeting(meetingId);
      if (!meeting) throw new Error('Meeting not found');

      // Build system prompt from meeting data
      const systemPrompt = buildChatSystemPrompt(meeting.transcript, meeting.notes);

      // Get chat history for context
      const history = getChatMessages(meetingId);
      const chatMessages = history.map((m) => ({ role: m.role, content: m.content }));

      // Stream the response
      const fullResponse = await streamChat({
        provider,
        model,
        systemPrompt,
        messages: chatMessages,
        onToken: (token, done) => {
          event.sender.send('chat:token', { token, done });
        },
      });

      // Save assistant response
      saveChatMessage(meetingId, 'assistant', fullResponse);

      // Gamification: award XP for chat question
      awardXP('CHAT_QUESTION', meetingId);

      return { success: true };
    } catch (e) {
      logger.error('Chat failed', { meetingId, error: (e as Error).message });
      event.sender.send('chat:token', { token: '', done: true, error: (e as Error).message });
      return { success: false, error: (e as Error).message };
    }
  });

  ipcMain.handle('chat:history', async (_event, meetingId: string) => {
    validateId(meetingId, 'meetingId');
    return getChatMessages(meetingId);
  });

  ipcMain.handle('chat:clear', async (_event, meetingId: string) => {
    validateId(meetingId, 'meetingId');
    logger.info('Clearing chat history', { meetingId });
    clearChatMessages(meetingId);
    return { success: true };
  });

  // ── MCP Server ──

  ipcMain.handle('mcp:status', async () => {
    return { running: mcpProcess !== null && !mcpProcess.killed };
  });

  ipcMain.handle('mcp:toggle', async () => {
    if (mcpProcess && !mcpProcess.killed) {
      stopMcpServer();
      return { running: false };
    }
    const started = startMcpServer();
    return { running: started };
  });
}

// ── Content Security Policy ──

function setupCSP(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "connect-src 'self' http://localhost:* https://*.openai.com https://*.anthropic.com https://*.azure.com",
          "img-src 'self' data:",
          "font-src 'self' https://fonts.gstatic.com",
        ].join('; ')
      }
    });
  });
}

// ── App Lifecycle ──

app.whenReady().then(() => {
  logger.info('App starting', { version: app.getVersion(), platform: process.platform });
  setupCSP();
  initDatabase();
  logger.info('Database initialized');
  createWindow();
  createTray();
  registerIpcHandlers();
  logger.info('App ready');
});

app.on('window-all-closed', () => {
  logger.info('All windows closed, quitting');
  app.quit();
});
app.on('activate', () => { if (!mainWindow) createWindow(); });
app.on('will-quit', () => {
  logger.info('App shutting down');
  stopMcpServer();
});
