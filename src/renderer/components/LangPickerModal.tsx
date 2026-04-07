import React, { useState, useEffect } from 'react';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export function LangPickerModal({ onConfirm, onCancel }: Props) {
  const [language, setLanguage] = useState('bg-BG');

  useEffect(() => {
    window.api.getConfig().then((cfg: any) => {
      const lang = cfg.language;
      setLanguage(lang && lang !== 'auto' ? lang : 'bg-BG');
    }).catch(() => {});
  }, []);

  async function handleConfirm() {
    await window.api.setConfig({ language });
    onConfirm();
  }

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.popup} onClick={(e) => e.stopPropagation()}>
        <p style={styles.title}>Select language</p>
        <select value={language} style={styles.select} onChange={(e) => setLanguage(e.target.value)} autoFocus>
          <option value="en-US">English</option>
          <option value="bg-BG">Bulgarian</option>
        </select>
        <div style={styles.actions}>
          <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={handleConfirm}>Start recording</button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  popup: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '20px 24px',
    display: 'flex', flexDirection: 'column', gap: 14, minWidth: 260,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  },
  title: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 },
  select: {
    padding: '7px 10px', fontSize: 13, fontFamily: 'var(--font)',
    color: 'var(--text-primary)', background: 'var(--bg-surface)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    cursor: 'pointer', outline: 'none', width: '100%',
  },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 8 },
};
