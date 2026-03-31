// ── Dependency Scanner ──

export interface DependencyStatus {
  name: string;
  found: boolean;
  version?: string;
  path?: string;
  details?: string;
}

export interface ScanResult {
  whisperBin: DependencyStatus;
  whisperModel: DependencyStatus;
  ollama: DependencyStatus;
  ollamaRunning: boolean;
  ollamaModels: string[];
}

// ── Setup / Settings ──

export interface AppSettings {
  ollamaModel: string;
  ollamaUrl: string;
  whisperModel: 'tiny' | 'base' | 'small' | 'medium' | 'large-v3';
  audioSource: 'mic' | 'system' | 'both';
  language: string;
}

// ── Audio ──

export type RecordingState = 'idle' | 'recording' | 'processing' | 'done';

export interface Bookmark {
  id: string;
  timestamp: number;
  label?: string;
}

// ── Transcription ──

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface Transcript {
  segments: TranscriptSegment[];
  language: string;
  duration: number;
}

// ── Meeting Notes ──

export interface ActionItem {
  id: string;
  text: string;
  assignee?: string;
  done: boolean;
}

export interface SentimentData {
  overall: 'positive' | 'neutral' | 'negative';
  score: number; // -1 to 1
  highlights: Array<{
    timestamp: string;
    text: string;
    sentiment: 'positive' | 'negative';
    intensity: number; // 0-1
  }>;
  topEmotions: string[]; // e.g. ["enthusiasm", "concern", "agreement"]
}

export interface KeyQuote {
  text: string;
  timestamp: string;
  context: string; // why this quote matters
  speaker?: string;
}

export interface FollowUp {
  id: string;
  task: string;
  assignee?: string;
  deadline?: string;
  priority: 'high' | 'medium' | 'low';
  done: boolean;
}

export interface MeetingNotes {
  summary: string;
  actionItems: ActionItem[];
  keyDecisions: string[];
  topics: string[];
  sentiment?: SentimentData;
  keyQuotes?: KeyQuote[];
  followUps?: FollowUp[];
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  audioPath: string;
  transcript: Transcript;
  notes: MeetingNotes;
  bookmarks: Bookmark[];
  template?: string;
}

// ── Chat ──

export interface ChatMessage {
  id: string;
  meetingId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

// ── Gamification ──

export interface UserStats {
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  total_meetings: number;
  total_tasks_completed: number;
  total_chat_messages: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlocked_at: string | null;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  condition: ((stats: UserStats) => boolean) | 'special';
}

export interface XPEvent {
  id: string;
  event_type: string;
  xp_amount: number;
  description: string;
  meeting_id: string | null;
  created_at: string;
}

export interface Challenge {
  id: string;
  challenge_type: string;
  target: number;
  progress: number;
  xp_reward: number;
  started_at: string;
  completed_at: string | null;
  expires_at: string;
  description: string;
}

export interface LevelInfo {
  level: number;
  title: string;
  xpRequired: number;
}
