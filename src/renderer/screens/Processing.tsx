import React, { useState, useEffect, useRef } from 'react';

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
  prebuiltTranscript?: string;
  failedSessionId?: string;
  onComplete: (transcript: any, notes: any, costInfos?: CostInfo[]) => void;
  onError: () => void;
}

type Step = 'transcribing' | 'summarizing' | 'done';

export function Processing({ audioPath, prebuiltTranscript, failedSessionId, onComplete, onError }: Props) {
  const [step, setStep] = useState<Step>('transcribing');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Starting transcription...');
  const [error, setError] = useState('');
  const [failedStep, setFailedStep] = useState<'transcription' | 'summarization' | null>(null);
  const [managedMode, setManagedMode] = useState(false);
  const [providerInfo, setProviderInfo] = useState({ tProvider: '', tModel: '', sProvider: '', sModel: '' });
  const transcriptRef = useRef<any>(null);
  const costInfosRef = useRef<CostInfo[]>([]);

  useEffect(() => {
    window.api.getManagedMode().then((source: string) => {
      setManagedMode(source === 'file' || source === 'remote');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    run(false);
  }, []);

  async function run(skipTranscription = false) {
    setError('');
    setFailedStep(null);
    try {
      // Read providers from config
      const cfg = await window.api.getConfig();
      const transcriptionProvider = cfg.transcriptionProvider || 'whisper-local';
      const transcriptionModel = cfg.transcriptionModel || 'small';
      const summarizationProvider = cfg.summarizationProvider || 'ollama';
      const summarizationModel = cfg.summarizationModel || '';
      const language = cfg.language || 'auto';
      setProviderInfo({ tProvider: transcriptionProvider, tModel: transcriptionModel, sProvider: summarizationProvider, sModel: summarizationModel });

      // Step 1: Transcribe (skip if already done during recording or retrying summarization)
      const costInfos: CostInfo[] = [...costInfosRef.current];
      let transcriptResult: any;

      if (skipTranscription && transcriptRef.current) {
        transcriptResult = { success: true, transcript: transcriptRef.current };
      } else if (prebuiltTranscript) {
        setStep('transcribing');
        setProgress(100);
        setStatusText('Transcription ready');
        transcriptResult = {
          success: true,
          transcript: { segments: [{ start: 0, end: 0, text: prebuiltTranscript }], language, duration: 0 },
        };
      } else {
        setStep('transcribing');
        setProgress(0);
        setStatusText('Starting transcription...');
        const cleanupTranscript = window.api.onTranscriptionProgress(
          (data: { percent: number; text: string }) => {
            setProgress(data.percent);
            setStatusText(data.text || 'Transcribing...');
          }
        );
        transcriptResult = await window.api.transcribe(
          transcriptionProvider, audioPath, transcriptionModel, language
        );
        cleanupTranscript();

        if (!transcriptResult.success) {
          const errMsg = transcriptResult.error || 'Transcription failed';
          setFailedStep('transcription');
          setError(errMsg);
          const sid = failedSessionId || crypto.randomUUID();
          await window.api.failedSessions.save({ id: sid, audioPath, transcript: null, failedStep: 'transcription', errorMessage: errMsg });
          return;
        }
        if (transcriptResult.costInfo) costInfos.push(transcriptResult.costInfo);
      }

      // Save transcript so retry can skip this step
      transcriptRef.current = transcriptResult.transcript;
      costInfosRef.current = costInfos;

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
        const errMsg = notesResult.error || 'Summarization failed';
        setFailedStep('summarization');
        setError(errMsg);
        const sid = failedSessionId || crypto.randomUUID();
        await window.api.failedSessions.save({ id: sid, audioPath, transcript: transcriptResult.transcript, failedStep: 'summarization', errorMessage: errMsg });
        return;
      }

      if (notesResult.costInfo) {
        costInfos.push(notesResult.costInfo);
      }

      // Clean up failed session record if this was a retry
      if (failedSessionId) {
        window.api.failedSessions.delete(failedSessionId).catch(() => {});
      }

      setStep('done');
      setProgress(100);
      onComplete(transcriptResult.transcript, notesResult.notes, costInfos);
    } catch (e) {
      setError((e as Error).message || 'An unexpected error occurred');
    }
  }

  async function handleSaveTranscript() {
    const transcript = transcriptRef.current;
    if (!transcript) return;
    const text = transcript.segments
      ? transcript.segments.map((s: any) => s.text).join(' ').trim()
      : String(transcript);
    const date = new Date().toISOString().slice(0, 10);
    await window.api.saveTextFile(text, `transcript-${date}.txt`);
  }

  if (error) {
    return (
      <div className="screen-centered">
        <div style={styles.card} className="fade-in">
          <div style={styles.errorIcon}>!</div>
          <h3 style={styles.errorTitle}>
            {failedStep === 'summarization' ? 'Notes generation failed' : 'Something went wrong'}
          </h3>
          <p style={styles.errorText}>
            {managedMode
              ? 'Could not connect to the service. Please contact your IT administrator.'
              : error}
          </p>
          <div style={styles.errorActions}>
            {failedStep === 'summarization' ? (
              <>
                <button className="btn btn-primary" onClick={() => run(true)}>
                  Try again
                </button>
                <button className="btn btn-secondary" onClick={handleSaveTranscript}>
                  Save transcript
                </button>
                <button className="btn btn-ghost" onClick={onError} style={{ fontSize: 13 }}>
                  Back to home
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={onError}>
                Back to home
              </button>
            )}
          </div>
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
            ? prebuiltTranscript
              ? 'Transcript ready from live recording'
              : `Transcribing with ${providerInfo.tProvider} (${providerInfo.tModel})...`
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
  errorActions: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 16 },
};
