import React, { useState, useEffect, useCallback } from 'react';
import { tokens } from '../styles/tokens';
import { Badge } from '../components/ui/Badge';

type DateFilter = 'week' | 'month' | 'all';

interface Props {
  onViewMeeting: (id: string) => void;
}

export function Timeline({ onViewMeeting }: Props) {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);

  const loadMeetings = useCallback(async () => {
    try {
      let data: any[];
      if (search.trim()) {
        data = await window.api.searchMeetings(search);
      } else {
        data = await window.api.getMeetings(limit);
      }
      setMeetings(data);
    } catch (e) {
      console.error('Failed to load meetings:', e);
    }
  }, [search, limit]);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  // Filter by date
  const filtered = meetings.filter((m) => {
    if (dateFilter === 'all') return true;
    const meetingDate = new Date(m.date);
    const now = new Date();
    if (dateFilter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return meetingDate >= weekAgo;
    }
    if (dateFilter === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      return meetingDate >= monthAgo;
    }
    return true;
  });

  // Group by date label
  const groups: { label: string; meetings: any[] }[] = [];
  let currentLabel = '';
  for (const m of filtered) {
    const d = new Date(m.date);
    const label = formatDateLabel(d);
    if (label !== currentLabel) {
      groups.push({ label, meetings: [m] });
      currentLabel = label;
    } else {
      groups[groups.length - 1].meetings.push(m);
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="screen" style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Timeline</h2>
      </div>

      {/* Search + Filters */}
      <div style={styles.filterRow}>
        <div style={styles.searchWrap}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={'var(--text-tertiary)'} strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search meetings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.dateFilters}>
          {(['week', 'month', 'all'] as DateFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              style={{
                ...styles.dateBtn,
                ...(dateFilter === f ? styles.dateBtnActive : {}),
              }}
            >
              {f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={styles.timeline}>
        {filtered.length === 0 ? (
          <div style={styles.emptyState}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={'var(--text-tertiary)'} strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p style={styles.emptyTitle}>No meetings found</p>
            <p style={styles.emptySubtitle}>
              {search ? 'Try a different search term' : 'Record your first meeting to see it here'}
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} style={styles.group}>
              {/* Date marker */}
              <div style={styles.dateMarker}>
                <div style={styles.dateMarkerDot} />
                <span style={styles.dateMarkerText}>{group.label}</span>
              </div>

              {/* Meeting cards */}
              {group.meetings.map((m: any) => {
                const isExpanded = expandedId === m.id;
                const actionCount = m.notes?.actionItems?.length || 0;
                const summary = m.notes?.summary || '';

                return (
                  <div key={m.id} style={styles.timelineCard}>
                    <div style={styles.timelineLine} />
                    <div style={styles.timelineDot} />
                    <div style={styles.cardContent}>
                      {/* Card header */}
                      <div style={styles.cardHeader} onClick={() => toggleExpand(m.id)}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); onViewMeeting(m.id); }}
                            style={styles.cardTitle}
                          >
                            {m.title}
                          </button>
                          <div style={styles.cardMeta}>
                            <span>
                              {new Date(m.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span style={styles.metaDot} />
                            <span>{formatDuration(m.duration)}</span>
                          </div>
                        </div>
                        <div style={styles.badges}>
                          {actionCount > 0 && (
                            <Badge variant="accent">{actionCount} action{actionCount !== 1 ? 's' : ''}</Badge>
                          )}
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke={'var(--text-tertiary)'} strokeWidth="2"
                            style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: `transform ${tokens.transition.fast}` }}
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </div>
                      </div>

                      {/* Topic tags */}
                      {m.notes?.topics?.length > 0 && (
                        <div style={styles.topicRow}>
                          {m.notes.topics.map((t: string, i: number) => (
                            <Badge key={i} variant="default">{t}</Badge>
                          ))}
                        </div>
                      )}

                      {/* Preview (always shown) */}
                      {!isExpanded && summary && (
                        <p style={styles.preview}>
                          {summary.length > 100 ? summary.substring(0, 100) + '...' : summary}
                        </p>
                      )}

                      {/* Expanded content */}
                      {isExpanded && (
                        <div style={styles.expanded} className="fade-in">
                          {summary && (
                            <div style={styles.expandedSection}>
                              <h4 style={styles.expandedLabel}>Summary</h4>
                              <p style={styles.expandedText}>{summary}</p>
                            </div>
                          )}
                          {m.notes?.keyDecisions?.length > 0 && (
                            <div style={styles.expandedSection}>
                              <h4 style={styles.expandedLabel}>Key Decisions</h4>
                              <ul style={styles.expandedList}>
                                {m.notes.keyDecisions.map((d: string, i: number) => (
                                  <li key={i} style={styles.expandedListItem}>{d}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <button
                            onClick={() => onViewMeeting(m.id)}
                            style={styles.viewFullBtn}
                          >
                            View full meeting
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="m9 18 6-6-6-6" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Load more */}
        {filtered.length >= limit && !search && (
          <button
            onClick={() => setLimit((prev) => prev + 20)}
            style={styles.loadMoreBtn}
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}

function formatDateLabel(d: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = today.getTime() - dateOnly.getTime();
  const dayMs = 86400000;

  if (diff < dayMs) return 'Today';
  if (diff < 2 * dayMs) return 'Yesterday';
  if (diff < 7 * dayMs) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    gap: 0,
    overflowY: 'auto',
    padding: tokens.spacing.xl,
  },
  header: {
    marginBottom: tokens.spacing.lg,
  },
  title: {
    fontSize: tokens.fontSize.xxl,
    fontWeight: tokens.fontWeight.bold,
    color: 'var(--text-primary)',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.xl,
  },
  searchWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: 'var(--bg-card)',
    border: `1px solid ${'var(--border-light)'}`,
    borderRadius: tokens.radius.md,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: tokens.fontSize.md,
    fontFamily: 'var(--font)',
    color: 'var(--text-primary)',
  },
  dateFilters: {
    display: 'flex',
    gap: 2,
    background: 'var(--bg-card)',
    borderRadius: tokens.radius.md,
    padding: 2,
    border: `1px solid ${'var(--border-light)'}`,
  },
  dateBtn: {
    padding: '6px 12px',
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.medium,
    fontFamily: 'var(--font)',
    color: 'var(--text-secondary)',
    background: 'transparent',
    border: 'none',
    borderRadius: tokens.radius.sm,
    cursor: 'pointer',
    transition: `all ${tokens.transition.fast}`,
    whiteSpace: 'nowrap' as const,
  },
  dateBtnActive: {
    background: 'var(--accent)',
    color: 'white',
  },
  timeline: {
    position: 'relative' as const,
    paddingLeft: tokens.spacing.xl,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center' as const,
  },
  emptyTitle: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.semibold,
    color: 'var(--text-primary)',
    marginTop: tokens.spacing.lg,
  },
  emptySubtitle: {
    fontSize: tokens.fontSize.sm,
    color: 'var(--text-tertiary)',
    marginTop: 4,
  },
  group: {
    marginBottom: tokens.spacing.xl,
  },
  dateMarker: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: tokens.spacing.md,
    marginLeft: -tokens.spacing.xl,
  },
  dateMarkerDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: 'var(--accent)',
    flexShrink: 0,
    marginLeft: -5,
  },
  dateMarkerText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.bold,
    color: 'var(--text-primary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  timelineCard: {
    position: 'relative' as const,
    paddingLeft: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
  },
  timelineLine: {
    position: 'absolute' as const,
    left: -tokens.spacing.xl,
    top: 0,
    bottom: 0,
    width: 2,
    background: 'var(--border-light)',
    marginLeft: -1,
  },
  timelineDot: {
    position: 'absolute' as const,
    left: -tokens.spacing.xl,
    top: 12,
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--text-tertiary)',
    marginLeft: -3,
  },
  cardContent: {
    background: 'var(--bg-card)',
    border: `1px solid ${'var(--border-light)'}`,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    cursor: 'pointer',
  },
  cardTitle: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.semibold,
    color: 'var(--text-primary)',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    textAlign: 'left' as const,
    display: 'block',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: tokens.fontSize.xs,
    color: 'var(--text-tertiary)',
    marginTop: 2,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: '50%',
    background: 'var(--text-tertiary)',
  },
  badges: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  topicRow: {
    display: 'flex',
    gap: 4,
    marginTop: tokens.spacing.sm,
    flexWrap: 'wrap' as const,
  },
  preview: {
    fontSize: tokens.fontSize.sm,
    color: 'var(--text-secondary)',
    marginTop: tokens.spacing.sm,
    lineHeight: 1.5,
  },
  expanded: {
    marginTop: tokens.spacing.md,
    paddingTop: tokens.spacing.md,
    borderTop: `1px solid ${'var(--border-light)'}`,
  },
  expandedSection: {
    marginBottom: tokens.spacing.md,
  },
  expandedLabel: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: 6,
  },
  expandedText: {
    fontSize: tokens.fontSize.md,
    color: 'var(--text-primary)',
    lineHeight: 1.6,
  },
  expandedList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    padding: 0,
  },
  expandedListItem: {
    fontSize: tokens.fontSize.sm,
    color: 'var(--text-primary)',
    lineHeight: 1.5,
    paddingLeft: 12,
    position: 'relative' as const,
  },
  viewFullBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    fontFamily: 'var(--font)',
    color: 'var(--accent)',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    marginTop: tokens.spacing.md,
  },
  loadMoreBtn: {
    display: 'block',
    width: '100%',
    padding: '12px',
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    fontFamily: 'var(--font)',
    color: 'var(--text-secondary)',
    background: 'var(--bg-card)',
    border: `1px solid ${'var(--border-light)'}`,
    borderRadius: tokens.radius.md,
    cursor: 'pointer',
    textAlign: 'center' as const,
    marginTop: tokens.spacing.lg,
  },
};
