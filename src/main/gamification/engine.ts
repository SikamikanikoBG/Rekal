import { getDb } from '../storage/db';
import { UserStats, Achievement, XPEvent, Challenge, LevelInfo, AchievementDefinition } from '../../shared/types';
import { randomUUID } from 'crypto';

// ── XP Awards ──

const XP_VALUES: Record<string, number> = {
  MEETING_RECORDED: 50,
  TASK_COMPLETED: 20,
  STREAK_DAY: 100,
  MEETING_REVIEWED: 10,
  CHAT_QUESTION: 5,
  CHALLENGE_COMPLETE: 200,
  ACHIEVEMENT_UNLOCK: 50,
};

// ── Level Thresholds ──

const LEVELS: LevelInfo[] = [
  { level: 1, title: 'Intern', xpRequired: 0 },
  { level: 2, title: 'Note Taker', xpRequired: 200 },
  { level: 3, title: 'Scribe', xpRequired: 500 },
  { level: 4, title: 'Analyst', xpRequired: 1000 },
  { level: 5, title: 'Strategist', xpRequired: 2000 },
  { level: 6, title: 'Advisor', xpRequired: 4000 },
  { level: 7, title: 'Director', xpRequired: 7000 },
  { level: 8, title: 'VP of Meetings', xpRequired: 12000 },
  { level: 9, title: 'Chief of Staff', xpRequired: 20000 },
  { level: 10, title: 'Meeting Legend', xpRequired: 35000 },
];

// ── Achievement Definitions ──

const ACHIEVEMENTS: AchievementDefinition[] = [
  // Recording
  { id: 'first_meeting', name: 'First Steps', description: 'Record your first meeting', icon: '🎙️', rarity: 'common', condition: (stats) => stats.total_meetings >= 1 },
  { id: 'meetings_10', name: 'Regular', description: 'Record 10 meetings', icon: '📋', rarity: 'common', condition: (stats) => stats.total_meetings >= 10 },
  { id: 'meetings_50', name: 'Meeting Pro', description: 'Record 50 meetings', icon: '🏆', rarity: 'rare', condition: (stats) => stats.total_meetings >= 50 },
  { id: 'meetings_100', name: 'Centurion', description: 'Record 100 meetings', icon: '💯', rarity: 'epic', condition: (stats) => stats.total_meetings >= 100 },
  // Streaks
  { id: 'streak_7', name: 'Week Warrior', description: '7-day streak', icon: '🔥', rarity: 'common', condition: (stats) => stats.current_streak >= 7 },
  { id: 'streak_30', name: 'Streak Lord', description: '30-day streak', icon: '⚡', rarity: 'rare', condition: (stats) => stats.current_streak >= 30 },
  { id: 'streak_90', name: 'Unstoppable', description: '90-day streak', icon: '🌟', rarity: 'epic', condition: (stats) => stats.current_streak >= 90 },
  { id: 'streak_365', name: 'Legendary Dedication', description: '365-day streak', icon: '👑', rarity: 'legendary', condition: (stats) => stats.current_streak >= 365 },
  // Tasks
  { id: 'tasks_10', name: 'Task Starter', description: 'Complete 10 action items', icon: '✅', rarity: 'common', condition: (stats) => stats.total_tasks_completed >= 10 },
  { id: 'tasks_100', name: 'Task Master', description: 'Complete 100 action items', icon: '🎯', rarity: 'rare', condition: (stats) => stats.total_tasks_completed >= 100 },
  { id: 'tasks_500', name: 'Productivity Machine', description: 'Complete 500 action items', icon: '🤖', rarity: 'epic', condition: (stats) => stats.total_tasks_completed >= 500 },
  // AI Chat
  { id: 'first_chat', name: 'Curious Mind', description: 'Ask your first AI question', icon: '💬', rarity: 'common', condition: (stats) => stats.total_chat_messages >= 1 },
  { id: 'chat_50', name: 'Inquisitive', description: 'Ask 50 AI questions', icon: '🧠', rarity: 'rare', condition: (stats) => stats.total_chat_messages >= 50 },
  { id: 'chat_200', name: 'AI Whisperer', description: 'Ask 200 AI questions', icon: '🔮', rarity: 'epic', condition: (stats) => stats.total_chat_messages >= 200 },
  // Special (checked manually, not via stats condition)
  { id: 'early_bird', name: 'Early Bird', description: 'Record a meeting before 7 AM', icon: '🌅', rarity: 'rare', condition: 'special' },
  { id: 'night_owl', name: 'Night Owl', description: 'Record a meeting after 10 PM', icon: '🦉', rarity: 'rare', condition: 'special' },
  { id: 'marathon', name: 'Marathon Meeting', description: 'Record a meeting over 2 hours', icon: '🏃', rarity: 'rare', condition: 'special' },
];

