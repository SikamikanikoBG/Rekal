import React, { useState, useEffect, useCallback } from 'react';
import { tokens } from '../styles/tokens';
import { Badge } from '../components/ui/Badge';

interface TaskWithContext {
  id: string;
  text: string;
  assignee?: string;
  done: boolean;
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
}

type Filter = 'all' | 'open' | 'completed';
type Sort = 'date' | 'meeting';

interface Props {
  onViewMeeting: (id: string) => void;
}

export function GlobalTasks({ onViewMeeting }: Props) {
  const [tasks, setTasks] = useState<TaskWithContext[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('date');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const loadTasks = useCallback(async () => {
    try {
      const all = await window.api.tasks.getAll();
      setTasks(all);
    } catch (e) {
      console.error('Failed to load tasks:', e);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function toggleTask(task: TaskWithContext) {
    try {
      await window.api.tasks.toggle(task.meetingId, task.id);
      setTasks((prev) =>
        prev.map((t) => t.id === task.id ? { ...t, done: !t.done } : t)
      );
    } catch (e) {
      console.error('Failed to toggle task:', e);
    }
  }

  function toggleGroup(groupKey: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }

  // Filter
  const filtered = tasks.filter((t) => {
    if (filter === 'open') return !t.done;
    if (filter === 'completed') return t.done;
    return true;
  });

  // Count
  const openCount = tasks.filter((t) => !t.done).length;
  const completedCount = tasks.filter((t) => t.done).length;

  // Group by meeting if sort === 'meeting'
  const grouped: Map<string, TaskWithContext[]> = new Map();
  if (sort === 'meeting') {
    for (const task of filtered) {
      const key = task.meetingId;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(task);
    }
  }

  return (
    <div className="screen" style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Tasks</h2>
        <p style={styles.subtitle}>{openCount} open, {completedCount} completed</p>
      </div>

      {/* Filter bar */}
      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          {(['all', 'open', 'completed'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...styles.filterBtn,
                ...(filter === f ? styles.filterBtnActive : {}),
              }}
            >
              {f === 'all' ? 'All' : f === 'open' ? 'Open' : 'Completed'}
            </button>
          ))}
        </div>
        <div style={styles.filterGroup}>
          <span style={styles.sortLabel}>Sort:</span>
          {(['date', 'meeting'] as Sort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              style={{
                ...styles.filterBtn,
                ...(sort === s ? styles.filterBtnActive : {}),
              }}
            >
              {s === 'date' ? 'By Date' : 'By Meeting'}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks list */}
      <div style={styles.content}>
        {filtered.length === 0 ? (
          <div style={styles.emptyState}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={'var(--text-tertiary)'} strokeWidth="1.5">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <p style={styles.emptyTitle}>
              {filter === 'open' ? 'No open tasks' : filter === 'completed' ? 'No completed tasks' : 'No tasks yet'}
            </p>
            <p style={styles.emptySubtitle}>
              Action items from your meetings will appear here
            </p>
          </div>
        ) : sort === 'meeting' ? (
          // Grouped by meeting
          Array.from(grouped.entries()).map(([meetingId, meetingTasks]) => {
            const first = meetingTasks[0];
            const isCollapsed = collapsedGroups.has(meetingId);
            return (
              <div key={meetingId} style={styles.group}>
                <button style={styles.groupHeader} onClick={() => toggleGroup(meetingId)}>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: `transform ${tokens.transition.fast}` }}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                  <span style={styles.groupTitle}>{first.meetingTitle}</span>
                  <span style={styles.groupDate}>
                    {new Date(first.meetingDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  <Badge variant="default">{meetingTasks.length}</Badge>
                </button>
                {!isCollapsed && (
                  <div style={styles.groupTasks}>
                    {meetingTasks.map((task) => (
                      <TaskItem key={task.id} task={task} onToggle={toggleTask} onViewMeeting={onViewMeeting} />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          // Flat list sorted by date (newest first)
          filtered.map((task) => (
            <TaskItem key={task.id} task={task} onToggle={toggleTask} onViewMeeting={onViewMeeting} showMeeting />
          ))
        )}
      </div>
    </div>
  );
}

function TaskItem({ task, onToggle, onViewMeeting, showMeeting }: {
  task: TaskWithContext;
  onToggle: (task: TaskWithContext) => void;
  onViewMeeting: (id: string) => void;
  showMeeting?: boolean;
}) {
  return (
    <div style={{ ...styles.taskRow, opacity: task.done ? 0.5 : 1 }}>
      <button
        onClick={() => onToggle(task)}
        style={{ ...styles.checkbox, ...(task.done ? styles.checkboxDone : {}) }}
      >
        {task.done && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ ...styles.taskText, textDecoration: task.done ? 'line-through' : 'none' }}>
          {task.text}
        </p>
        {showMeeting && (
          <button
            onClick={(e) => { e.stopPropagation(); onViewMeeting(task.meetingId); }}
            style={styles.meetingLink}
          >
            {task.meetingTitle}
          </button>
        )}
      </div>
      {task.assignee && <Badge variant="accent">{task.assignee}</Badge>}
    </div>
  );
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
  subtitle: {
    fontSize: tokens.fontSize.sm,
    color: 'var(--text-tertiary)',
    marginTop: 4,
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    background: 'var(--bg-card)',
    borderRadius: tokens.radius.md,
    padding: 2,
    border: `1px solid ${'var(--border-light)'}`,
  },
  filterBtn: {
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
  },
  filterBtnActive: {
    background: 'var(--accent)',
    color: 'white',
  },
  sortLabel: {
    fontSize: tokens.fontSize.xs,
    color: 'var(--text-tertiary)',
    padding: '0 8px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
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
    marginBottom: tokens.spacing.sm,
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
    background: 'var(--bg-card)',
    border: `1px solid ${'var(--border-light)'}`,
    borderRadius: tokens.radius.md,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    color: 'var(--text-secondary)',
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
  },
  groupTitle: {
    flex: 1,
    textAlign: 'left' as const,
    color: 'var(--text-primary)',
  },
  groupDate: {
    fontSize: tokens.fontSize.xs,
    color: 'var(--text-tertiary)',
  },
  groupTasks: {
    marginLeft: tokens.spacing.lg,
    borderLeft: `2px solid ${'var(--border-light)'}`,
    paddingLeft: tokens.spacing.md,
    marginTop: 4,
  },
  taskRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
    borderRadius: tokens.radius.sm,
    transition: `background ${tokens.transition.fast}`,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    border: `2px solid ${'var(--border)'}`,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    cursor: 'pointer',
    background: 'transparent',
    transition: `all ${tokens.transition.fast}`,
    padding: 0,
  },
  checkboxDone: {
    background: 'var(--green)',
    borderColor: 'var(--green)',
  },
  taskText: {
    fontSize: tokens.fontSize.md,
    color: 'var(--text-primary)',
    lineHeight: 1.5,
  },
  meetingLink: {
    fontSize: tokens.fontSize.xs,
    color: 'var(--accent)',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    fontWeight: tokens.fontWeight.medium,
    marginTop: 2,
    display: 'inline-block',
  },
};
