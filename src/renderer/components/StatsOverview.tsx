import React, { useState, useEffect } from 'react';
import { tokens } from '../styles/tokens';
import { UserStats, Achievement, LevelInfo } from '../../shared/types';

interface StatsData {
  stats: UserStats;
  levelInfo: LevelInfo & { progress: number; nextLevel: LevelInfo | null };
}

export function StatsOverview() {
  const [data, setData] = useState<StatsData | null>(null);
  const [achievementCount, setAchievementCount] = useState({ unlocked: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      window.api.gamification.getStats(),
      window.api.gamification.getAchievements(),
    ])
      .then(([statsResult, achievements]: [StatsData, Achievement[]]) => {
        setData(statsResult);
        setAchievementCount({
          unlocked: achievements.filter((a) => a.unlocked).length,
          total: achievements.length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div style={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={styles.card}>
            <div style={styles.cardValue}>--</div>
            <div style={styles.cardLabel}>Loading</div>
          </div>
        ))}
      </div>
    );
  }

  const { stats, levelInfo } = data;

  const cards = [
    {
      icon: '\u2B50',
      value: `Lvl ${levelInfo.level}`,
      label: levelInfo.title,
      color: tokens.colors.accent,
    },
    {
      icon: '\u2728',
      value: stats.xp.toLocaleString(),
      label: 'Total XP',
      color: tokens.colors.accent,
    },
    {
      icon: '\uD83D\uDD25',
      value: `${stats.current_streak}`,
      label: 'Day Streak',
      color: '#E67E22',
    },
    {
      icon: '\uD83C\uDFC6',
      value: `${achievementCount.unlocked}/${achievementCount.total}`,
      label: 'Achievements',
      color: '#F1C40F',
    },
  ];

  return (
    <div style={styles.grid}>
      {cards.map((card, i) => (
        <div key={i} style={styles.card}>
          <div style={styles.cardTop}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{card.icon}</span>
          </div>
          <div style={{ ...styles.cardValue, color: card.color }}>{card.value}</div>
          <div style={styles.cardLabel}>{card.label}</div>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: tokens.spacing.md,
  },
  card: {
    background: tokens.colors.bgSurface,
    border: `1px solid ${tokens.colors.borderSubtle}`,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 4,
  },
  cardTop: {
    marginBottom: tokens.spacing.xs,
  },
  cardValue: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
    lineHeight: 1,
  },
  cardLabel: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textSecondary,
    fontWeight: tokens.fontWeight.medium,
  },
};
