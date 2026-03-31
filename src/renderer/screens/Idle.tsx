import React, { useState, useEffect } from 'react';
import { MicButton } from '../components/MicButton';

const LANGUAGES = [
  { code: 'auto', label: 'Auto' },
  { code: 'en', label: 'EN' },
  { code: 'bg', label: 'BG' },
];

interface ProviderInfo { id: string; name: string; }

interface Props {
  language: string;
  transcriptionProvider: string;
  transcriptionModel: string;
  summarizationProvider: string;
  summarizationModel: string;
  onLanguageChange: (lang: string) => void;
  onTranscriptionChange: (provider: string, model: string) => void;
  onSummarizationChange: (provider: string, model: string) => void;
  onStartRecording: () => void;
  onViewMeeting: (id: string) => void;
  onOpenSettings: () => void;
}

export function Idle(props: Props) {
  const {
    language, transcriptionProvider, transcriptionModel,
    summarizationProvider, summarizationModel,
    onLanguageChange, onTranscriptionChange, onSummarizationChange,
    onStartRecording, onViewMeeting, onOpenSettings,
  } = props;

  const [meetings, setMeetings] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [tProviders, setTProviders] = useState<ProviderInfo[]>([]);
  const [sProviders, setSProviders] = useState<ProviderInfo[]>([]);
  const [tModels, setTModels] = useState<string[]>([]);
  const [sModels, setSModels] = useState<string[]>([]);

  // Load providers on mount
  useEffect(() => {
    window.api.listProviders().then((p: any) => {
      setTProviders(p.transcription || []);
      setSProviders(p.summarization || []);
    }).catch(() => {});
  }, []);

  // Load models when provider changes
  useEffect(() => {
    window.api.listProviderModels('transcription', transcriptionProvider)
      .then((models: string[]) => {
        setTModels(models);
        if (models.length > 0 && !models.includes(transcriptionModel)) {
          onTranscriptionChange(transcriptionProvider, models[0]);
        }
      }).catch(() => setTModels([]));
  }, [transcriptionProvider]);

  useEffect(() => {
    window.api.listProviderModels('summarization', summarizationProvider)
      .then((models: string[]) => {
        setSModels(models);
        if (models.length > 0 && (!summarizationModel || !models.includes(summarizationModel))) {
          onSummarizationChange(summarizationProvider, models[0]);
        }
      }).catch(() => setSModels([]));
  }, [summarizationProvider]);

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

      {/* Controls */}
      <div style={styles.controls}>
        {/* Language */}
        <ControlRow label="Language">
          <PillGroup items={LANGUAGES.map((l) => ({ id: l.code, label: l.label }))}
            value={language} onChange={onLanguageChange} />
        </ControlRow>

        {/* Transcription */}
        <ControlRow label="Transcription">
          <div style={styles.providerRow}>
            <PillGroup
              items={tProviders.map((p) => ({ id: p.id, label: p.name.replace(' (Local)', '').replace(' Whisper', '') }))}
              value={transcriptionProvider}
              onChange={(id) => {
                const firstModel = tModels[0] || '';
                onTranscriptionChange(id, firstModel);
              }}
            />
            {tModels.length > 0 && (
              <select value={transcriptionModel} style={styles.select}
                onChange={(e) => onTranscriptionChange(transcriptionProvider, e.target.value)}>
                {tModels.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>
        </ControlRow>

        {/* Summarization */}
        <ControlRow label="Summarization">
          <div style={styles.providerRow}>
            <PillGroup
              items={sProviders.map((p) => ({ id: p.id, label: p.name.replace(' (Local)', '') }))}
              value={summarizationProvider}
              onChange={(id) => {
                onSummarizationChange(id, '');
                // Models will reload via useEffect
              }}
            />
            {sModels.length > 0 && (
              <select value={summarizationModel || sModels[0] || ''} style={styles.select}
                onChange={(e) => onSummarizationChange(summarizationProvider, e.target.value)}>
                {sModels.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>
        </ControlRow>
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

// ── Sub-components ──

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={styles.controlRow}>
      <span style={styles.controlLabel}>{label}</span>
      {children}
    </div>
  );
}

function PillGroup({ items, value, onChange }: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div style={styles.pillGroup}>
      {items.map((item, i) => (
        <button key={item.id} onClick={() => onChange(item.id)}
          style={{
            ...styles.pill,
            ...(value === item.id ? styles.pillActive : {}),
            ...(i === items.length - 1 ? { borderRight: 'none' } : {}),
          }}>
          {item.label}
        </button>
      ))}
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
  controls: {
    display: 'flex', flexDirection: 'column', gap: 10,
    padding: '16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-light)', marginBottom: 16,
  },
  controlRow: { display: 'flex', alignItems: 'center', gap: 12 },
  controlLabel: {
    fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const, letterSpacing: '0.05em', minWidth: 90,
  },
  providerRow: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' as const },
  pillGroup: {
    display: 'flex', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', overflow: 'hidden',
  },
  pill: {
    padding: '5px 10px', fontSize: 11, fontWeight: 500,
    background: 'var(--bg)', color: 'var(--text-secondary)',
    border: 'none', borderRight: '1px solid var(--border)',
    cursor: 'pointer', transition: 'all 150ms', whiteSpace: 'nowrap' as const,
  },
  pillActive: { background: 'var(--accent)', color: 'white' },
  select: {
    padding: '5px 8px', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-mono)',
    background: 'var(--bg)', color: 'var(--text-primary)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    cursor: 'pointer', outline: 'none', maxWidth: 180,
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