// ── Weekly Challenge Pool ──

const CHALLENGE_POOL = [
  { type: 'record_meetings', target: 3, description: 'Record 3 meetings this week', xpReward: 200 },
  { type: 'record_meetings', target: 5, description: 'Record 5 meetings this week', xpReward: 350 },
  { type: 'complete_tasks', target: 5, description: 'Complete 5 action items', xpReward: 200 },
  { type: 'complete_tasks', target: 10, description: 'Complete 10 action items', xpReward: 350 },
  { type: 'ask_questions', target: 10, description: 'Ask 10 AI questions', xpReward: 200 },
  { type: 'ask_questions', target: 20, description: 'Ask 20 AI questions', xpReward: 350 },
  { type: 'maintain_streak', target: 5, description: 'Maintain a 5-day streak', xpReward: 300 },
  { type: 'review_meetings', target: 3, description: 'Review 3 past meetings', xpReward: 150 },
];

// ── Helper: ensure user_stats row exists ──

function ensureUserStats(): void {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM user_stats WHERE id = ?').get('local_user');
  if (!existing) {
    db.prepare(`INSERT INTO user_stats (id) VALUES (?)`).run('local_user');
  }
}

// ── Get Level Info ──

export function getLevelInfo(xp: number): LevelInfo & { progress: number; nextLevel: LevelInfo | null } {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpRequired) {
      current = lvl;
    } else {
      break;
    }
  }
  const nextIdx = LEVELS.findIndex((l) => l.level === current.level + 1);
  const nextLevel = nextIdx >= 0 ? LEVELS[nextIdx] : null;
  const progress = nextLevel
    ? (xp - current.xpRequired) / (nextLevel.xpRequired - current.xpRequired)
    : 1;

  return { ...current, progress, nextLevel };
}

// ── Get Stats ──

export function getStats(): UserStats {
  const db = getDb();
  ensureUserStats();
  const row = db.prepare('SELECT * FROM user_stats WHERE id = ?').get('local_user') as Record<string, unknown>;
  return {
    xp: row.xp as number,
    level: row.level as number,
    current_streak: row.current_streak as number,
    longest_streak: row.longest_streak as number,
    last_active_date: row.last_active_date as string | null,
    total_meetings: row.total_meetings as number,
    total_tasks_completed: row.total_tasks_completed as number,
    total_chat_messages: row.total_chat_messages as number,
  };
}

// ── Award XP ──

export function awardXP(eventType: string, meetingId?: string): { xpAwarded: number; newLevel: boolean; newAchievements: string[] } {
  const db = getDb();
  ensureUserStats();

  const xpAmount = XP_VALUES[eventType] || 0;
  if (xpAmount === 0) return { xpAwarded: 0, newLevel: false, newAchievements: [] };

  // Record XP event
  db.prepare(`INSERT INTO xp_events (id, event_type, xp_amount, description, meeting_id) VALUES (?, ?, ?, ?, ?)`).run(
    randomUUID(),
    eventType,
    xpAmount,
    `Earned ${xpAmount} XP for ${eventType}`,
    meetingId || null,
  );

  // Update stat counters based on event type
  const statField = getStatField(eventType);
  if (statField) {
    db.prepare(`UPDATE user_stats SET ${statField} = ${statField} + 1 WHERE id = ?`).run('local_user');
  }

  // Get old level
  const oldStats = getStats();
  const oldLevelInfo = getLevelInfo(oldStats.xp);

  // Add XP
  db.prepare('UPDATE user_stats SET xp = xp + ? WHERE id = ?').run(xpAmount, 'local_user');

  // Check new level
  const newStats = getStats();
  const newLevelInfo = getLevelInfo(newStats.xp);
  const leveledUp = newLevelInfo.level > oldLevelInfo.level;

  if (leveledUp) {
    db.prepare('UPDATE user_stats SET level = ? WHERE id = ?').run(newLevelInfo.level, 'local_user');
  }

  // Check achievements
  const newAchievements = checkAchievements(newStats);

  // Update challenge progress
  const challengeType = getChallengeTypeForEvent(eventType);
  if (challengeType) {
    updateChallengeProgress(challengeType, 1);
  }

  return { xpAwarded: xpAmount, newLevel: leveledUp, newAchievements };
}

