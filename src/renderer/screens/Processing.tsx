import React, { useState, useEffect } from 'react';

interface Props {
  audioPath: string;
  transcriptionProvider: string;
  transcriptionModel: string;
  summarizationProvider: string;
  summarizationModel: string;
  language: string;
  onComplete: (transcript: any, notes: any) => void;
  onError: () => void;
}

type Step = 'transcribing' | 'summarizing' | 'done';

export function Processing({
  audioPath, transcriptionProvider, transcriptionModel,
  summarizationProvider, summarizationModel, language, onComplete, onError,
}: Props) {
  const [step, setStep] = useState<Step>('transcribing');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Starting transcription...');
  const [error, setError] = useState('');

  useEffect(() => {
    run();
  }, []);

  async function run() {
    // Step 1: Transcribe
    const cleanupTranscript = window.api.onTranscriptionProgress(
      (data: { percent: number; text: string }) => {
        setProgress(data.percent);
        setStatusText(data.text || 'Transcribing...');
      }
    );

    const transcriptResult = await window.api.transcribe(
      transcriptionProvider, audioPath, transcriptionModel, language
    );
    cleanupTranscript();

    if (!transcriptResult.success) {
      setError(transcriptResult.error);
      return;
    }

    // Step 2: Summarize
    setStep('summarizing');
    setProgress(0);
    setStatusText('Generating meeting notes...');

    const cleanupSummary = window.api.onSummaryProgress((data: { text: string }) => {
      const words = data.text.split(' ').length;
      setProgress(Math.min(95, words * 2));
      setStatusText('Writing notes...');
    });

    const notesResult = await window.api.summarize(
      summarizationProvider, transcriptResult.transcript, summarizationModel, language
    );
    cleanupSummary();

    if (!notesResult.success) {
      setError(notesResult.error);
      return;
    }

    setStep('done');
    setProgress(100);
    onComplete(transcriptResult.transcript, notesResult.notes);
  }

  if (error) {
    return (
      <div className="screen-centered">
        <div style={styles.card} className="fade-in">
          <div style={styles.errorIcon}>!</div>
          <h3 style={styles.errorTitle}>Something went wrong</h3>
          <p style={styles.errorText}>{error}</p>
          <button className="btn btn-primary" onClick={onError} style={{ marginTop: 16 }}>
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-centered">
      <div style={styles.card} className="fade-in">
        <div style={styles.steps}>
          <StepDot label="Transcribe" state={step === 'transcribing' ? 'active' : step === 'summarizing' || step === 'done' ? 'done' : 'pending'} />
          <div style={styles.stepLine} />
          <StepDot label="AI Notes" state={step === 'summarizing' ? 'active' : step === 'done' ? 'done' : 'pending'} />
        </div>
        <div style={styles.progressSection}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
          <p style={styles.statusText}>{statusText}</p>
        </div>
        <p style={styles.hint}>
          {step === 'transcribing'
            ? `Transcribing with ${transcriptionProvider} (${transcriptionModel})...`
            : `Generating notes with ${summarizationProvider} (${summarizationModel})...`}
        </p>
      </div>
    </div>
  );
}

function StepDot({ label, state }: { label: string; state: 'pending' | 'active' | 'done' }) {
  return (
    <div style={styles.stepItem}>
      <div style={{ ...styles.dot, ...(state === 'active' ? styles.dotActive : {}), ...(state === 'done' ? styles.dotDone : {}) }}>
        {state === 'done' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>}
      </div>
      <span style={{ ...styles.stepLabel, color: state === 'pending' ? 'var(--text-tertiary)' : 'var(--text-primary)', fontWeight: state === 'active' ? 600 : 400 }}>{label}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, width: 380, maxWidth: '90vw' },
  steps: { display: 'flex', alignItems: 'center', gap: 0, width: '100%', justifyContent: 'center' },
  stepItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  dot: { width: 28, height: 28, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 300ms ease' },
  dotActive: { background: 'var(--accent)', boxShadow: '0 0 0 6px rgba(79, 70, 229, 0.15)', animation: 'pulse 2s ease-in-out infinite' },
  dotDone: { background: 'var(--green)' },
  stepLine: { width: 80, height: 2, background: 'var(--border)', margin: '0 16px', marginBottom: 24 },
  stepLabel: { fontSize: 12, transition: 'all 150ms' },
  progressSection: { width: '100%', display: 'flex', flexDirection: 'column', gap: 10 },
  progressBar: { height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'var(--accent)', borderRadius: 2, transition: 'width 300ms ease' },
  statusText: { fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' },
  hint: { fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' },
  errorIcon: { width: 48, height: 48, borderRadius: '50%', background: 'var(--red-light)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700 },
  errorTitle: { fontSize: 16, fontWeight: 600, marginTop: 8 },
  errorText: { fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 320, lineHeight: 1.5 },
};
