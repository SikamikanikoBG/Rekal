import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { Meeting, ChatMessage, UsageCostRecord, CostSummary, CostBreakdown } from '../../shared/types';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function getDbPath(): string {
  const appData = path.join(
    process.env.APPDATA || process.env.LOCALAPPDATA || '',
    'Rekal'
  );
  fs.mkdirSync(appData, { recursive: true });
  return path.join(appData, 'meetings.db');
}

export function initDatabase(): void {
  db = new Database(getDbPath());
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      duration REAL NOT NULL,
      audio_path TEXT,
      transcript TEXT,
      notes TEXT,
      bookmarks TEXT,
      template TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migrate: drop old chat_messages with FK constraint, recreate without it
  const chatTableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='chat_messages'").get() as { sql: string } | undefined;
  if (chatTableInfo && chatTableInfo.sql.includes('FOREIGN KEY')) {
    db.exec('DROP TABLE chat_messages');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ── Gamification Tables ──

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_stats (
      id TEXT PRIMARY KEY DEFAULT 'local_user',
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_active_date TEXT,
      total_meetings INTEGER DEFAULT 0,
      total_tasks_completed INTEGER DEFAULT 0,
      total_chat_messages INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS xp_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      xp_amount INTEGER NOT NULL,
      description TEXT,
      meeting_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      achievement_id TEXT NOT NULL,
      unlocked_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      challenge_type TEXT NOT NULL,
      target INTEGER NOT NULL,
      progress INTEGER DEFAULT 0,
      xp_reward INTEGER NOT NULL,
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      expires_at TEXT
    )
  `);

  // ── Usage Cost Tracking ──

  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_costs (
      id TEXT PRIMARY KEY,
      meeting_id TEXT,
      service_type TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      audio_seconds REAL DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ── Failed Sessions ──

  db.exec(`
    CREATE TABLE IF NOT EXISTS failed_sessions (
      id TEXT PRIMARY KEY,
      audio_path TEXT NOT NULL,
      transcript TEXT,
      failed_step TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Initialize user_stats row if not present
  const existingUser = db.prepare('SELECT id FROM user_stats WHERE id = ?').get('local_user');
  if (!existingUser) {
    db.prepare('INSERT INTO user_stats (id) VALUES (?)').run('local_user');
  }
}

export function saveMeeting(meeting: Meeting): void {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO meetings (id, title, date, duration, audio_path, transcript, notes, bookmarks, template)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    meeting.id,
    meeting.title,
    meeting.date,
    meeting.duration,
    meeting.audioPath,
    JSON.stringify(meeting.transcript),
    JSON.stringify(meeting.notes),
    JSON.stringify(meeting.bookmarks),
    meeting.template || null
  );
}

export function getMeetings(limit = 50, offset = 0): Meeting[] {
  if (!db) throw new Error('Database not initialized');

  const rows = db
    .prepare('SELECT * FROM meetings ORDER BY date DESC LIMIT ? OFFSET ?')
    .all(limit, offset) as Array<Record<string, unknown>>;

  return rows.map(rowToMeeting);
}

export function getMeeting(id: string): Meeting | null {
  if (!db) throw new Error('Database not initialized');

  const row = db.prepare('SELECT * FROM meetings WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;

  return row ? rowToMeeting(row) : null;
}

export function searchMeetings(query: string): Meeting[] {
  if (!db) throw new Error('Database not initialized');

  const rows = db
    .prepare(
      `SELECT * FROM meetings
       WHERE title LIKE ? OR transcript LIKE ? OR notes LIKE ?
       ORDER BY date DESC LIMIT 50`
    )
    .all(`%${query}%`, `%${query}%`, `%${query}%`) as Array<Record<string, unknown>>;

  return rows.map(rowToMeeting);
}

export function deleteMeeting(id: string): void {
  if (!db) throw new Error('Database not initialized');
  db.prepare('DELETE FROM meetings WHERE id = ?').run(id);
}

// ── Chat Messages ──

export function saveChatMessage(meetingId: string, role: string, content: string): ChatMessage {
  if (!db) throw new Error('Database not initialized');
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO chat_messages (id, meeting_id, role, content) VALUES (?, ?, ?, ?)'
  ).run(id, meetingId, role, content);

  const row = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(id) as Record<string, unknown>;
  return rowToChatMessage(row);
}

export function getChatMessages(meetingId: string): ChatMessage[] {
  if (!db) throw new Error('Database not initialized');
  const rows = db
    .prepare('SELECT * FROM chat_messages WHERE meeting_id = ? ORDER BY created_at ASC')
    .all(meetingId) as Array<Record<string, unknown>>;
  return rows.map(rowToChatMessage);
}

export function clearChatMessages(meetingId: string): void {
  if (!db) throw new Error('Database not initialized');
  db.prepare('DELETE FROM chat_messages WHERE meeting_id = ?').run(meetingId);
}

// ── Dashboard Stats ──

export function getDashboardStats(): { totalMeetings: number; thisWeekMeetings: number; openActions: number } {
  if (!db) throw new Error('Database not initialized');

  const totalRow = db.prepare('SELECT COUNT(*) as count FROM meetings').get() as { count: number };
  const totalMeetings = totalRow.count;

  // This week: meetings from Monday of current week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const mondayStr = monday.toISOString();

  const weekRow = db.prepare('SELECT COUNT(*) as count FROM meetings WHERE date >= ?').get(mondayStr) as { count: number };
  const thisWeekMeetings = weekRow.count;

  // Open action items: parse notes JSON from all meetings
  const allRows = db.prepare('SELECT notes FROM meetings').all() as Array<{ notes: string }>;
  let openActions = 0;
  for (const row of allRows) {
    try {
      const notes = JSON.parse(row.notes || '{}');
      if (notes.actionItems) {
        openActions += notes.actionItems.filter((a: any) => !a.done).length;
      }
    } catch {}
  }

  return { totalMeetings, thisWeekMeetings, openActions };
}

// ── All Tasks ──

export interface TaskWithContext {
  id: string;
  text: string;
  assignee?: string;
  done: boolean;
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
}

export function getAllTasks(): TaskWithContext[] {
  if (!db) throw new Error('Database not initialized');

  const rows = db.prepare('SELECT id, title, date, notes FROM meetings ORDER BY date DESC').all() as Array<{
    id: string;
    title: string;
    date: string;
    notes: string;
  }>;

  const tasks: TaskWithContext[] = [];
  for (const row of rows) {
    try {
      const notes = JSON.parse(row.notes || '{}');
      if (notes.actionItems && Array.isArray(notes.actionItems)) {
        for (const item of notes.actionItems) {
          tasks.push({
            id: item.id,
            text: item.text,
            assignee: item.assignee,
            done: !!item.done,
            meetingId: row.id,
            meetingTitle: row.title,
            meetingDate: row.date,
          });
        }
      }
    } catch {}
  }

  return tasks;
}

// ── Update Meeting Notes ──

export function updateMeetingNotes(meetingId: string, notes: any): void {
  if (!db) throw new Error('Database not initialized');
  db.prepare('UPDATE meetings SET notes = ? WHERE id = ?').run(JSON.stringify(notes), meetingId);
}

// ── Usage Cost Tracking ──

export function saveUsageCost(record: {
  meetingId?: string | null;
  serviceType: 'stt' | 'llm';
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  audioSeconds?: number;
  costUsd: number;
}): void {
  if (!db) throw new Error('Database not initialized');
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO usage_costs (id, meeting_id, service_type, provider, model, input_tokens, output_tokens, audio_seconds, cost_usd)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    record.meetingId || null,
    record.serviceType,
    record.provider,
    record.model,
    record.inputTokens || 0,
    record.outputTokens || 0,
    record.audioSeconds || 0,
    record.costUsd,
  );
}

