import React, { useState, useEffect, useRef } from 'react';
import { MicButton } from '../components/MicButton';
import { Waveform } from '../components/Waveform';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

interface Props {
  onStop: (audioPath: string, duration: number, transcript: string) => void;
  onCancel: () => void;
}

export function Recording({ onStop, onCancel }: Props) {
  const { isRecording, duration, audioLevel, startRecording, stopRecording, error } = useAudioRecorder();
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [stopping, setStopping] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  // Sequential chunk queue — ensures transcript parts stay in order
  const transcriptPartsRef = useRef<string[]>([]);
  const chunkQueueRef = useRef<Promise<void>>(Promise.resolve());
  const languageRef = useRef<string>('bg-BG');

  useEffect(() => {
    window.api.getConfig().then((cfg: any) => {
      languageRef.current = cfg.language || 'bg-BG';
    }).catch(() => {});
  }, []);

  function enqueueChunk(wav: Blob) {
    setTranscribing(true);
    chunkQueueRef.current = chunkQueueRef.current.then(async () => {
      try {
        const buffer = await wav.arrayBuffer();
        const text = await window.api.transcribeChunk(
          Array.from(new Uint8Array(buffer)),
          languageRef.current
        );
        if (text) transcriptPartsRef.current.push(text);
      } catch (e) {
        console.warn('Chunk transcription error:', e);
      }
    });
  }

  useEffect(() => {
    window.api.tts.recordingStarted().finally(() => {
      startRecording(enqueueChunk);
    });
  }, []);

  // Periodic "recording in progress" reminder
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    window.api.getConfig().then((cfg: any) => {
      if (cfg.ethicalNotifications && cfg.notificationIntervalMin > 0) {
        interval = setInterval(() => {
          window.api.tts.recordingInProgress();
        }, cfg.notificationIntervalMin * 60 * 1000);
      }
    });
    return () => { if (interval) clearInterval(interval); };
  }, []);

  async function handleStop() {
    if (stopping) return;
    setStopping(true);
    window.api.tts.recordingStopped();
    try {
      const blob = await stopRecording(); // also dispatches final chunk via onChunk

      // Wait for all queued chunk transcriptions to finish
      await chunkQueueRef.current;
      setTranscribing(false);

      const buffer = await blob.arrayBuffer();
      const audioPath = await window.api.saveAudioBlob(
        Array.from(new Uint8Array(buffer)),
        blob.type
      );
      const transcript = transcriptPartsRef.current.join(' ').trim();
      onStop(audioPath, duration, transcript);
    } catch (e) {
      console.error('Failed to stop recording:', e);
      onCancel();
    }
  }

  function handleCancel() {
    window.api.tts.recordingStopped();
    stopRecording().catch(() => {});
    onCancel();
  }

  function addBookmark() {
    setBookmarks((b) => [...b, duration]);
  }

  const mins = Math.floor(duration / 60).toString().padStart(2, '0');
  const secs = (duration % 60).toString().padStart(2, '0');

  if (error) {
    return (
      <div className="screen-centered">
        <div style={{ textAlign: 'center', maxWidth: 360 }} className="fade-in">
          <div style={styles.errorIcon}>!</div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 16 }}>Microphone Error</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>{error}</p>
          <button className="btn btn-primary" onClick={onCancel} style={{ marginTop: 20 }}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-centered">
      <div style={styles.container} className="fade-in">
        {/* Timer */}
        <div style={styles.timer}>
          <div style={styles.liveDot} />
          <span style={styles.timerText}>{mins}:{secs}</span>
        </div>

        {/* Waveform */}
        <Waveform audioLevel={audioLevel} />

        {/* Live transcription indicator */}
        {transcribing && (
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>
            Transcribing...
          </p>
        )}

        {/* Controls */}
        <div style={styles.controls}>
          <button className="btn btn-ghost" onClick={handleCancel} style={styles.cancelBtn}>
            Cancel
          </button>

          <MicButton state="recording" onClick={handleStop} />

          <button className="btn btn-ghost" onClick={addBookmark} style={styles.bookmarkBtn} title="Bookmark this moment">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
            {bookmarks.length > 0 && <span style={styles.bookmarkCount}>{bookmarks.length}</span>}
          </button>
        </div>

        {/* Bookmarks */}
        {bookmarks.length > 0 && (
          <div style={styles.bookmarksList}>
            {bookmarks.map((t, i) => (
              <span key={i} style={styles.bookmarkTag}>
                {Math.floor(t / 60).toString().padStart(2, '0')}:
                {(t % 60).toString().padStart(2, '0')}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 40,
    width: '100%',
    maxWidth: 400,
  },
  timer: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: 'var(--red)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  timerText: {
    fontSize: 48,
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '-0.02em',
    color: 'var(--text-primary)',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 32,
  },
  cancelBtn: {
    fontSize: 13,
  },
  bookmarkBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
  },
  bookmarkCount: {
    fontSize: 11,
    fontWeight: 600,
    background: 'var(--accent)',
    color: 'white',
    width: 18,
    height: 18,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarksList: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  bookmarkTag: {
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    padding: '4px 8px',
    background: 'var(--accent-light)',
    color: 'var(--accent)',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 500,
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'var(--red-light)',
    color: 'var(--red)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 700,
  },
};
