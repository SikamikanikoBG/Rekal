import React, { useState, useEffect } from 'react';
import { tokens } from '../styles/tokens';
import { Tabs } from '../components/ui';
import { Achievement } from '../../shared/types';

const RARITY_COLORS: Record<string, string> = {
  common: tokens.colors.textTertiary,
  rare: '#3498DB',
  epic: '#9B59B6',
  legendary: '#F1C40F',
};

const RARITY_BG: Record<string, string> = {
  common: 'rgba(92, 92, 95, 0.2)',
  rare: 'rgba(52, 152, 219, 0.15)',
  epic: 'rgba(155, 89, 182, 0.15)',
  legendary: 'rgba(241, 196, 15, 0.15)',
};

type FilterTab = 'all' | 'unlocked' | 'locked';

export function Achievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');

  useEffect(() => {
    window.api.gamification.getAchievements()
      .then((data: Achievement[]) => {
        setAchievements(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;

  const filtered = achievements.filter((a) => {
    if (filter === 'unlocked') return a.unlocked;
    if (filter === 'locked') return !a.unlocked;
    return true;
  });

  // Group by category based on achievement id prefixes
  const categories = groupByCategory(filtered);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Achievements</h1>
        </div>
        <p style={styles.loadingText}>Loading achievements...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Achievements</h1>
          <span style={styles.count}>{unlockedCount}/{totalCount} unlocked</span>
        </div>
      </div>

      {/* Filter tabs */}
      <Tabs
        tabs={[
          { id: 'all', label: 'All', count: totalCount },
          { id: 'unlocked', label: 'Unlocked', count: unlockedCount },
          { id: 'locked', label: 'Locked', count: totalCount - unlockedCount },
        ]}
        active={filter}
        onChange={(id) => setFilter(id as FilterTab)}
        style={{ marginBottom: tokens.spacing.xl }}
      />

      {/* Achievement grid by category */}
      {categories.map(({ label, items }) => (
        <div key={label} style={{ marginBottom: tokens.spacing.xl }}>
          <h3 style={styles.sectionHeader}>{label}</h3>
          <div style={styles.grid}>
            {items.map((ach) => (
              <AchievementCard key={ach.id} achievement={ach} />
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p style={styles.emptyText}>
          {filter === 'unlocked' ? 'No achievements unlocked yet. Keep going!' : 'All achievements unlocked!'}
        </p>
      )}
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const [hovered, setHovered] = useState(false);
  const { unlocked, rarity } = achievement;
  const rarityColor = RARITY_COLORS[rarity];
  const rarityBg = RARITY_BG[rarity];

  return (
    <div
      style={{
        ...styles.card,
        opacity: unlocked ? 1 : 0.5,
        borderColor: unlocked && hovered ? rarityColor : tokens.colors.borderSubtle,
        boxShadow: unlocked ? `0 0 12px ${rarityBg}` : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Rarity badge */}
      <span
        style={{
          ...styles.rarityBadge,
          background: rarityBg,
          color: rarityColor,
        }}
      >
        {rarity}
      </span>

      {/* Icon */}
      <div style={styles.iconWrap}>
        <span style={styles.icon}>{achievement.icon}</span>
      </div>

      {/* Name */}
      <p style={styles.cardName}>{achievement.name}</p>

      {/* Description */}
      <p style={styles.cardDesc}>{achievement.description}</p>

      {/* Unlock date */}
      {unlocked && achievement.unlocked_at && (
        <p style={styles.unlockDate}>
          {new Date(achievement.unlocked_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

function groupByCategory(achievements: Achievement[]): Array<{ label: string; items: Achievement[] }> {
  const categoryMap: Record<string, { label: string; ids: Set<string> }> = {
    recording: { label: 'Recording', ids: new Set(['first_meeting', 'meetings_10', 'meetings_50', 'meetings_100']) },
    streaks: { label: 'Streaks', ids: new Set(['streak_7', 'streak_30', 'streak_90', 'streak_365']) },
    tasks: { label: 'Tasks', ids: new Set(['tasks_10', 'tasks_100', 'tasks_500']) },
    chat: { label: 'AI Chat', ids: new Set(['first_chat', 'chat_50', 'chat_200']) },
    special: { label: 'Special', ids: new Set(['early_bird', 'night_owl', 'marathon']) },
  };

  const result: Array<{ label: string; items: Achievement[] }> = [];

  for (const [, cat] of Object.entries(categoryMap)) {
    const items = achievements.filter((a) => cat.ids.has(a.id));
    if (items.length > 0) {
      result.push({ label: cat.label, items });
    }
  }

  // Any uncategorized
  const allCatIds = new Set(Object.values(categoryMap).flatMap((c) => [...c.ids]));
  const uncategorized = achievements.filter((a) => !allCatIds.has(a.id));
  if (uncategorized.length > 0) {
    result.push({ label: 'Other', items: uncategorized });
  }

  return result;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    padding: tokens.spacing.xl,
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.lg,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'baseline',
    gap: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.fontSize.xxxl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
    margin: 0,
  },
  count: {
    fontSize: tokens.fontSize.md,
    color: tokens.colors.textSecondary,
    fontWeight: tokens.fontWeight.medium,
  },
  loadingText: {
    color: tokens.colors.textTertiary,
    fontSize: tokens.fontSize.md,
    textAlign: 'center' as const,
    marginTop: tokens.spacing.xxxl,
  },
  sectionHeader: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: tokens.spacing.md,
    margin: 0,
    marginTop: 0,
    paddingBottom: tokens.spacing.sm,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.sm,
  },
  card: {
    position: 'relative' as const,
    background: tokens.colors.bgSurface,
    border: `1px solid ${tokens.colors.borderSubtle}`,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
    transition: `all ${tokens.transition.fast}`,
    cursor: 'default',
  },
  rarityBadge: {
    position: 'absolute' as const,
    top: tokens.spacing.sm,
    right: tokens.spacing.sm,
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    padding: '2px 8px',
    borderRadius: tokens.radius.full,
    textTransform: 'capitalize' as const,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.full,
    background: tokens.colors.bgSurfaceHover,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.sm,
  },
  icon: {
    fontSize: 24,
    lineHeight: 1,
  },
  cardName: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
    margin: 0,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textSecondary,
    margin: 0,
    lineHeight: 1.4,
  },
  unlockDate: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textTertiary,
    margin: 0,
    marginTop: tokens.spacing.sm,
  },
  emptyText: {
    color: tokens.colors.textTertiary,
    fontSize: tokens.fontSize.md,
    textAlign: 'center' as const,
    marginTop: tokens.spacing.xxxl,
  },
};