function getStatField(eventType: string): string | null {
  switch (eventType) {
    case 'MEETING_RECORDED': return 'total_meetings';
    case 'TASK_COMPLETED': return 'total_tasks_completed';
    case 'CHAT_QUESTION': return 'total_chat_messages';
    default: return null;
  }
}

function getChallengeTypeForEvent(eventType: string): string | null {
  switch (eventType) {
    case 'MEETING_RECORDED': return 'record_meetings';
    case 'TASK_COMPLETED': return 'complete_tasks';
    case 'CHAT_QUESTION': return 'ask_questions';
    case 'MEETING_REVIEWED': return 'review_meetings';
    default: return null;
  }
}

// ── Check & Unlock Achievements ──

export function checkAchievements(stats: UserStats): string[] {
  const db = getDb();
  const unlocked: string[] = [];

  for (const def of ACHIEVEMENTS) {
    if (def.condition === 'special') continue;

    // Already unlocked?
    const existing = db.prepare('SELECT id FROM achievements WHERE achievement_id = ?').get(def.id);
    if (existing) continue;

    if (typeof def.condition === 'function' && def.condition(stats)) {
      db.prepare('INSERT INTO achievements (id, achievement_id) VALUES (?, ?)').run(randomUUID(), def.id);
      unlocked.push(def.id);

      // Bonus XP for achievement unlock
      db.prepare('INSERT INTO xp_events (id, event_type, xp_amount, description) VALUES (?, ?, ?, ?)').run(
        randomUUID(),
        'ACHIEVEMENT_UNLOCK',
        XP_VALUES.ACHIEVEMENT_UNLOCK,
        `Achievement unlocked: ${def.name}`,
      );
      db.prepare('UPDATE user_stats SET xp = xp + ? WHERE id = ?').run(XP_VALUES.ACHIEVEMENT_UNLOCK, 'local_user');
    }
  }

  return unlocked;
}

// ── Check Special Achievement ──

export function checkSpecialAchievement(achievementId: string): boolean {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM achievements WHERE achievement_id = ?').get(achievementId);
  if (existing) return false;

  const def = ACHIEVEMENTS.find((a) => a.id === achievementId);
  if (!def) return false;

  db.prepare('INSERT INTO achievements (id, achievement_id) VALUES (?, ?)').run(randomUUID(), achievementId);
  db.prepare('INSERT INTO xp_events (id, event_type, xp_amount, description) VALUES (?, ?, ?, ?)').run(
    randomUUID(),
    'ACHIEVEMENT_UNLOCK',
    XP_VALUES.ACHIEVEMENT_UNLOCK,
    `Achievement unlocked: ${def.name}`,
  );
  db.prepare('UPDATE user_stats SET xp = xp + ? WHERE id = ?').run(XP_VALUES.ACHIEVEMENT_UNLOCK, 'local_user');
  return true;
}

// ── Get All Achievements with Unlock Status ──

export function getAchievements(): Achievement[] {
  const db = getDb();
  const unlockedRows = db.prepare('SELECT achievement_id, unlocked_at FROM achievements').all() as Array<{ achievement_id: string; unlocked_at: string }>;
  const unlockedMap = new Map(unlockedRows.map((r) => [r.achievement_id, r.unlocked_at]));

  return ACHIEVEMENTS.map((def) => ({
    id: def.id,
    name: def.name,
    description: def.description,
    icon: def.icon,
    rarity: def.rarity,
    unlocked: unlockedMap.has(def.id),
    unlocked_at: unlockedMap.get(def.id) || null,
  }));
}

// ── Streak Management ──

