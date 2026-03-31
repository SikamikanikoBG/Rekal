import React, { useState, useEffect } from 'react';
import { MicButton } from '../components/MicButton';

interface Props {
  onStartRecording: () => void;
  onViewMeeting: (id: string) => void;
  onOpenSettings: () => void;
}

export function Idle({ onStartRecording, onViewMeeting, onOpenSettings }: Props) {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Load meetings
  useEffect(() => {
    if (search.trim()) {
      window.api.searchMeetings(search).then(setMeetings).catch(() => {});
    } else {
      window.api.getMeetings(20).then(setMeetings).catch(() => {});
    }
  }, [search]);

  // Refresh meetings when we land on this screen
  useEffect(() => {
    window.api.getMeetings(20).then(setMeetings).catch(() => {});
  }, []);

  return (
    <div className="screen" style={styles.container}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.searchWrap}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input type="text" placeholder="Search meetings..." value={search}
            onChange={(e) => setSearch(e.target.value)} style={styles.searchInput} />
        </div>
        <button className="btn btn-ghost" onClick={onOpenSettings} title="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
      </div>

      {/* Mic button */}
      <div style={styles.hero}>
        <MicButton state="idle" onClick={onStartRecording} />
        <p style={styles.heroHint}>Tap to start recording</p>
      </div>

      {/* Recent meetings */}
      {meetings.length > 0 && (
        <div style={styles.meetingsSection}>
          <h3 style={styles.meetingsTitle}>Recent meetings</h3>
          <div style={styles.meetingsList}>
            {meetings.map((m: any) => (
              <div key={m.id} style={styles.meetingRow} onClick={() => onViewMeeting(m.id)}>
                <div>
                  <p style={styles.meetingName}>{m.title}</p>
                  <p style={styles.meetingMeta}>
                    {new Date(m.date).toLocaleDateString()} · {formatDuration(m.duration)}
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-tertiary)' }}>
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
  container: { gap: 0 },
  topBar: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 },
  searchWrap: {
    flex: 1, display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
  },
  searchInput: {
    flex: 1, border: 'none', outline: 'none', background: 'transparent',
    fontSize: 13, fontFamily: 'var(--font)', color: 'var(--text-primary)',
  },
  hero: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0',
  },
  heroHint: { fontSize: 13, color: 'var(--text-tertiary)' },
  meetingsSection: { marginTop: 'auto' },
  meetingsTitle: {
    fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 12,
  },
  meetingsList: { display: 'flex', flexDirection: 'column', gap: 4 },
  meetingRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    transition: 'background 150ms',
  },
  meetingName: { fontSize: 14, fontWeight: 500 },
  meetingMeta: { fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 },
};
