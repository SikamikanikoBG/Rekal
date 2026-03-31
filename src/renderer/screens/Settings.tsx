import React, { useState, useEffect } from 'react';

interface Props {
  onSave: () => void;
  onBack: () => void;
}

interface ApiKeys {
  openai?: string;
  anthropic?: string;
  azureSpeechKey?: string;
  azureSpeechRegion?: string;
  azureOpenaiKey?: string;
  azureOpenaiEndpoint?: string;
  azureOpenaiDeployment?: string;
}

export function Settings({ onSave, onBack }: Props) {
  const [keys, setKeys] = useState<ApiKeys>({});
  const [saved, setSaved] = useState('');
  const [validating, setValidating] = useState('');
  const [validationResult, setValidationResult] = useState<Record<string, { valid: boolean; error?: string }>>({});
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaUrlSaved, setOllamaUrlSaved] = useState(false);
  const [ollamaTestLoading, setOllamaTestLoading] = useState(false);
  const [ollamaTestResult, setOllamaTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [modelSaved, setModelSaved] = useState(false);

  useEffect(() => {
    window.api.getConfig().then((cfg: any) => {
      setKeys(cfg.apiKeys || {});
      setSelectedModel(cfg.summarizationModel || '');
    });
    window.api.getOllamaUrl().then((url: string) => setOllamaUrl(url));
    loadOllamaModels();
  }, []);

  async function loadOllamaModels() {
    try {
      const models = await window.api.getOllamaModels();
      setOllamaModels(models);
    } catch { /* Ollama may not be running */ }
  }

  async function saveModel(model: string) {
    setSelectedModel(model);
    await window.api.setConfig({ summarizationModel: model });
    setModelSaved(true);
    setTimeout(() => setModelSaved(false), 1500);
  }

  async function saveKey(key: keyof ApiKeys, value: string) {
    setKeys((k) => ({ ...k, [key]: value }));
    await window.api.setApiKey(key, value);
    setSaved(key);
    setTimeout(() => setSaved(''), 1500);
  }

  async function validate(type: string, providerId: string) {
    setValidating(providerId);
    const result = await window.api.validateProvider(type, providerId);
    setValidationResult((r) => ({ ...r, [providerId]: result }));
    setValidating('');
  }

  return (
    <div className="screen" style={{ maxWidth: 560 }}>
      {/* Header */}
      <div style={styles.header}>
        <button className="btn btn-ghost" onClick={onBack} style={styles.backBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </button>
        <h2 style={styles.title}>Settings</h2>
        <div style={{ width: 60 }} />
      </div>

      {/* Ollama */}
      <Section title="Ollama" hint="Local LLM server for summarization. Change the URL if Ollama runs on another machine.">
        <div style={styles.keyRow}>
          <label style={styles.keyLabel}>Server URL</label>
          <div style={styles.keyInputWrap}>
            <input
              type="text"
              value={ollamaUrl}
              placeholder="http://localhost:11434"
              onChange={(e) => { setOllamaUrl(e.target.value); setOllamaTestResult(null); }}
              onBlur={async () => {
                await window.api.setOllamaUrl(ollamaUrl);
                setOllamaUrlSaved(true);
                setTimeout(() => setOllamaUrlSaved(false), 1500);
              }}
              style={styles.keyInput}
            />
            {ollamaUrlSaved && <span style={styles.savedBadge}>Saved</span>}
          </div>
        </div>
        <div style={styles.testRow}>
          <button className="btn btn-ghost" disabled={ollamaTestLoading}
            style={{ fontSize: 12, padding: '4px 12px' }}
            onClick={async () => {
              setOllamaTestLoading(true);
              setOllamaTestResult(null);
              const result = await window.api.testOllamaConnection(ollamaUrl);
              setOllamaTestResult(result);
              setOllamaTestLoading(false);
            }}>
            {ollamaTestLoading ? 'Testing...' : 'Test Connection'}
          </button>
          {ollamaTestResult && (
            <span style={{ fontSize: 12, color: ollamaTestResult.success ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
              {ollamaTestResult.success ? `\u2713 ${ollamaTestResult.message}` : `\u2717 ${ollamaTestResult.message}`}
            </span>
          )}
        </div>
        <div style={styles.keyRow}>
          <label style={styles.keyLabel}>Summarization Model</label>
          <div style={styles.keyInputWrap}>
            <select
              value={selectedModel}
              onChange={(e) => saveModel(e.target.value)}
              style={{ ...styles.keyInput, cursor: 'pointer' }}
            >
              <option value="">Select a model...</option>
              {ollamaModels.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }} onClick={loadOllamaModels}>
              ↻
            </button>
            {modelSaved && <span style={styles.savedBadge}>Saved</span>}
          </div>
        </div>
      </Section>

      {/* OpenAI */}
      <Section title="OpenAI" hint="Used for Whisper transcription and GPT summarization">
        <KeyInput label="API Key" value={keys.openai || ''} placeholder="sk-..."
          onSave={(v) => saveKey('openai', v)} saved={saved === 'openai'} />
        <TestButton onClick={() => validate('summarization', 'openai')}
          loading={validating === 'openai'} result={validationResult['openai']} />
      </Section>

      {/* Anthropic */}
      <Section title="Anthropic (Claude)" hint="Used for Claude summarization">
        <KeyInput label="API Key" value={keys.anthropic || ''} placeholder="sk-ant-..."
          onSave={(v) => saveKey('anthropic', v)} saved={saved === 'anthropic'} />
        <TestButton onClick={() => validate('summarization', 'claude')}
          loading={validating === 'claude'} result={validationResult['claude']} />
      </Section>

      {/* Azure Speech */}
      <Section title="Azure Speech" hint="Used for Azure transcription">
        <KeyInput label="Speech Key" value={keys.azureSpeechKey || ''} placeholder="Key..."
          onSave={(v) => saveKey('azureSpeechKey', v)} saved={saved === 'azureSpeechKey'} />
        <KeyInput label="Region" value={keys.azureSpeechRegion || ''} placeholder="westeurope"
          onSave={(v) => saveKey('azureSpeechRegion', v)} saved={saved === 'azureSpeechRegion'} masked={false} />
        <TestButton onClick={() => validate('transcription', 'azure-speech')}
          loading={validating === 'azure-speech'} result={validationResult['azure-speech']} />
      </Section>

      {/* Azure OpenAI */}
      <Section title="Azure OpenAI" hint="Used for Azure OpenAI summarization">
        <KeyInput label="API Key" value={keys.azureOpenaiKey || ''} placeholder="Key..."
          onSave={(v) => saveKey('azureOpenaiKey', v)} saved={saved === 'azureOpenaiKey'} />
        <KeyInput label="Endpoint" value={keys.azureOpenaiEndpoint || ''} placeholder="https://your-resource.openai.azure.com"
          onSave={(v) => saveKey('azureOpenaiEndpoint', v)} saved={saved === 'azureOpenaiEndpoint'} masked={false} />
        <KeyInput label="Deployment" value={keys.azureOpenaiDeployment || ''} placeholder="gpt-4o"
          onSave={(v) => saveKey('azureOpenaiDeployment', v)} saved={saved === 'azureOpenaiDeployment'} masked={false} />
        <TestButton onClick={() => validate('summarization', 'azure-openai')}
          loading={validating === 'azure-openai'} result={validationResult['azure-openai']} />
      </Section>

      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <button className="btn btn-primary" onClick={onSave} style={{ width: '100%', padding: '10px 16px' }}>
          Done
        </button>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      <p style={styles.hint}>{hint}</p>
      <div style={styles.sectionBody}>{children}</div>
    </section>
  );
}

function KeyInput({ label, value, placeholder, onSave, saved, masked = true }: {
  label: string; value: string; placeholder: string;
  onSave: (v: string) => void; saved: boolean; masked?: boolean;
}) {
  const [val, setVal] = useState(value);
  const [show, setShow] = useState(!masked);

  useEffect(() => { setVal(value); }, [value]);

  return (
    <div style={styles.keyRow}>
      <label style={styles.keyLabel}>{label}</label>
      <div style={styles.keyInputWrap}>
        <input
          type={show ? 'text' : 'password'}
          value={val}
          placeholder={placeholder}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => { if (val !== value) onSave(val); }}
          style={styles.keyInput}
        />
        {masked && (
          <button style={styles.showBtn} onClick={() => setShow(!show)}>
            {show ? 'Hide' : 'Show'}
          </button>
        )}
        {saved && <span style={styles.savedBadge}>Saved</span>}
      </div>
    </div>
  );
}

function TestButton({ onClick, loading, result }: {
  onClick: () => void;
  loading: boolean;
  result?: { valid: boolean; error?: string };
}) {
  return (
    <div style={styles.testRow}>
      <button className="btn btn-ghost" onClick={onClick} disabled={loading}
        style={{ fontSize: 12, padding: '4px 12px' }}>
        {loading ? 'Testing...' : 'Test Connection'}
      </button>
      {result && (
        <span style={{ fontSize: 12, color: result.valid ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
          {result.valid ? '✓ Connected' : `✗ ${result.error}`}
        </span>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { display: 'flex', alignItems: 'center', gap: 6 },
  title: { fontSize: 18, fontWeight: 600 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: 600, marginBottom: 2 },
  hint: { fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 },
  sectionBody: { display: 'flex', flexDirection: 'column', gap: 8 },
  keyRow: { display: 'flex', flexDirection: 'column', gap: 4 },
  keyLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  keyInputWrap: { display: 'flex', alignItems: 'center', gap: 6 },
  keyInput: {
    flex: 1, padding: '7px 10px', fontSize: 12, fontFamily: 'var(--font-mono)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none',
  },
  showBtn: {
    fontSize: 11, color: 'var(--text-tertiary)', background: 'none', border: 'none',
    cursor: 'pointer', padding: '4px 8px', fontFamily: 'var(--font)',
  },
  savedBadge: {
    fontSize: 11, color: 'var(--green)', fontWeight: 600,
  },
  testRow: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 },
};
