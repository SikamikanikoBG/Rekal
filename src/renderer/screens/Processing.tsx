import React, { useState, useEffect } from 'react';

interface CostInfo {
  provider: string;
  model: string;
  serviceType: 'stt' | 'llm';
  inputTokens?: number;
  outputTokens?: number;
  audioSeconds?: number;
  costUsd: number;
}

interface Props {
  audioPath: string;
  onComplete: (transcript: any, notes: any, costInfos?: CostInfo[]) => void;
  onError: () => void;
}

type Step = 'transcribing' | 'summarizing' | 'done';

export function Processing({ audioPath, onComplete, onError }: Props) {
  const [step, setStep] = useState<Step>('transcribing');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Starting transcription...');
  const [error, setError] = useState('');
  const [managedMode, setManagedMode] = useState(false);
  const [providerInfo, setProviderInfo] = useState({ tProvider: '', tModel: '', sProvider: '', sModel: '' });

  useEffect(() => {
    window.api.getManagedMode().then((source: string) => {
      setManagedMode(source === 'file' || source === 'remote');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    run();
  }, []);

  async function run() {
    try {
      // Read providers from config
      const cfg = await window.api.getConfig();
      const transcriptionProvider = cfg.transcriptionProvider || 'whisper-local';
      const transcriptionModel = cfg.transcriptionModel || 'small';
      const summarizationProvider = cfg.summarizationProvider || 'ollama';
      const summarizationModel = cfg.summarizationModel || '';
      const language = cfg.language || 'auto';
      setProviderInfo({ tProvider: transcriptionProvider, tModel: transcriptionModel, sProvider: summarizationProvider, sModel: summarizationModel });

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
        setError(transcriptResult.error || 'Transcription failed');
        return;
      }

      const costInfos: CostInfo[] = [];
      if (transcriptResult.costInfo) {
        costInfos.push(transcriptResult.costInfo);
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
        setError(notesResult.error || 'Summarization failed');
        return;
      }

      if (notesResult.costInfo) {
        costInfos.push(notesResult.costInfo);
      }

      setStep('done');
      setProgress(100);
      onComplete(transcriptResult.transcript, notesResult.notes, costInfos);
    } catch (e) {
      setError((e as Error).message || 'An unexpected error occurred');
    }
  }

  if (error) {
    return (
      <div className="screen-centered">
        <div style={styles.card} className="fade-in">
          <div style={styles.errorIcon}>!</div>
          <h3 style={styles.errorTitle}>Something went wrong</h3>
          <p style={styles.errorText}>
            {managedMode
              ? 'Could not connect to the service. Please contact your IT administrator.'
              : error}
          </p>
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
            ? `Transcribing with ${providerInfo.tProvider} (${providerInfo.tModel})...`
            : `Generating notes with ${providerInfo.sProvider} (${providerInfo.sModel})...`}
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
