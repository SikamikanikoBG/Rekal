import React, { useState, useEffect } from 'react';
import { tokens } from '../styles/tokens';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LangPickerModal } from '../components/LangPickerModal';

interface FailedSession {
  id: string;
  audioPath: string;
  transcript: any | null;
  failedStep: 'transcription' | 'summarization';
  errorMessage: string;
  createdAt: string;
}

interface Props {
  onStartRecording: () => void;
  onViewMeeting: (id: string) => void;
  onRetryFailedSession: (session: FailedSession) => void;
}

interface DashboardStats {
  totalMeetings: number;
  thisWeekMeetings: number;
  openActions: number;
}

interface GamificationData {
  stats: { xp: number; level: number; current_streak: number };
  levelInfo: { level: number; title: string; progress: number; nextLevel: { title: string } | null };
}

interface ChallengeData {
  description: string;
  progress: number;
  target: number;
  xp_reward: number;
  expires_at: string;
}

interface CostSummaryData {
  today: { total: number; stt: number; llm: number };
  thisWeek: { total: number; stt: number; llm: number };
  thisMonth: { total: number; stt: number; llm: number };
  allTime: { total: number; stt: number; llm: number };
}

export function Dashboard({ onStartRecording, onViewMeeting, onRetryFailedSession }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [costSummary, setCostSummary] = useState<CostSummaryData | null>(null);
  const [costExpanded, setCostExpanded] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [failedSessions, setFailedSessions] = useState<FailedSession[]>([]);

  useEffect(() => {
    window.api.dashboard.getStats().then(setStats).catch(() => {});
    window.api.gamification.getStats().then(setGamification).catch(() => {});
    window.api.gamification.getChallenge().then(setChallenge).catch(() => {});
    window.api.getMeetings(5).then(setMeetings).catch(() => {});
    window.api.tasks.getAll().then((all: any[]) => {
      setTasks(all.filter((t: any) => !t.done).slice(0, 5));
    }).catch(() => {});
    window.api.costs.summary().then(setCostSummary).catch(() => {});
    window.api.failedSessions.getAll().then(setFailedSessions).catch(() => {});
  }, []);

  async function handleDismissFailedSession(id: string) {
    await window.api.failedSessions.delete(id).catch(() => {});
    setFailedSessions((prev) => prev.filter((s) => s.id !== id));
  }

  const level = gamification?.levelInfo?.level ?? 1;
  const title = gamification?.levelInfo?.title ?? 'Intern';
  const streak = gamification?.stats?.current_streak ?? 0;
  const progress = gamification?.levelInfo?.progress ?? 0;

  return (
    <div className="screen" style={styles.container}>
      {showLangPicker && (
        <LangPickerModal onConfirm={onStartRecording} onCancel={() => setShowLangPicker(false)} />
      )}

      {/* Quick Record */}
      <button onClick={() => setShowLangPicker(true)} style={styles.recordBtn}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
        Start Recording
      </button>

      {/* Failed Sessions */}
      {failedSessions.length > 0 && (
        <div style={styles.failedList}>
          {failedSessions.map((s) => (
            <div key={s.id} style={styles.failedItem}>
              <div style={styles.failedIcon}>!</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={styles.failedTitle}>
                  {s.failedStep === 'summarization' ? 'Notes failed' : 'Transcription failed'}
                  <span style={styles.failedDate}> · {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </p>
                <p style={styles.failedError}>{s.errorMessage}</p>
              </div>
              <div style={styles.failedActions}>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => onRetryFailedSession(s)}>
                  Retry
                </button>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => handleDismissFailedSession(s.id)} title="Dismiss">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Row */}
      <div style={styles.statsRow}>
        <StatCard label="Total Meetings" value={stats?.totalMeetings ?? 0} />
        <StatCard label="This Week" value={stats?.thisWeekMeetings ?? 0} />
        <StatCard label="Open Actions" value={stats?.openActions ?? 0} accent />
        <StatCard label={`Streak / Lvl ${level}`} value={streak} subtitle={title} />
      </div>

      {/* Two column layout */}
      <div style={styles.columns}>
        {/* Left column */}
        <div style={styles.column}>
          {/* Recent Meetings */}
          <Card header="Recent Meetings" padding="none">
            {meetings.length === 0 ? (
              <p style={styles.emptyText}>No meetings yet. Record your first one!</p>
            ) : (
              <div style={styles.meetingsList}>
                {meetings.map((m: any) => (
                  <div key={m.id} style={styles.meetingCard} onClick={() => onViewMeeting(m.id)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={styles.meetingTitle}>{m.title}</p>
                      <div style={styles.meetingMeta}>
                        <span>{new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        <span style={styles.dot} />
                        <span>{formatDuration(m.duration)}</span>
                      </div>
                      {m.notes?.topics?.length > 0 && (
                        <div style={styles.tagRow}>
                          {m.notes.topics.slice(0, 3).map((t: string, i: number) => (
                            <Badge key={i} variant="default">{t}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={'var(--text-tertiary)'} strokeWidth="2">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div style={styles.column}>
          {/* Active Challenge */}
          {challenge && (
            <Card header="Weekly Challenge" padding="md">
              <p style={styles.challengeDesc}>{challenge.description}</p>
              <div style={styles.progressBarBg}>
                <div style={{
                  ...styles.progressBarFill,
                  width: `${Math.min(100, (challenge.progress / challenge.target) * 100)}%`,
                }} />
              </div>
              <div style={styles.challengeMeta}>
                <span>{challenge.progress} / {challenge.target}</span>
                <Badge variant="accent">+{challenge.xp_reward} XP</Badge>
              </div>
            </Card>
          )}

          {/* Pending Actions */}
          <Card header="Pending Actions" padding="none">
            {tasks.length === 0 ? (
              <p style={styles.emptyText}>No open action items. Keep it up!</p>
            ) : (
              <div style={styles.tasksList}>
                {tasks.map((task: any) => (
                  <div key={task.id} style={styles.taskRow}>
                    <div style={styles.taskCheckbox} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={styles.taskText}>{task.text}</p>
                      <p style={styles.taskMeeting}>{task.meetingTitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Level Progress */}
          <Card padding="md">
            <div style={styles.levelRow}>
              <div style={styles.levelBadge}>
                <span style={styles.levelNumber}>{level}</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={styles.levelTitle}>Level {level} - {title}</p>
                <div style={styles.progressBarBg}>
                  <div style={{
                    ...styles.progressBarFill,
                    width: `${Math.round(progress * 100)}%`,
                  }} />
                </div>
                {gamification?.levelInfo?.nextLevel && (
                  <p style={styles.levelNext}>Next: {gamification.levelInfo.nextLevel.title}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Usage Costs */}
          {costSummary && (
            <Card header="Usage Costs" padding="md">
              <div style={styles.costGrid}>
                <CostRow label="Today" amount={costSummary.today.total} />
                <CostRow label="This Week" amount={costSummary.thisWeek.total} />
                <CostRow label="This Month" amount={costSummary.thisMonth.total} />
                <CostRow label="All Time" amount={costSummary.allTime.total} />
              </div>
              {costSummary.allTime.total > 0 && (
                <div
                  style={styles.costToggle}
                  onClick={() => setCostExpanded(!costExpanded)}
                >
                  <span>{costExpanded ? 'Hide' : 'Show'} breakdown</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ transform: costExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              )}
              {costExpanded && costSummary.allTime.total > 0 && (
                <div style={styles.costBreakdownSection}>
                  <div style={styles.costBreakdownRow}>
                    <span style={styles.costBreakdownLabel}>STT (all time)</span>
                    <span style={styles.costBreakdownValue}>${costSummary.allTime.stt.toFixed(2)}</span>
                  </div>
                  <div style={styles.costBreakdownRow}>
                    <span style={styles.costBreakdownLabel}>LLM (all time)</span>
                    <span style={styles.costBreakdownValue}>${costSummary.allTime.llm.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtitle, accent }: { label: string; value: number; subtitle?: string; accent?: boolean }) {
  return (
    <div style={styles.statCard}>
      <p style={{ ...styles.statValue, color: accent ? 'var(--orange)' : 'var(--text-primary)' }}>
        {value}
      </p>
      <p style={styles.statLabel}>{label}</p>
      {subtitle && <p style={styles.statSub}>{subtitle}</p>}
    </div>
  );
}

function CostRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div style={styles.costRow}>
      <span style={styles.costLabel}>{label}</span>
      <span style={styles.costAmount}>${amount.toFixed(4)}</span>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

const styles: Record<string, React.CSSProperties> = {
  failedList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 },
  failedItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--red-light)', borderRadius: 'var(--radius)', border: '1px solid var(--red)' },
  failedIcon: { width: 28, height: 28, borderRadius: '50%', background: 'var(--red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 },
  failedTitle: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 },
  failedDate: { fontWeight: 400, color: 'var(--text-secondary)' },
  failedError: { fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  failedActions: { display: 'flex', gap: 6, flexShrink: 0 },
  container: {
    gap: 0,
    overflowY: 'auto',
    padding: tokens.spacing.xl,
  },
  recordBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    padding: '16px 24px',
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.semibold,
    fontFamily: 'var(--font)',
    color: 'white',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: tokens.radius.lg,
    cursor: 'pointer',
    transition: `all ${tokens.transition.fast}`,
    marginBottom: tokens.spacing.xl,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.xl,
  },
  statCard: {
    background: 'var(--bg-card)',
    border: `1px solid ${'var(--border-light)'}`,
    borderRadius: tokens.radius.lg,
    padding: `${tokens.spacing.lg}px ${tokens.spacing.md}px`,
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: tokens.fontSize.xxxl,
    fontWeight: tokens.fontWeight.bold,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: tokens.fontSize.xs,
    color: 'var(--text-tertiary)',
    marginTop: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  statSub: {
    fontSize: tokens.fontSize.xs,
    color: 'var(--accent)',
    marginTop: 2,
  },
  columns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacing.lg,
  },
  column: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.lg,
  },
  meetingsList: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  meetingCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
    cursor: 'pointer',
    transition: `background ${tokens.transition.fast}`,
    borderBottom: `1px solid ${'var(--border-light)'}`,
  },
  meetingTitle: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.medium,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  meetingMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: tokens.fontSize.xs,
    color: 'var(--text-tertiary)',
    marginTop: 2,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: '50%',
    background: 'var(--text-tertiary)',
  },
  tagRow: {
    display: 'flex',
    gap: 4,
    marginTop: 6,
    flexWrap: 'wrap' as const,
  },
  emptyText: {
    padding: `${tokens.spacing.xl}px ${tokens.spacing.lg}px`,
    fontSize: tokens.fontSize.sm,
    color: 'var(--text-tertiary)',
    textAlign: 'center' as const,
  },
  challengeDesc: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.medium,
    color: 'var(--text-primary)',
    marginBottom: tokens.spacing.md,
  },
  progressBarBg: {
    height: 6,
    background: 'var(--border)',
    borderRadius: tokens.radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'var(--accent)',
    borderRadius: tokens.radius.full,
    transition: `width ${tokens.transition.slow}`,
  },
  challengeMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: tokens.spacing.sm,
    fontSize: tokens.fontSize.xs,
    color: 'var(--text-secondary)',
  },
  tasksList: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  taskRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: `${tokens.spacing.sm}px ${tokens.spacing.lg}px`,
    borderBottom: `1px solid ${'var(--border-light)'}`,
  },
  taskCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    border: `2px solid ${'var(--border)'}`,
    flexShrink: 0,
    marginTop: 2,
  },
  taskText: {
    fontSize: tokens.fontSize.sm,
    color: 'var(--text-primary)',
    lineHeight: 1.4,
  },
  taskMeeting: {
    fontSize: tokens.fontSize.xs,
    color: 'var(--text-tertiary)',
    marginTop: 2,
  },
  levelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  levelBadge: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.full,
    background: 'var(--accent-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  levelNumber: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.bold,
    color: 'var(--accent)',
  },
  levelTitle: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: 'var(--text-primary)',
    marginBottom: 6,
  },
  levelNext: {
    fontSize: tokens.fontSize.xs,
    color: 'var(--text-tertiary)',
    marginTop: 4,
  },
  costGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.sm,
  },
  costRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: tokens.fontSize.sm,
  },
  costLabel: {
    color: 'var(--text-secondary)',
  },
  costAmount: {
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  costToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: tokens.spacing.md,
    paddingTop: tokens.spacing.sm,
    borderTop: `1px solid ${'var(--border-light)'}`,
    cursor: 'pointer',
    fontSize: tokens.fontSize.xs,
    color: 'var(--text-tertiary)',
  },
};
