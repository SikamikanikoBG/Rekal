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
  const [ethicalNotifications, setEthicalNotifications] = useState(true);
  const [notificationInterval, setNotificationInterval] = useState(10);
  // Default providers
  const [tProviders, setTProviders] = useState<{id:string;name:string}[]>([]);
  const [sProviders, setSProviders] = useState<{id:string;name:string}[]>([]);
  const [tProvider, setTProvider] = useState('whisper-local');
  const [tModel, setTModel] = useState('small');
  const [sProvider, setSProvider] = useState('ollama');
  const [tModels, setTModels] = useState<string[]>([]);
  const [sModels, setSModels] = useState<string[]>([]);
  const [tTestResult, setTTestResult] = useState<{valid:boolean;error?:string}|null>(null);
  const [sTestResult, setSTestResult] = useState<{valid:boolean;error?:string}|null>(null);
  const [tTesting, setTTesting] = useState(false);
  const [sTesting, setSTesting] = useState(false);
  const [language, setLanguage] = useState('auto');

  useEffect(() => {
    window.api.getConfig().then((cfg: any) => {
      setKeys(cfg.apiKeys || {});
      setSelectedModel(cfg.summarizationModel || '');
      setEthicalNotifications(cfg.ethicalNotifications !== false);
      setNotificationInterval(cfg.notificationIntervalMin || 10);
      setTProvider(cfg.transcriptionProvider || 'whisper-local');
      setTModel(cfg.transcriptionModel || 'small');
      setSProvider(cfg.summarizationProvider || 'ollama');
      setLanguage(cfg.language || 'auto');
    });
    window.api.getOllamaUrl().then((url: string) => setOllamaUrl(url));
    loadOllamaModels();
    window.api.listProviders().then((p: any) => {
      setTProviders(p.transcription || []);
      setSProviders(p.summarization || []);
    }).catch(() => {});
  }, []);

  // Load models when provider changes
  useEffect(() => {
    window.api.listProviderModels('transcription', tProvider)
      .then((m: string[]) => setTModels(m)).catch(() => setTModels([]));
  }, [tProvider]);
  useEffect(() => {
    window.api.listProviderModels('summarization', sProvider)
      .then((m: string[]) => setSModels(m)).catch(() => setSModels([]));
  }, [sProvider]);

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

      {/* Default Providers */}
      <Section title="Default Providers" hint="Choose which services to use for transcription and summarization. These apply to all recordings and chat.">
        <div style={styles.keyRow}>
          <label style={styles.keyLabel}>Transcription Provider</label>
          <div style={styles.keyInputWrap}>
            <select value={tProvider} style={{ ...styles.keyInput, cursor: 'pointer' }}
              onChange={async (e) => {
                setTProvider(e.target.value);
                setTTestResult(null);
                await window.api.setConfig({ transcriptionProvider: e.target.value });
              }}>
              {tProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {tModels.length > 0 && (
              <select value={tModel} style={{ ...styles.keyInput, cursor: 'pointer', maxWidth: 120 }}
                onChange={async (e) => {
                  setTModel(e.target.value);
                  await window.api.setConfig({ transcriptionModel: e.target.value });
                }}>
                {tModels.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>
          <div style={styles.testRow}>
            <button className="btn btn-ghost" disabled={tTesting} style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={async () => {
                setTTesting(true); setTTestResult(null);
                const result = await window.api.validateProvider('transcription', tProvider);
                setTTestResult(result); setTTesting(false);
              }}>
              {tTesting ? 'Testing...' : 'Test'}
            </button>
            {tTestResult && (
              <span style={{ fontSize: 12, color: tTestResult.valid ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                {tTestResult.valid ? '✓ Ready' : `✗ ${tTestResult.error}`}
              </span>
            )}
          </div>
        </div>
        <div style={styles.keyRow}>
          <label style={styles.keyLabel}>Summarization Provider</label>
          <div style={styles.keyInputWrap}>
            <select value={sProvider} style={{ ...styles.keyInput, cursor: 'pointer' }}
              onChange={async (e) => {
                setSProvider(e.target.value);
                setSTestResult(null);
                await window.api.setConfig({ summarizationProvider: e.target.value });
              }}>
              {sProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {sModels.length > 0 && (
              <select value={selectedModel || sModels[0] || ''} style={{ ...styles.keyInput, cursor: 'pointer', maxWidth: 140 }}
                onChange={(e) => saveModel(e.target.value)}>
                {sModels.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>
          <div style={styles.testRow}>
            <button className="btn btn-ghost" disabled={sTesting} style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={async () => {
                setSTesting(true); setSTestResult(null);
                const result = await window.api.validateProvider('summarization', sProvider);
                setSTestResult(result); setSTesting(false);
              }}>
              {sTesting ? 'Testing...' : 'Test'}
            </button>
            {sTesting === false && sTestResult && (
              <span style={{ fontSize: 12, color: sTestResult.valid ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                {sTestResult.valid ? '✓ Ready' : `✗ ${sTestResult.error}`}
              </span>
            )}
          </div>
        </div>
        <div style={styles.keyRow}>
          <label style={styles.keyLabel}>Transcription Language</label>
          <div style={styles.keyInputWrap}>
            <select value={language} style={{ ...styles.keyInput, cursor: 'pointer' }}
              onChange={async (e) => {
                setLanguage(e.target.value);
                await window.api.setConfig({ language: e.target.value });
              }}>
              <option value="auto">Auto-detect</option>
              <option value="en-US">English</option>
              <option value="bg-BG">Bulgarian</option>
            </select>
          </div>
        </div>
      </Section>

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
      </Section>

      {/* Ethical Recording Notifications */}
      <Section title="Ethical Notifications" hint="Voice announcements when recording starts, stops, and periodically during recording. Ensures all meeting participants know they are being recorded — even if the PC is muted.">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 13, fontWeight: 500 }}>Enable voice notifications</label>
          <label style={styles.toggle}>
            <input
              type="checkbox"
              checked={ethicalNotifications}
              onChange={async (e) => {
                const val = e.target.checked;
                setEthicalNotifications(val);
                await window.api.setConfig({ ethicalNotifications: val });
              }}
              style={styles.toggleInput}
            />
            <span style={{
              ...styles.toggleTrack,
              background: ethicalNotifications ? 'var(--accent)' : 'var(--border)',
            }}>
              <span style={{
                ...styles.toggleThumb,
                transform: ethicalNotifications ? 'translateX(16px)' : 'translateX(0)',
              }} />
            </span>
          </label>
        </div>
        <div style={styles.keyRow}>
          <label style={styles.keyLabel}>Reminder interval (minutes)</label>
          <div style={styles.keyInputWrap}>
            <select
              value={notificationInterval}
              onChange={async (e) => {
                const val = parseInt(e.target.value);
                setNotificationInterval(val);
                await window.api.setConfig({ notificationIntervalMin: val });
              }}
              style={{ ...styles.keyInput, cursor: 'pointer', maxWidth: 120 }}
              disabled={!ethicalNotifications}
            >
              <option value={0}>Off</option>
              <option value={5}>5 min</option>
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
            </select>
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
  toggle: { position: 'relative' as const, display: 'inline-block', cursor: 'pointer' },
  toggleInput: { position: 'absolute' as const, opacity: 0, width: 0, height: 0 },
  toggleTrack: {
    display: 'inline-block', width: 36, height: 20, borderRadius: 10,
    transition: 'background 0.2s ease', position: 'relative' as const,
  },
  toggleThumb: {
    display: 'block', width: 16, height: 16, borderRadius: '50%',
    background: 'white', position: 'absolute' as const, top: 2, left: 2,
    transition: 'transform 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  },
};