export function getMeetingCosts(meetingId: string): UsageCostRecord[] {
  if (!db) throw new Error('Database not initialized');
  const rows = db.prepare('SELECT * FROM usage_costs WHERE meeting_id = ? ORDER BY created_at ASC')
    .all(meetingId) as Array<Record<string, unknown>>;
  return rows.map(rowToUsageCost);
}

export function getCostSummary(): CostSummary {
  if (!db) throw new Error('Database not initialized');

  const now = new Date();

  // Today
  const todayStr = now.toISOString().split('T')[0];

  // This week (Monday)
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const weekStr = monday.toISOString();

  // This month
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  // This year
  const yearStr = `${now.getFullYear()}-01-01`;

  function queryBreakdown(whereClause: string, params: unknown[] = []): CostBreakdown {
    const row = db!.prepare(`
      SELECT
        COALESCE(SUM(cost_usd), 0) as total,
        COALESCE(SUM(CASE WHEN service_type = 'stt' THEN cost_usd ELSE 0 END), 0) as stt,
        COALESCE(SUM(CASE WHEN service_type = 'llm' THEN cost_usd ELSE 0 END), 0) as llm
      FROM usage_costs
      ${whereClause}
    `).get(...params) as { total: number; stt: number; llm: number };
    return { total: row.total, stt: row.stt, llm: row.llm };
  }

  return {
    today: queryBreakdown('WHERE date(created_at) = date(?)', [todayStr]),
    thisWeek: queryBreakdown('WHERE created_at >= ?', [weekStr]),
    thisMonth: queryBreakdown('WHERE date(created_at) >= date(?)', [monthStr]),
    thisYear: queryBreakdown('WHERE date(created_at) >= date(?)', [yearStr]),
    allTime: queryBreakdown(''),
  };
}

