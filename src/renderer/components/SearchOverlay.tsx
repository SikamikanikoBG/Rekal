import React, { useState, useEffect, useRef, useCallback } from 'react';
import { tokens } from '../styles/tokens';

interface SearchResult {
  id: string;
  type: 'meeting' | 'action' | 'transcript';
  title: string;
  subtitle: string;
  snippet: string;
  meetingId: string;
  highlight?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onViewMeeting: (id: string) => void;
}

export function SearchOverlay({ open, onClose, onViewMeeting }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    try {
      const meetings = await window.api.searchMeetings(q);
      const searchResults: SearchResult[] = [];
      const lowerQ = q.toLowerCase();

      for (const m of meetings) {
        // Meeting title match
        searchResults.push({
          id: `meeting-${m.id}`,
          type: 'meeting',
          title: m.title,
          subtitle: new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
          snippet: m.notes?.summary?.substring(0, 120) || '',
          meetingId: m.id,
        });

        // Action items match
        if (m.notes?.actionItems) {
          for (const action of m.notes.actionItems) {
            if (action.text?.toLowerCase().includes(lowerQ)) {
              searchResults.push({
                id: `action-${m.id}-${action.id}`,
                type: 'action',
                title: action.text,
                subtitle: `${action.done ? 'Completed' : 'Open'} - ${m.title}`,
                snippet: '',
                meetingId: m.id,
              });
            }
          }
        }

        // Transcript matches
        if (m.transcript?.segments) {
          for (const seg of m.transcript.segments) {
            if (seg.text?.toLowerCase().includes(lowerQ)) {
              searchResults.push({
                id: `transcript-${m.id}-${seg.start}`,
                type: 'transcript',
                title: seg.text.substring(0, 100),
                subtitle: m.title,
                snippet: formatTime(seg.start),
                meetingId: m.id,
              });
              break; // Only first transcript match per meeting
            }
          }
        }
      }

      setResults(searchResults.slice(0, 20));
      setSelectedIndex(0);
    } catch (e) {
      console.error('Search failed:', e);
    }
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    }
    if (e.key === 'Enter' && results[selectedIndex]) {
      onViewMeeting(results[selectedIndex].meetingId);
      onClose();
    }
  }

  function handleSelect(result: SearchResult) {
    onViewMeeting(result.meetingId);
    onClose();
  }

  if (!open) return null;

  // Group results
  const meetingResults = results.filter((r) => r.type === 'meeting');
  const actionResults = results.filter((r) => r.type === 'action');
  const transcriptResults = results.filter((r) => r.type === 'transcript');

  let flatIndex = 0;

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal} className="fade-in">
        {/* Search input */}
        <div style={styles.inputWrap}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={tokens.colors.textTertiary} strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search meetings, tasks, transcripts..."
            style={styles.input}
          />
          <kbd style={styles.kbd}>ESC</kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={styles.results}>
            {meetingResults.length > 0 && (
              <ResultGroup label="Meetings">
                {meetingResults.map((r) => {
                  const idx = flatIndex++;
                  return (
                    <ResultItem
                      key={r.id}
                      result={r}
                      selected={selectedIndex === idx}
                      onClick={() => handleSelect(r)}
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        </svg>
                      }
                    />
                  );
                })}
              </ResultGroup>
            )}
            {actionResults.length > 0 && (
              <ResultGroup label="Action Items">
                {actionResults.map((r) => {
                  const idx = flatIndex++;
                  return (
                    <ResultItem
                      key={r.id}
                      result={r}
                      selected={selectedIndex === idx}
                      onClick={() => handleSelect(r)}
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 11l3 3L22 4" />
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                      }
                    />
                  );
                })}
              </ResultGroup>
            )}
            {transcriptResults.length > 0 && (
              <ResultGroup label="Transcript Matches">
                {transcriptResults.map((r) => {
                  const idx = flatIndex++;
                  return (
                    <ResultItem
                      key={r.id}
                      result={r}
                      selected={selectedIndex === idx}
                      onClick={() => handleSelect(r)}
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      }
                    />
                  );
                })}
              </ResultGroup>
            )}
          </div>
        )}

        {/* Empty state */}
        {query.trim() && results.length === 0 && (
          <div style={styles.noResults}>
            <p style={styles.noResultsText}>No results for "{query}"</p>
          </div>
        )}

        {/* Hint */}
        {!query.trim() && (
          <div style={styles.hint}>
            <p style={styles.hintText}>Type to search across all meetings, action items, and transcripts</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={styles.resultGroup}>
      <p style={styles.resultGroupLabel}>{label}</p>
      {children}
    </div>
  );
}

function ResultItem({ result, selected, onClick, icon }: {
  result: SearchResult;
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.resultItem,
        background: selected ? tokens.colors.accentSubtle : 'transparent',
      }}
    >
      <span style={{ ...styles.resultIcon, color: selected ? tokens.colors.accent : tokens.colors.textTertiary }}>
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={styles.resultTitle}>{result.title}</p>
        <p style={styles.resultSubtitle}>{result.subtitle}</p>
      </div>
      {result.snippet && (
        <span style={styles.resultSnippet}>{result.snippet}</span>
      )}
    </button>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 2000,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 80,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: tokens.colors.bgSurface,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.xl,
    boxShadow: tokens.shadow.lg,
    width: 560,
    maxWidth: '90vw',
    maxHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: `${tokens.spacing.lg}px ${tokens.spacing.xl}px`,
    borderBottom: `1px solid ${tokens.colors.borderSubtle}`,
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: tokens.fontSize.xl,
    fontFamily: 'var(--font)',
    color: tokens.colors.text,
  },
  kbd: {
    padding: '2px 6px',
    fontSize: tokens.fontSize.xs,
    fontFamily: 'var(--font-mono)',
    color: tokens.colors.textTertiary,
    background: tokens.colors.bgSurfaceHover,
    borderRadius: tokens.radius.sm,
    border: `1px solid ${tokens.colors.border}`,
  },
  results: {
    overflowY: 'auto',
    padding: `${tokens.spacing.sm}px 0`,
  },
  resultGroup: {
    padding: `${tokens.spacing.xs}px 0`,
  },
  resultGroupLabel: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: `${tokens.spacing.xs}px ${tokens.spacing.xl}px`,
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: `${tokens.spacing.sm}px ${tokens.spacing.xl}px`,
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    textAlign: 'left',
    transition: `background ${tokens.transition.fast}`,
  },
  resultIcon: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  resultTitle: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.text,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  resultSubtitle: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textTertiary,
    marginTop: 1,
  },
  resultSnippet: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textTertiary,
    fontFamily: 'var(--font-mono)',
    flexShrink: 0,
  },
  noResults: {
    padding: `${tokens.spacing.xl}px`,
    textAlign: 'center',
  },
  noResultsText: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textTertiary,
  },
  hint: {
    padding: `${tokens.spacing.xl}px`,
    textAlign: 'center',
  },
  hintText: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textTertiary,
  },
};
