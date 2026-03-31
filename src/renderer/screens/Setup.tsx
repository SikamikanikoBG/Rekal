import React, { useState, useEffect } from 'react';

interface Props {
  onComplete: () => void;
}

interface DepStatus {
  name: string;
  found: boolean;
  version?: string;
  details?: string;
}

interface ScanResult {
  whisperBin: DepStatus;
  whisperModel: DepStatus;
  ollama: DepStatus;
  ollamaRunning: boolean;
  ollamaModels: string[];
}

type Phase = 'scanning' | 'results' | 'installing' | 'ready';

export function Setup({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('scanning');
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [installProgress, setInstallProgress] = useState({ step: '', detail: '', percent: 0 });
  const [error, setError] = useState('');
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    runScan();
  }, []);

  async function runScan() {
    setPhase('scanning');
    setError('');
    try {
      const result: ScanResult = await window.api.scanDependencies();
      setScan(result);

      const allReady = result.whisperBin.found && result.whisperModel.found && result.ollama.found;

      if (allReady && result.ollamaModels.length > 0) {
        onComplete();
        return;
      } else {
        setPhase('results');
      }
    } catch (e) {
      setError(`Scan failed: ${(e as Error).message}`);
      setPhase('results');
    }
  }

  async function handleInstall() {
    if (!scan) return;
    setPhase('installing');

    const cleanup = window.api.onInstallProgress((data: typeof installProgress) => {
      setInstallProgress(data);
    });

    const result = await window.api.installMissing(scan);
    cleanup();

    if (result.success) {
      const newScan = await window.api.scanDependencies();
      setScan(newScan);
      setModels(newScan.ollamaModels);
      if (newScan.ollamaModels.length > 0) { onComplete(); return; }
      setPhase('results');
    } else {
      setError(result.error || 'Installation failed');
      setPhase('results');
    }
  }

  const whisperReady = scan ? scan.whisperBin.found && scan.whisperModel.found : false;
  const ollamaReady = scan ? scan.ollama.found && scan.ollamaRunning : false;
  const needsInstall = scan ? (!scan.whisperBin.found || !scan.whisperModel.found) : false;

  return (
    <div className="screen-centered">
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Rekal</h1>
          <p style={styles.subtitle}>Total Recall for Your Meetings</p>
        </div>

        {/* Scanning */}
        {phase === 'scanning' && (
          <div style={styles.section} className="fade-in">
            <div style={styles.spinner} />
            <p style={styles.statusText}>Scanning your system...</p>
          </div>
        )}

        {/* Results */}
        {(phase === 'results' || phase === 'installing') && scan && (
          <div style={styles.section} className="fade-in">
            <DepRow dep={scan.whisperBin} />
            <DepRow dep={scan.whisperModel} />
            <DepRow dep={scan.ollama} />
            <DepRow dep={{
              name: 'Ollama Status',
              found: scan.ollamaRunning,
              details: scan.ollamaRunning ? `${scan.ollamaModels.length} model(s) available` : 'Not running',
            }} />
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}
              onClick={() => onComplete()}
            >
              Skip — I'm using cloud providers
            </button>

            {error && <p style={styles.error}>{error}</p>}

            {phase === 'installing' ? (
              <div style={styles.progressWrap}>
                <p style={styles.progressStep}>{installProgress.step}</p>
                <p style={styles.progressDetail}>{installProgress.detail}</p>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${installProgress.percent}%` }} />
                </div>
              </div>
            ) : (
              <div style={styles.actions}>
                {needsInstall && (
                  <button className="btn btn-primary" onClick={handleInstall}>
                    Download Missing Components
                  </button>
                )}
                {!scan.ollama.found && (
                  <p style={styles.hint}>
                    Install <a href="https://ollama.com" style={styles.link}>Ollama</a> and pull a model to continue.
                  </p>
                )}
                {scan.ollama.found && !scan.ollamaRunning && (
                  <p style={styles.hint}>Start Ollama and pull a model, then re-scan.</p>
                )}
                {scan.ollamaRunning && scan.ollamaModels.length === 0 && (
                  <div style={styles.emptyModels}>
                    <p style={styles.hint}>Ollama is running but has no models. Pull one:</p>
                    <code style={styles.code}>ollama pull mistral</code>
                  </div>
                )}
                {scan.ollamaModels.length > 0 && whisperReady && (
                  <button className="btn btn-primary" onClick={() => onComplete()}>
                    Continue
                  </button>
                )}
                <button className="btn btn-ghost" onClick={runScan}>Re-scan</button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function DepRow({ dep }: { dep: DepStatus }) {
  return (
    <div style={styles.depRow}>
      <span style={{ ...styles.depDot, background: dep.found ? 'var(--green)' : 'var(--red)' }} />
      <span style={styles.depName}>{dep.name}</span>
      {dep.found ? (
        <span style={styles.depVersion}>{dep.version || 'ready'}</span>
      ) : (
        <span style={styles.depMissing}>{dep.details || 'not found'}</span>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    padding: 40,
    width: 460,
    maxWidth: '90vw',
  },
  header: { textAlign: 'center', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' },
  subtitle: { fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 },
  section: { display: 'flex', flexDirection: 'column', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: 600, marginBottom: 4 },
  spinner: {
    width: 32, height: 32,
    border: '3px solid var(--border)', borderTopColor: 'var(--accent)',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    margin: '16px auto',
  },
  statusText: { textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 },
  depRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)',
  },
  depDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  depName: { fontWeight: 500, flex: 1 },
  depVersion: { fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' },
  depMissing: { fontSize: 12, color: 'var(--red)', fontWeight: 500, maxWidth: 180, textAlign: 'right' as const },
  error: {
    color: 'var(--red)', fontSize: 13, padding: '8px 12px',
    background: 'var(--red-light)', borderRadius: 'var(--radius-sm)', marginTop: 8,
  },
  actions: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, alignItems: 'center' },
  hint: { fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' },
  link: { color: 'var(--accent)', textDecoration: 'underline' },
  progressWrap: { marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 },
  progressStep: { fontWeight: 600, fontSize: 13 },
  progressDetail: { fontSize: 12, color: 'var(--text-secondary)' },
  progressBar: { height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', background: 'var(--accent)', borderRadius: 3, transition: 'width 300ms ease' },
  emptyModels: { textAlign: 'center', padding: '20px 0' },
  code: {
    display: 'inline-block', background: 'var(--bg)',
    padding: '6px 12px', borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-mono)', fontSize: 13, marginTop: 8,
  },
};
