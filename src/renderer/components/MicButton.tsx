import React from 'react';

interface Props {
  state: 'idle' | 'recording';
  onClick: () => void;
}

export function MicButton({ state, onClick }: Props) {
  const isRecording = state === 'recording';

  return (
    <button
      onClick={onClick}
      style={{
        ...styles.button,
        ...(isRecording ? styles.recording : styles.idle),
      }}
      title={isRecording ? 'Stop recording' : 'Start recording'}
    >
      {isRecording ? (
        // Stop icon
        <div style={styles.stopIcon} />
      ) : (
        // Mic icon
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      )}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    width: 88,
    height: 88,
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 200ms ease',
    outline: 'none',
  },
  idle: {
    background: 'var(--accent)',
    color: 'white',
    boxShadow: '0 4px 20px rgba(79, 70, 229, 0.3)',
    animation: 'breathe 3s ease-in-out infinite',
  },
  recording: {
    background: 'var(--red)',
    color: 'white',
    boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    background: 'white',
  },
};