function rowToUsageCost(row: Record<string, unknown>): UsageCostRecord {
  return {
    id: row.id as string,
    meetingId: row.meeting_id as string | null,
    serviceType: row.service_type as 'stt' | 'llm',
    provider: row.provider as string,
    model: row.model as string,
    inputTokens: row.input_tokens as number,
    outputTokens: row.output_tokens as number,
    audioSeconds: row.audio_seconds as number,
    costUsd: row.cost_usd as number,
    createdAt: row.created_at as string,
  };
}

function rowToChatMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    meetingId: row.meeting_id as string,
    role: row.role as 'user' | 'assistant',
    content: row.content as string,
    createdAt: row.created_at as string,
  };
}

function rowToMeeting(row: Record<string, unknown>): Meeting {
  return {
    id: row.id as string,
    title: row.title as string,
    date: row.date as string,
    duration: row.duration as number,
    audioPath: row.audio_path as string,
    transcript: JSON.parse((row.transcript as string) || '{"segments":[],"language":"","duration":0}'),
    notes: JSON.parse(
      (row.notes as string) ||
        '{"summary":"","actionItems":[],"keyDecisions":[],"topics":[]}'
    ),
    bookmarks: JSON.parse((row.bookmarks as string) || '[]'),
    template: (row.template as string) || undefined,
  };
}

// ── Failed Sessions ──

export interface FailedSession {
  id: string;
  audioPath: string;
  transcript: any | null;
  failedStep: 'transcription' | 'summarization';
  errorMessage: string;
  createdAt: string;
}

export function saveFailedSession(session: Omit<FailedSession, 'createdAt'>): void {
  if (!db) throw new Error('Database not initialized');
  db.prepare(`
    INSERT OR REPLACE INTO failed_sessions (id, audio_path, transcript, failed_step, error_message)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    session.id,
    session.audioPath,
    session.transcript ? JSON.stringify(session.transcript) : null,
    session.failedStep,
    session.errorMessage,
  );
}

export function getFailedSessions(): FailedSession[] {
  if (!db) throw new Error('Database not initialized');
  const rows = db.prepare('SELECT * FROM failed_sessions ORDER BY created_at DESC').all() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: row.id as string,
    audioPath: row.audio_path as string,
    transcript: row.transcript ? JSON.parse(row.transcript as string) : null,
    failedStep: row.failed_step as 'transcription' | 'summarization',
    errorMessage: row.error_message as string,
    createdAt: row.created_at as string,
  }));
}

export function deleteFailedSession(id: string): void {
  if (!db) throw new Error('Database not initialized');
  db.prepare('DELETE FROM failed_sessions WHERE id = ?').run(id);
}
