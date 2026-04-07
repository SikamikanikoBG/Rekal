import React, { useState, useEffect } from 'react';
import { tokens } from '../styles/tokens';
import { Challenge } from '../../shared/types';

export function ChallengeWidget() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChallenge();
  }, []);

  async function loadChallenge() {
    try {
      const data = await window.api.gamification.getChallenge();
      setChallenge(data);
    } catch (e) {
      console.error('Failed to load challenge:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.headerIcon}>🎯</span>
          <span style={styles.headerTitle}>Weekly Challenge</span>
        </div>
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.headerIcon}>🎯</span>
          <span style={styles.headerTitle}>Weekly Challenge</span>
        </div>
        <p style={styles.noChallenge}>No active challenge</p>
        <button style={styles.startBtn} onClick={loadChallenge}>
          Start New Challenge
        </button>
      </div>
    );
  }

  const isComplete = challenge.completed_at !== null || challenge.progress >= challenge.target;
  const progressPct = Math.min(100, (challenge.progress / challenge.target) * 100);

  // Time remaining
  const expiresAt = new Date(challenge.expires_at);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div style={{
      ...styles.container,
      ...(isComplete ? styles.containerComplete : {}),
    }}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>{isComplete ? '🎉' : '🎯'}</span>
        <span style={styles.headerTitle}>Weekly Challenge</span>
        {!isComplete && (
          <span style={styles.daysLeft}>{daysLeft}d left</span>
        )}
      </div>

      <p style={styles.description}>{challenge.description}</p>

      {/* Progress bar */}
      <div style={styles.progressRow}>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${progressPct}%`,
              background: isComplete ? 'var(--green)' : 'var(--accent)',
            }}
          />
        </div>
        <span style={styles.progressText}>
          {challenge.progress}/{challenge.target}
        </span>
      </div>

      {/* Reward */}
      <div style={styles.rewardRow}>
        <span style={styles.rewardLabel}>Reward:</span>
        <span style={styles.rewardValue}>{challenge.xp_reward} XP</span>
        {isComplete && <span style={styles.completeTag}>Complete!</span>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'var(--bg-card)',
    border: `1px solid ${'var(--border-light)'}`,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
  },
  containerComplete: {
    borderColor: 'var(--green)',
    boxShadow: `0 0 16px ${'var(--green-light)'}`,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  headerIcon: {
    fontSize: 16,
    lineHeight: 1,
  },
  headerTitle: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    flex: 1,
  },
  daysLeft: {
    fontSize: tokens.fontSize.xs,
    color: 'var(--text-tertiary)',
    fontWeight: tokens.fontWeight.medium,
  },
  description: {
    fontSize: tokens.fontSize.md,
    color: 'var(--text-primary)',
    fontWeight: tokens.fontWeight.medium,
    margin: 0,
    marginBottom: tokens.spacing.md,
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    background: 'var(--border)',
    borderRadius: tokens.radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: tokens.radius.full,
    transition: `width ${tokens.transition.slow}`,
  },
  progressText: {
    fontSize: tokens.fontSize.xs,
    color: 'var(--text-secondary)',
    fontWeight: tokens.fontWeight.semibold,
    minWidth: 36,
    textAlign: 'right' as const,
  },
  rewardRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  rewardLabel: {
    fontSize: tokens.fontSize.xs,
    color: 'var(--text-tertiary)',
  },
  rewardValue: {
    fontSize: tokens.fontSize.xs,
    color: 'var(--accent)',
    fontWeight: tokens.fontWeight.bold,
  },
  completeTag: {
    fontSize: tokens.fontSize.xs,
    color: 'var(--green)',
    fontWeight: tokens.fontWeight.bold,
    marginLeft: 'auto',
  },
  loadingText: {
    color: 'var(--text-tertiary)',
    fontSize: tokens.fontSize.sm,
    margin: 0,
  },
  noChallenge: {
    color: 'var(--text-tertiary)',
    fontSize: tokens.fontSize.sm,
    margin: 0,
    marginBottom: tokens.spacing.md,
  },
  startBtn: {
    background: 'var(--accent-light)',
    color: 'var(--accent)',
    border: 'none',
    borderRadius: tokens.radius.md,
    padding: `${tokens.spacing.sm}px ${tokens.spacing.lg}px`,
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    fontFamily: 'var(--font)',
    cursor: 'pointer',
    transition: `all ${tokens.transition.fast}`,
  },
};
