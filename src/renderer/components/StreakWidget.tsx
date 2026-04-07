import React, { useState, useEffect } from 'react';
import { tokens } from '../styles/tokens';

export function StreakWidget() {
  const [streak, setStreak] = useState(0);
  const [longest, setLongest] = useState(0);
  const [activeToday, setActiveToday] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.api.gamification.getStats()
      .then((data: any) => {
        const stats = data.stats;
        setStreak(stats.current_streak || 0);
        setLongest(stats.longest_streak || 0);

        const today = new Date().toISOString().slice(0, 10);
        setActiveToday(stats.last_active_date === today);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <span style={styles.loadingText}>...</span>
      </div>
    );
  }

  // Color intensity based on streak length
  const intensity = Math.min(1, streak / 30);
  const fireColor = `hsl(${20 - intensity * 10}, ${80 + intensity * 20}%, ${55 - intensity * 10}%)`;

  return (
    <div style={styles.container}>
      <div style={styles.top}>
        <span
          style={{
            ...styles.fireIcon,
            ...(activeToday ? {
              animation: 'pulse 2s ease-in-out infinite',
            } : {}),
            color: fireColor,
          }}
        >
          {streak > 0 ? '\uD83D\uDD25' : '\u2744\uFE0F'}
        </span>
        <span style={{
          ...styles.streakCount,
          color: streak > 0 ? fireColor : 'var(--text-tertiary)',
        }}>
          {streak}
        </span>
      </div>
      <p style={styles.label}>day streak</p>
      <p style={styles.longestText}>Longest: {longest} days</p>

      {/* Inject keyframes via style tag */}
      {activeToday && (
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
          }
        `}</style>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'var(--bg-card)',
    border: `1px solid ${'var(--border-light)'}`,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  top: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  fireIcon: {
    fontSize: 28,
    lineHeight: 1,
    display: 'inline-block',
  },
  streakCount: {
    fontSize: tokens.fontSize.xxxl,
    fontWeight: tokens.fontWeight.bold,
    lineHeight: 1,
  },
  label: {
    fontSize: tokens.fontSize.sm,
    color: 'var(--text-secondary)',
    margin: 0,
    marginTop: 4,
    fontWeight: tokens.fontWeight.medium,
  },
  longestText: {
    fontSize: tokens.fontSize.xs,
    color: 'var(--text-tertiary)',
    margin: 0,
    marginTop: tokens.spacing.xs,
  },
  loadingText: {
    color: 'var(--text-tertiary)',
    fontSize: tokens.fontSize.sm,
  },
};
