import React, { useState } from 'react';
import { MeetingChat } from '../components/MeetingChat';

interface Props {
  transcript: any;
  notes: any;
  duration: number;
  title: string;
  date: string;
  meetingId: string;
  onBack: () => void;
}

type Tab = 'summary' | 'actions' | 'transcript' | 'analytics' | 'chat' | 'sentiment' | 'quotes' | 'followups';

export function Results({ transcript, notes, duration, title, date, meetingId, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('summary');
  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState('');

  function copyMarkdown() {
    navigator.clipboard.writeText(formatAsMarkdown(notes, transcript));
    flash('Markdown copied');
  }

  function copyMinutes() {
    navigator.clipboard.writeText(formatAsMinutes(notes, title, date));
    flash('Minutes copied');
  }

  function sendEmail() {
    const minutes = formatAsMinutes(notes, title, date);
    const subject = `Meeting Minutes: ${title}`;
    window.api.openMailto(subject, minutes);
    setExportOpen(false);
  }

  function flash(msg: string) {
    setCopied(msg);
    setExportOpen(false);
    setTimeout(() => setCopied(''), 2000);
  }

  return (
    <div className="screen" style={{ gap: 0 }}>
      {/* Header */}
      <div style={styles.header}>
        <button className="btn btn-ghost" onClick={onBack} style={styles.backBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </button>

        <div style={styles.headerCenter}>
          <h2 style={styles.meetingTitle}>{title}</h2>
          <span style={styles.meetingDate}>
            {new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div style={styles.headerActions}>
          {/* Export dropdown */}
          <div style={styles.exportWrap}>
            <button
              className="btn btn-primary"
              onClick={() => setExportOpen(!exportOpen)}
              style={styles.exportBtn}
            >
              {copied || 'Export'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 4 }}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {exportOpen && (
              <div style={styles.exportMenu}>
                <button style={styles.exportItem} onClick={copyMarkdown}>
                  <span>Copy as Markdown</span>
                  <span style={styles.exportHint}>For docs, GitHub</span>
                </button>
                <button style={styles.exportItem} onClick={copyMinutes}>
                  <span>Copy as Meeting Minutes</span>
                  <span style={styles.exportHint}>For email, Word</span>
                </button>
                <div style={styles.exportDivider} />
                <button style={styles.exportItem} onClick={sendEmail}>
                  <span>Send via Email</span>
                  <span style={styles.exportHint}>Opens Outlook</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['summary', 'actions', 'transcript', 'analytics', 'sentiment', 'quotes', 'followups', 'chat'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              ...styles.tab,
              ...(tab === t ? styles.tabActive : {}),
            }}
          >
            {t === 'summary' && 'Summary'}
            {t === 'actions' && `Action Items${notes?.actionItems?.length ? ` (${notes.actionItems.length})` : ''}`}
            {t === 'transcript' && 'Transcript'}
            {t === 'analytics' && 'Analytics'}
            {t === 'sentiment' && 'Sentiment'}
            {t === 'quotes' && 'Quotes'}
            {t === 'followups' && `Follow-ups${notes?.followUps?.length ? ` (${notes.followUps.length})` : ''}`}
            {t === 'chat' && 'Chat'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content} className="fade-in">
        {tab === 'summary' && <SummaryTab notes={notes} />}
        {tab === 'actions' && <ActionsTab notes={notes} />}
        {tab === 'transcript' && <TranscriptTab transcript={transcript} />}
        {tab === 'analytics' && <AnalyticsTab transcript={transcript} notes={notes} duration={duration} />}
        {tab === 'sentiment' && <SentimentTab notes={notes} />}
        {tab === 'quotes' && <QuotesTab notes={notes} />}
        {tab === 'followups' && <FollowUpsTab notes={notes} meetingId={meetingId} />}
        {tab === 'chat' && <MeetingChat meetingId={meetingId} />}
      </div>
    </div>
  );
}

// ── Tab Components ──

function SummaryTab({ notes }: { notes: any }) {
  return (
    <div style={styles.tabContent}>
      <section>
        <h3 style={styles.sectionTitle}>Summary</h3>
        <p style={styles.summaryText}>{notes?.summary || 'No summary generated.'}</p>
      </section>
      {notes?.keyDecisions?.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h3 style={styles.sectionTitle}>Key Decisions</h3>
          <ul style={styles.list}>
            {notes.keyDecisions.map((d: string, i: number) => (
              <li key={i} style={styles.listItem}>
                <span style={styles.decisionDot} />
                {d}
              </li>
            ))}
          </ul>
        </section>
      )}
      {notes?.topics?.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h3 style={styles.sectionTitle}>Topics</h3>
          <div style={styles.topicTags}>
            {notes.topics.map((t: string, i: number) => (
              <span key={i} style={styles.topicTag}>{t}</span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ActionsTab({ notes }: { notes: any }) {
  const [items, setItems] = useState(notes?.actionItems || []);
  function toggle(id: string) {
    setItems((prev: any[]) => prev.map((item: any) => {
      if (item.id !== id) return item;
      const newDone = !item.done;
      // Award XP when marking a task as done
      if (newDone) {
        window.api.gamification.awardXP('TASK_COMPLETED').catch(() => {});
      }
      return { ...item, done: newDone };
    }));
  }
  return (
    <div style={styles.tabContent}>
      {items.length === 0 ? (
        <p style={styles.empty}>No action items found.</p>
      ) : (
        <div style={styles.actionList}>
          {items.map((item: any) => (
            <div key={item.id} style={{ ...styles.actionItem, opacity: item.done ? 0.5 : 1 }} onClick={() => toggle(item.id)}>
              <div style={{ ...styles.checkbox, ...(item.done ? styles.checkboxDone : {}) }}>
                {item.done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>}
              </div>
              <span style={{ textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TranscriptTab({ transcript }: { transcript: any }) {
  if (!transcript?.segments?.length) {
    return <div style={styles.tabContent}><p style={styles.empty}>No transcript available.</p></div>;
  }
  return (
    <div style={styles.tabContent}>
      <div style={styles.transcriptList}>
        {transcript.segments.map((seg: any, i: number) => (
          <div key={i} style={styles.transcriptRow}>
            <span style={styles.timestamp}>{formatTime(seg.start)}</span>
            <p style={styles.transcriptText}>{seg.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsTab({ transcript, notes, duration }: { transcript: any; notes: any; duration: number }) {
  const segmentCount = transcript?.segments?.length || 0;
  const wordCount = transcript?.segments?.reduce((acc: number, s: any) => acc + (s.text?.split(' ').length || 0), 0) || 0;
  return (
    <div style={styles.tabContent}>
      <div style={styles.statsGrid}>
        <StatCard label="Duration" value={formatDuration(duration)} />
        <StatCard label="Segments" value={segmentCount.toString()} />
        <StatCard label="Words" value={wordCount.toLocaleString()} />
        <StatCard label="Topics" value={(notes?.topics?.length || 0).toString()} />
        <StatCard label="Action Items" value={(notes?.actionItems?.length || 0).toString()} />
        <StatCard label="Words/min" value={duration > 0 ? Math.round(wordCount / (duration / 60)).toString() : '0'} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.statCard}>
      <p style={styles.statValue}>{value}</p>
      <p style={styles.statLabel}>{label}</p>
    </div>
  );
}

// ── Sentiment Tab ──

function SentimentTab({ notes }: { notes: any }) {
  const sentiment = notes?.sentiment;
  if (!sentiment) {
    return <div style={styles.tabContent}><p style={styles.empty}>No sentiment data available for this meeting.</p></div>;
  }

  const overallColor = sentiment.overall === 'positive' ? 'var(--green)' : sentiment.overall === 'negative' ? 'var(--red, #E74C3C)' : 'var(--text-tertiary)';
  const overallBg = sentiment.overall === 'positive' ? 'rgba(46, 204, 113, 0.15)' : sentiment.overall === 'negative' ? 'rgba(231, 76, 60, 0.15)' : 'rgba(139, 139, 142, 0.15)';
  // Score bar: map -1..1 to 0..100%
  const scorePercent = ((sentiment.score + 1) / 2) * 100;

  return (
    <div style={styles.tabContent}>
      {/* Overall sentiment badge */}
      <section>
        <h3 style={styles.sectionTitle}>Overall Sentiment</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <span style={{
            display: 'inline-block',
            padding: '6px 16px',
            borderRadius: 'var(--radius-full)',
            background: overallBg,
            color: overallColor,
            fontWeight: 600,
            fontSize: 14,
            textTransform: 'capitalize' as const,
          }}>
            {sentiment.overall}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Score: {sentiment.score.toFixed(2)}
          </span>
        </div>
      </section>

      {/* Score visualization bar */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={styles.sectionTitle}>Score</h3>
        <div style={{ position: 'relative', height: 12, background: 'var(--bg)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          {/* Gradient background */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, #E74C3C, #8B8B8E, #2ECC71)',
            opacity: 0.25,
            borderRadius: 'var(--radius-full)',
          }} />
          {/* Indicator dot */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: `${scorePercent}%`,
            transform: 'translate(-50%, -50%)',
            width: 16, height: 16,
            borderRadius: '50%',
            background: overallColor,
            border: '2px solid var(--bg-card)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
          <span>Negative (-1)</span>
          <span>Neutral (0)</span>
          <span>Positive (+1)</span>
        </div>
      </section>

      {/* Top Emotions */}
      {sentiment.topEmotions?.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h3 style={styles.sectionTitle}>Top Emotions</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
            {sentiment.topEmotions.map((emotion: string, i: number) => (
              <span key={i} style={{
                fontSize: 12, padding: '5px 12px',
                background: 'var(--bg)',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text-secondary)',
                fontWeight: 500,
              }}>{emotion}</span>
            ))}
          </div>
        </section>
      )}

      {/* Highlights */}
      {sentiment.highlights?.length > 0 && (
        <section>
          <h3 style={styles.sectionTitle}>Sentiment Highlights</h3>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {sentiment.highlights.map((h: any, i: number) => {
              const isPositive = h.sentiment === 'positive';
              const hlColor = isPositive ? 'var(--green)' : 'var(--red, #E74C3C)';
              const hlBg = isPositive ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)';
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  borderLeft: `3px solid ${hlColor}`,
                  background: hlBg,
                }}>
                  <span style={{
                    fontSize: 11, fontFamily: 'var(--font-mono)',
                    color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 2,
                  }}>{h.timestamp}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, lineHeight: 1.5, fontStyle: 'italic', color: 'var(--text-primary)' }}>
                      "{h.text}"
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: hlColor, textTransform: 'capitalize' as const,
                      }}>{h.sentiment}</span>
                      <div style={{ width: 50, height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${h.intensity * 100}%`, height: '100%', background: hlColor, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{Math.round(h.intensity * 100)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Key Quotes Tab ──

function QuotesTab({ notes }: { notes: any }) {
  const quotes = notes?.keyQuotes;
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function copyQuote(text: string, idx: number) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  if (!quotes || quotes.length === 0) {
    return <div style={styles.tabContent}><p style={styles.empty}>No key quotes available for this meeting.</p></div>;
  }

  return (
    <div style={styles.tabContent}>
      <h3 style={styles.sectionTitle}>Key Quotes</h3>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
        {quotes.map((q: any, i: number) => (
          <div key={i} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)', padding: '16px 18px',
            position: 'relative' as const,
          }}>
            {/* Copy button */}
            <button
              onClick={() => copyQuote(q.text, i)}
              style={{
                position: 'absolute' as const, top: 12, right: 12,
                background: 'none', border: 'none', cursor: 'pointer',
                color: copiedIdx === i ? 'var(--green)' : 'var(--text-tertiary)',
                fontSize: 12, fontFamily: 'var(--font)', fontWeight: 500,
                padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                transition: 'all 150ms',
              }}
              title="Copy quote"
            >
              {copiedIdx === i ? 'Copied!' : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>

            {/* Quote text */}
            <p style={{
              fontSize: 16, lineHeight: 1.6, fontStyle: 'italic',
              color: 'var(--text-primary)', marginBottom: 10, paddingRight: 32,
            }}>
              "{q.text}"
            </p>

            {/* Meta row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-mono)',
                padding: '3px 8px', background: 'var(--bg)',
                borderRadius: 'var(--radius-full)', color: 'var(--text-tertiary)',
              }}>{q.timestamp}</span>
              {q.speaker && (
                <span style={{
                  fontSize: 12, fontWeight: 500, color: 'var(--accent)',
                }}>{q.speaker}</span>
              )}
            </div>

            {/* Context */}
            {q.context && (
              <p style={{
                fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5,
              }}>{q.context}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Follow-ups & Deadlines Tab ──

function FollowUpsTab({ notes, meetingId }: { notes: any; meetingId: string }) {
  const [items, setItems] = useState<any[]>(notes?.followUps || []);

  function toggleDone(id: string) {
    setItems((prev) => {
      const updated = prev.map((item: any) => item.id === id ? { ...item, done: !item.done } : item);
      // Persist the update back to the meeting
      try {
        const updatedNotes = { ...notes, followUps: updated };
        // We need to save via the API — fire and forget
        (window as any).api.getMeeting(meetingId).then((meeting: any) => {
          if (meeting) {
            (window as any).api.saveMeeting({ ...meeting, notes: updatedNotes });
          }
        });
      } catch { /* best-effort persist */ }
      return updated;
    });
  }

  if (!items || items.length === 0) {
    return <div style={styles.tabContent}><p style={styles.empty}>No follow-ups available for this meeting.</p></div>;
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...items].sort((a, b) => (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1) - (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1));

  const now = new Date();
  const overdueCount = items.filter((f: any) => {
    if (!f.deadline || f.done) return false;
    return new Date(f.deadline) < now;
  }).length;

  // Group by priority
  const groups: Record<string, any[]> = { high: [], medium: [], low: [] };
  sorted.forEach((item) => {
    const p = item.priority || 'medium';
    if (!groups[p]) groups[p] = [];
    groups[p].push(item);
  });

  const priorityColors: Record<string, string> = { high: '#E74C3C', medium: '#F39C12', low: '#2ECC71' };
  const priorityLabels: Record<string, string> = { high: 'High Priority', medium: 'Medium Priority', low: 'Low Priority' };

  function getDeadlineStyle(deadline?: string): { color: string; label: string } {
    if (!deadline) return { color: 'var(--text-tertiary)', label: 'No deadline' };
    const d = new Date(deadline);
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { color: '#E74C3C', label: `Overdue (${deadline})` };
    if (diffDays <= 7) return { color: '#F39C12', label: `This week (${deadline})` };
    return { color: '#2ECC71', label: deadline };
  }

  return (
    <div style={styles.tabContent}>
      <h3 style={styles.sectionTitle}>Follow-ups & Deadlines</h3>

      {/* Overdue banner */}
      {overdueCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', marginBottom: 16,
          background: 'rgba(231, 76, 60, 0.1)', border: '1px solid rgba(231, 76, 60, 0.3)',
          borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500,
          color: '#E74C3C',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {overdueCount} overdue item{overdueCount !== 1 ? 's' : ''}
        </div>
      )}

      {/* Groups */}
      {(['high', 'medium', 'low'] as const).map((priority) => {
        const group = groups[priority];
        if (!group || group.length === 0) return null;
        return (
          <section key={priority} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: priorityColors[priority], flexShrink: 0,
              }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                {priorityLabels[priority]}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
              {group.map((item: any) => {
                const dl = getDeadlineStyle(item.deadline);
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                      opacity: item.done ? 0.5 : 1,
                      cursor: 'pointer', transition: 'background 150ms',
                    }}
                    onClick={() => toggleDone(item.id)}
                  >
                    {/* Checkbox */}
                    <div style={{
                      ...styles.checkbox,
                      ...(item.done ? styles.checkboxDone : {}),
                    }}>
                      {item.done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontSize: 14, lineHeight: 1.5,
                        textDecoration: item.done ? 'line-through' : 'none',
                        color: 'var(--text-primary)',
                      }}>{item.task}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' as const }}>
                        {item.assignee && (
                          <span style={{
                            fontSize: 11, padding: '2px 8px',
                            background: 'rgba(108, 92, 231, 0.15)',
                            borderRadius: 'var(--radius-full)',
                            color: 'var(--accent)', fontWeight: 500,
                          }}>{item.assignee}</span>
                        )}
                        <span style={{ fontSize: 11, color: dl.color, fontWeight: 500 }}>{dl.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ── Formatters ──

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function formatAsMarkdown(notes: any, transcript: any): string {
  let md = '# Meeting Notes\n\n';
  if (notes?.summary) md += `## Summary\n\n${notes.summary}\n\n`;
  if (notes?.keyDecisions?.length) {
    md += '## Key Decisions\n\n';
    notes.keyDecisions.forEach((d: string) => { md += `- ${d}\n`; });
    md += '\n';
  }
  if (notes?.actionItems?.length) {
    md += '## Action Items\n\n';
    notes.actionItems.forEach((a: any) => { md += `- [ ] ${a.text}\n`; });
    md += '\n';
  }
  if (notes?.topics?.length) {
    md += `## Topics\n\n${notes.topics.join(', ')}\n\n`;
  }
  if (transcript?.segments?.length) {
    md += '## Transcript\n\n';
    transcript.segments.forEach((s: any) => { md += `**[${formatTime(s.start)}]** ${s.text}\n\n`; });
  }
  return md;
}

function formatAsMinutes(notes: any, title: string, date: string): string {
  const lines: string[] = [];
  const dateStr = new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  lines.push('MEETING MINUTES');
  lines.push('═'.repeat(50));
  lines.push(`Title: ${title}`);
  lines.push(`Date:  ${dateStr}`);
  lines.push('');

  if (notes?.summary) {
    lines.push('SUMMARY');
    lines.push('─'.repeat(50));
    lines.push(notes.summary);
    lines.push('');
  }

  if (notes?.keyDecisions?.length) {
    lines.push('KEY DECISIONS');
    lines.push('─'.repeat(50));
    notes.keyDecisions.forEach((d: string, i: number) => {
      lines.push(`  ${i + 1}. ${d}`);
    });
    lines.push('');
  }

  if (notes?.actionItems?.length) {
    lines.push('ACTION ITEMS');
    lines.push('─'.repeat(50));
    notes.actionItems.forEach((a: any, i: number) => {
      const assignee = a.assignee ? ` → ${a.assignee}` : '';
      lines.push(`  ${i + 1}. ${a.text}${assignee}`);
    });
    lines.push('');
  }

  if (notes?.topics?.length) {
    lines.push('TOPICS DISCUSSED');
    lines.push('─'.repeat(50));
    lines.push(`  ${notes.topics.join(', ')}`);
    lines.push('');
  }

  lines.push('═'.repeat(50));
  lines.push('Generated by Rekal');

  return lines.join('\n');
}

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 70 },
  headerCenter: { textAlign: 'center', flex: 1 },
  meetingTitle: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' },
  meetingDate: { fontSize: 12, color: 'var(--text-tertiary)' },
  headerActions: { display: 'flex', gap: 8, minWidth: 70, justifyContent: 'flex-end' },
  exportWrap: { position: 'relative' as const },
  exportBtn: { display: 'flex', alignItems: 'center', padding: '8px 14px', fontSize: 13 },
  exportMenu: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: 4,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    minWidth: 220,
    zIndex: 50,
    overflow: 'hidden',
  },
  exportItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    width: '100%',
    padding: '10px 14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font)',
    transition: 'background 100ms',
  },
  exportHint: { fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400, marginTop: 2 },
  exportDivider: { height: 1, background: 'var(--border)', margin: '2px 0' },
  tabs: {
    display: 'flex', gap: 0,
    borderBottom: '1px solid var(--border)', marginBottom: 24,
  },
  tab: {
    padding: '10px 16px', fontSize: 13, fontWeight: 500,
    color: 'var(--text-secondary)', background: 'none', border: 'none',
    borderBottom: '2px solid transparent', cursor: 'pointer',
    transition: 'all 150ms', marginBottom: -1,
  },
  tabActive: { color: 'var(--accent)', borderBottomColor: 'var(--accent)' },
  content: { flex: 1, overflowY: 'auto' as const },
  tabContent: { maxWidth: 640 },
  sectionTitle: {
    fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 12,
  },
  summaryText: { fontSize: 15, lineHeight: 1.7, color: 'var(--text-primary)' },
  list: { listStyle: 'none', display: 'flex', flexDirection: 'column' as const, gap: 8 },
  listItem: { display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, lineHeight: 1.5 },
  decisionDot: {
    width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)',
    flexShrink: 0, marginTop: 7,
  },
  topicTags: { display: 'flex', flexWrap: 'wrap' as const, gap: 8 },
  topicTag: {
    fontSize: 12, padding: '5px 12px', background: 'var(--bg)',
    borderRadius: 'var(--radius-full)', color: 'var(--text-secondary)', fontWeight: 500,
  },
  actionList: { display: 'flex', flexDirection: 'column' as const, gap: 6 },
  actionItem: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '10px 12px', borderRadius: 'var(--radius-sm)',
    cursor: 'pointer', transition: 'background 150ms', fontSize: 14, lineHeight: 1.5,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, border: '2px solid var(--border)',
    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginTop: 1, transition: 'all 150ms',
  },
  checkboxDone: { background: 'var(--green)', borderColor: 'var(--green)' },
  empty: { color: 'var(--text-tertiary)', fontSize: 14, textAlign: 'center' as const, padding: '40px 0' },
  transcriptList: { display: 'flex', flexDirection: 'column' as const, gap: 2 },
  transcriptRow: { display: 'flex', gap: 12, padding: '6px 0' },
  timestamp: {
    fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
    flexShrink: 0, marginTop: 2,
  },
  transcriptText: { fontSize: 14, lineHeight: 1.6 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  statCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)', padding: '20px 16px', textAlign: 'center' as const,
  },
  statValue: {
    fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
  },
  statLabel: { fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 },
};
