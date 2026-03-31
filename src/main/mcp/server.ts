/**
 * MCP Server for Rekal — exposes meeting data as tools.
 *
 * This file runs as a standalone process (not inside Electron).
 * It opens its own read-only connection to the Rekal SQLite database
 * at %LOCALAPPDATA%\Rekal\meetings.db and serves requests over stdio.
 *
 * Usage:
 *   node dist/main/main/mcp/server.js
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

// ── Types (duplicated from shared/types to keep this standalone) ──

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

interface Transcript {
  segments: TranscriptSegment[];
  language: string;
  duration: number;
}

interface ActionItem {
  id: string;
  text: string;
  assignee?: string;
  done: boolean;
}

interface MeetingNotes {
  summary: string;
  actionItems: ActionItem[];
  keyDecisions: string[];
  topics: string[];
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  audioPath: string;
  transcript: Transcript;
  notes: MeetingNotes;
  bookmarks: Array<{ id: string; timestamp: number; label?: string }>;
  template?: string;
}

// ── Database helpers ──

function getDbPath(): string {
  const localAppData = process.env.LOCALAPPDATA || process.env.APPDATA || '';
  return path.join(localAppData, 'Rekal', 'meetings.db');
}

function openDb(): Database.Database {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Rekal database not found at ${dbPath}. Has the app been run at least once?`);
  }
  const db = new Database(dbPath, { readonly: true });
  db.pragma('journal_mode = WAL');
  return db;
}

function rowToMeeting(row: Record<string, unknown>): Meeting {
  return {
    id: row.id as string,
    title: row.title as string,
    date: row.date as string,
    duration: row.duration as number,
    audioPath: row.audio_path as string,
    transcript: JSON.parse(
      (row.transcript as string) || '{"segments":[],"language":"","duration":0}',
    ),
    notes: JSON.parse(
      (row.notes as string) ||
        '{"summary":"","actionItems":[],"keyDecisions":[],"topics":[]}',
    ),
    bookmarks: JSON.parse((row.bookmarks as string) || '[]'),
    template: (row.template as string) || undefined,
  };
}

// ── Formatting helpers ──

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Build and export server ──

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'Rekal',
    version: '0.1.0',
  });

  // 1. list_meetings
  server.tool(
    'list_meetings',
    'List all meetings with optional search filter',
    {
      limit: z.number().optional().describe('Max meetings to return (default 50)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
      search: z.string().optional().describe('Filter by title (substring match)'),
    },
    async ({ limit, offset, search }) => {
      const db = openDb();
      try {
        const lim = limit ?? 50;
        const off = offset ?? 0;

        let rows: Array<Record<string, unknown>>;
        if (search) {
          rows = db
            .prepare(
              'SELECT id, title, date, duration, notes FROM meetings WHERE title LIKE ? ORDER BY date DESC LIMIT ? OFFSET ?',
            )
            .all(`%${search}%`, lim, off) as Array<Record<string, unknown>>;
        } else {
          rows = db
            .prepare(
              'SELECT id, title, date, duration, notes FROM meetings ORDER BY date DESC LIMIT ? OFFSET ?',
            )
            .all(lim, off) as Array<Record<string, unknown>>;
        }

        const meetings = rows.map((r) => {
          const notes: MeetingNotes = JSON.parse(
            (r.notes as string) ||
              '{"summary":"","actionItems":[],"keyDecisions":[],"topics":[]}',
          );
          return {
            id: r.id,
            title: r.title,
            date: r.date,
            duration: r.duration,
            topicTags: notes.topics,
          };
        });

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(meetings, null, 2) }],
        };
      } finally {
        db.close();
      }
    },
  );

  // 2. get_meeting
  server.tool(
    'get_meeting',
    'Get full meeting details including transcript and notes',
    {
      meetingId: z.string().describe('The meeting ID'),
    },
    async ({ meetingId }) => {
      const db = openDb();
      try {
        const row = db.prepare('SELECT * FROM meetings WHERE id = ?').get(meetingId) as
          | Record<string, unknown>
          | undefined;
        if (!row) {
          return {
            content: [{ type: 'text' as const, text: `Meeting not found: ${meetingId}` }],
            isError: true,
          };
        }
        const meeting = rowToMeeting(row);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(meeting, null, 2) }],
        };
      } finally {
        db.close();
      }
    },
  );

  // 3. search_meetings
  server.tool(
    'search_meetings',
    'Full-text search across meeting titles, transcripts, and notes',
    {
      query: z.string().describe('Search query'),
      limit: z.number().optional().describe('Max results (default 20)'),
    },
    async ({ query, limit }) => {
      const db = openDb();
      try {
        const lim = limit ?? 20;
        const rows = db
          .prepare(
            `SELECT * FROM meetings
             WHERE title LIKE ? OR transcript LIKE ? OR notes LIKE ?
             ORDER BY date DESC LIMIT ?`,
          )
          .all(`%${query}%`, `%${query}%`, `%${query}%`, lim) as Array<
          Record<string, unknown>
        >;

        const results = rows.map((row) => {
          const meeting = rowToMeeting(row);

          // Build a short excerpt from transcript segments that match
          const matchingSegments = meeting.transcript.segments
            .filter((s) => s.text.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 3)
            .map((s) => `[${formatTimestamp(s.start)}] ${s.text}`);

          return {
            id: meeting.id,
            title: meeting.title,
            date: meeting.date,
            duration: meeting.duration,
            excerpts: matchingSegments.length > 0 ? matchingSegments : undefined,
            summaryMatch: meeting.notes.summary
              .toLowerCase()
              .includes(query.toLowerCase())
              ? meeting.notes.summary.substring(0, 200)
              : undefined,
          };
        });

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
        };
      } finally {
        db.close();
      }
    },
  );

  // 4. get_action_items
  server.tool(
    'get_action_items',
    'Get action items across meetings, optionally filtered by status or meeting',
    {
      status: z
        .enum(['open', 'done', 'all'])
        .optional()
        .describe('Filter by status (default "all")'),
      meetingId: z.string().optional().describe('Limit to a specific meeting'),
    },
    async ({ status, meetingId }) => {
      const db = openDb();
      try {
        let rows: Array<Record<string, unknown>>;
        if (meetingId) {
          rows = db
            .prepare('SELECT id, title, date, notes FROM meetings WHERE id = ?')
            .all(meetingId) as Array<Record<string, unknown>>;
        } else {
          rows = db
            .prepare('SELECT id, title, date, notes FROM meetings ORDER BY date DESC')
            .all() as Array<Record<string, unknown>>;
        }

        const statusFilter = status ?? 'all';
        const items: Array<{
          meetingId: string;
          meetingTitle: string;
          meetingDate: string;
          actionItem: ActionItem;
        }> = [];

        for (const row of rows) {
          const notes: MeetingNotes = JSON.parse(
            (row.notes as string) ||
              '{"summary":"","actionItems":[],"keyDecisions":[],"topics":[]}',
          );
          for (const ai of notes.actionItems) {
            if (
              statusFilter === 'all' ||
              (statusFilter === 'open' && !ai.done) ||
              (statusFilter === 'done' && ai.done)
            ) {
              items.push({
                meetingId: row.id as string,
                meetingTitle: row.title as string,
                meetingDate: row.date as string,
                actionItem: ai,
              });
            }
          }
        }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }],
        };
      } finally {
        db.close();
      }
    },
  );

  // 5. get_transcript
  server.tool(
    'get_transcript',
    'Get the full transcript for a meeting with timestamps',
    {
      meetingId: z.string().describe('The meeting ID'),
    },
    async ({ meetingId }) => {
      const db = openDb();
      try {
        const row = db
          .prepare('SELECT transcript FROM meetings WHERE id = ?')
          .get(meetingId) as Record<string, unknown> | undefined;
        if (!row) {
          return {
            content: [{ type: 'text' as const, text: `Meeting not found: ${meetingId}` }],
            isError: true,
          };
        }

        const transcript: Transcript = JSON.parse(
          (row.transcript as string) || '{"segments":[],"language":"","duration":0}',
        );

        const lines = transcript.segments.map((s) => {
          const speaker = s.speaker ? `[${s.speaker}] ` : '';
          return `[${formatTimestamp(s.start)} - ${formatTimestamp(s.end)}] ${speaker}${s.text}`;
        });

        const header = `Language: ${transcript.language || 'unknown'} | Duration: ${formatTimestamp(transcript.duration)}\n---\n`;
        return {
          content: [{ type: 'text' as const, text: header + lines.join('\n') }],
        };
      } finally {
        db.close();
      }
    },
  );

  // 6. get_meeting_stats
  server.tool(
    'get_meeting_stats',
    'Get analytics — global stats or stats for a specific meeting',
    {
      meetingId: z
        .string()
        .optional()
        .describe('If provided, return stats for this meeting only; otherwise global'),
    },
    async ({ meetingId }) => {
      const db = openDb();
      try {
        if (meetingId) {
          // Single meeting stats
          const row = db
            .prepare('SELECT * FROM meetings WHERE id = ?')
            .get(meetingId) as Record<string, unknown> | undefined;
          if (!row) {
            return {
              content: [{ type: 'text' as const, text: `Meeting not found: ${meetingId}` }],
              isError: true,
            };
          }
          const meeting = rowToMeeting(row);
          const stats = {
            meetingId: meeting.id,
            title: meeting.title,
            date: meeting.date,
            durationMinutes: Math.round(meeting.duration / 60),
            segmentCount: meeting.transcript.segments.length,
            wordCount: meeting.transcript.segments
              .reduce((sum, s) => sum + s.text.split(/\s+/).length, 0),
            actionItemCount: meeting.notes.actionItems.length,
            openActionItems: meeting.notes.actionItems.filter((a) => !a.done).length,
            keyDecisionCount: meeting.notes.keyDecisions.length,
            topicCount: meeting.notes.topics.length,
            bookmarkCount: meeting.bookmarks.length,
          };
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(stats, null, 2) }],
          };
        }

        // Global stats
        const countRow = db.prepare('SELECT COUNT(*) as cnt FROM meetings').get() as {
          cnt: number;
        };
        const totalDurationRow = db
          .prepare('SELECT COALESCE(SUM(duration), 0) as total FROM meetings')
          .get() as { total: number };
        const rows = db
          .prepare('SELECT notes FROM meetings')
          .all() as Array<Record<string, unknown>>;

        let totalActionItems = 0;
        let openActionItems = 0;
        let totalDecisions = 0;
        let totalTopics = 0;
        for (const r of rows) {
          const notes: MeetingNotes = JSON.parse(
            (r.notes as string) ||
              '{"summary":"","actionItems":[],"keyDecisions":[],"topics":[]}',
          );
          totalActionItems += notes.actionItems.length;
          openActionItems += notes.actionItems.filter((a) => !a.done).length;
          totalDecisions += notes.keyDecisions.length;
          totalTopics += notes.topics.length;
        }

        const stats = {
          totalMeetings: countRow.cnt,
          totalDurationMinutes: Math.round(totalDurationRow.total / 60),
          totalActionItems,
          openActionItems,
          totalKeyDecisions: totalDecisions,
          totalTopics: totalTopics,
        };

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(stats, null, 2) }],
        };
      } finally {
        db.close();
      }
    },
  );

  return server;
}