export function updateStreak(): void {
  const db = getDb();
  ensureUserStats();

  const stats = getStats();
  const today = new Date().toISOString().slice(0, 10);

  if (stats.last_active_date === today) return; // Already active today

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let newStreak: number;

  if (stats.last_active_date === yesterday) {
    newStreak = stats.current_streak + 1;
  } else {
    newStreak = 1;
  }

  const longestStreak = Math.max(newStreak, stats.longest_streak);

  db.prepare('UPDATE user_stats SET current_streak = ?, longest_streak = ?, last_active_date = ? WHERE id = ?').run(
    newStreak,
    longestStreak,
    today,
    'local_user',
  );

  // Award streak XP
  if (newStreak > 1) {
    db.prepare('INSERT INTO xp_events (id, event_type, xp_amount, description) VALUES (?, ?, ?, ?)').run(
      randomUUID(),
      'STREAK_DAY',
      XP_VALUES.STREAK_DAY,
      `${newStreak}-day streak bonus`,
    );
    db.prepare('UPDATE user_stats SET xp = xp + ? WHERE id = ?').run(XP_VALUES.STREAK_DAY, 'local_user');

    // Update streak challenge progress
    updateChallengeProgress('maintain_streak', 0, newStreak);
  }

  // Check streak achievements
  const updatedStats = getStats();
  checkAchievements(updatedStats);
}

// ── Weekly Challenges ──

export function getActiveChallenge(): Challenge | null {
  const db = getDb();
  const now = new Date().toISOString();
  const row = db.prepare('SELECT * FROM challenges WHERE completed_at IS NULL AND expires_at > ? ORDER BY started_at DESC LIMIT 1').get(now) as Record<string, unknown> | undefined;
  if (!row) return null;

  return {
    id: row.id as string,
    challenge_type: row.challenge_type as string,
    target: row.target as number,
    progress: row.progress as number,
    xp_reward: row.xp_reward as number,
    started_at: row.started_at as string,
    completed_at: row.completed_at as string | null,
    expires_at: row.expires_at as string,
    description: CHALLENGE_POOL.find((c) => c.type === row.challenge_type && c.target === row.target)?.description || '',
  };
}

export function startWeeklyChallenge(): Challenge {
  const db = getDb();

  // Pick a random challenge from the pool
  const template = CHALLENGE_POOL[Math.floor(Math.random() * CHALLENGE_POOL.length)];

  // Calculate next Monday
  const now = new Date();
  const daysUntilMonday = ((8 - now.getDay()) % 7) || 7;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);

  const id = randomUUID();
  db.prepare('INSERT INTO challenges (id, challenge_type, target, progress, xp_reward, expires_at) VALUES (?, ?, ?, 0, ?, ?)').run(
    id,
    template.type,
    template.target,
    template.xpReward,
    nextMonday.toISOString(),
  );

  return {
    id,
    challenge_type: template.type,
    target: template.target,
    progress: 0,
    xp_reward: template.xpReward,
    started_at: new Date().toISOString(),
    completed_at: null,
    expires_at: nextMonday.toISOString(),
    description: template.description,
  };
}

export function updateChallengeProgress(type: string, increment: number, absoluteValue?: number): void {
  const db = getDb();
  const challenge = getActiveChallenge();
  if (!challenge || challenge.challenge_type !== type) return;
  if (challenge.completed_at) return;

  let newProgress: number;
  if (absoluteValue !== undefined) {
    newProgress = absoluteValue;
  } else {
    newProgress = challenge.progress + increment;
  }

  db.prepare('UPDATE challenges SET progress = ? WHERE id = ?').run(newProgress, challenge.id);

  // Check if challenge is now complete
  if (newProgress >= challenge.target) {
    db.prepare('UPDATE challenges SET completed_at = datetime(\'now\') WHERE id = ?').run(challenge.id);

    // Award challenge XP
    db.prepare('INSERT INTO xp_events (id, event_type, xp_amount, description) VALUES (?, ?, ?, ?)').run(
      randomUUID(),
      'CHALLENGE_COMPLETE',
      challenge.xp_reward,
      `Weekly challenge completed: ${challenge.description}`,
    );
    db.prepare('UPDATE user_stats SET xp = xp + ? WHERE id = ?').run(challenge.xp_reward, 'local_user');
  }
}

// ── XP History ──

export function getXPHistory(limit = 20): XPEvent[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM xp_events ORDER BY created_at DESC LIMIT ?').all(limit) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: row.id as string,
    event_type: row.event_type as string,
    xp_amount: row.xp_amount as number,
    description: row.description as string,
    meeting_id: row.meeting_id as string | null,
    created_at: row.created_at as string,
  }));
}
