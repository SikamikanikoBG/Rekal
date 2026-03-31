import { useState, useEffect, useRef, useCallback } from 'react';
import { UserStats, Achievement, Challenge, LevelInfo } from '../../shared/types';

interface GamificationState {
  stats: UserStats | null;
  levelInfo: (LevelInfo & { progress: number; nextLevel: LevelInfo | null }) | null;
  achievements: Achievement[];
  challenge: Challenge | null;
  loading: boolean;
}

interface XPResult {
  xpAwarded: number;
  newLevel: boolean;
  newAchievements: string[];
}

interface UseGamificationReturn extends GamificationState {
  refresh: () => Promise<void>;
  awardXP: (eventType: string, meetingId?: string) => Promise<XPResult | null>;
}

// Global event emitter for gamification toasts
type GamificationListener = (event: GamificationEvent) => void;
const listeners: Set<GamificationListener> = new Set();

export interface GamificationEvent {
  type: 'xp' | 'level-up' | 'achievement' | 'streak';
  xpAmount?: number;
  description?: string;
  levelTitle?: string;
  levelNumber?: number;
  achievementName?: string;
  achievementIcon?: string;
  streakCount?: number;
}

export function onGamificationEvent(listener: GamificationListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function emitEvent(event: GamificationEvent) {
  listeners.forEach((fn) => fn(event));
}

export function useGamification(): UseGamificationReturn {
  const [state, setState] = useState<GamificationState>({
    stats: null,
    levelInfo: null,
    achievements: [],
    challenge: null,
    loading: true,
  });

  const prevStatsRef = useRef<UserStats | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [statsResult, achievements, challenge] = await Promise.all([
        window.api.gamification.getStats(),
        window.api.gamification.getAchievements(),
        window.api.gamification.getChallenge(),
      ]);

      setState({
        stats: statsResult.stats,
        levelInfo: statsResult.levelInfo,
        achievements,
        challenge,
        loading: false,
      });

      // Check for streak changes
      const prev = prevStatsRef.current;
      if (prev && statsResult.stats.current_streak > prev.current_streak) {
        emitEvent({
          type: 'streak',
          streakCount: statsResult.stats.current_streak,
        });
      }

      prevStatsRef.current = statsResult.stats;
    } catch (e) {
      console.error('Failed to fetch gamification data:', e);
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const awardXP = useCallback(async (eventType: string, meetingId?: string): Promise<XPResult | null> => {
    try {
      const result: XPResult = await window.api.gamification.awardXP(eventType, meetingId);

      if (result.xpAwarded > 0) {
        const label = eventType.replace(/_/g, ' ').toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase());
        emitEvent({
          type: 'xp',
          xpAmount: result.xpAwarded,
          description: label,
        });
      }

      if (result.newLevel) {
        // Refetch to get new level info
        const statsResult = await window.api.gamification.getStats();
        emitEvent({
          type: 'level-up',
          levelTitle: statsResult.levelInfo.title,
          levelNumber: statsResult.levelInfo.level,
        });
      }

      if (result.newAchievements.length > 0) {
        const achievements = await window.api.gamification.getAchievements();
        for (const achId of result.newAchievements) {
          const ach = achievements.find((a: Achievement) => a.id === achId);
          if (ach) {
            emitEvent({
              type: 'achievement',
              achievementName: ach.name,
              achievementIcon: ach.icon,
            });
          }
        }
      }

      // Refresh state
      await fetchAll();
      return result;
    } catch (e) {
      console.error('Failed to award XP:', e);
      return null;
    }
  }, [fetchAll]);

  return { ...state, refresh: fetchAll, awardXP };
}

/**
 * Hook that listens for gamification events and calls the toast provider.
 * Call this in App.tsx or a top-level component.
 */
export function useGamificationToasts(toast: {
  success: (msg: string) => void;
  info: (msg: string) => void;
}) {
  useEffect(() => {
    const unsub = onGamificationEvent((event) => {
      switch (event.type) {
        case 'xp':
          toast.info(`+${event.xpAmount} XP — ${event.description}!`);
          break;
        case 'level-up':
          toast.success(`Level Up! You are now Level ${event.levelNumber} — ${event.levelTitle}`);
          break;
        case 'achievement':
          toast.success(`${event.achievementIcon} Achievement Unlocked: ${event.achievementName}!`);
          break;
        case 'streak':
          toast.info(`${event.streakCount}-day streak! Keep it going!`);
          break;
      }
    });
    return unsub;
  }, [toast]);
}
