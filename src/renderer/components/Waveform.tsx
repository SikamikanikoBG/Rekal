import React, { useEffect, useRef } from 'react';

interface Props {
  audioLevel?: number; // 0-1, from actual mic input
}

/**
 * Animated waveform bars driven by audio level input.
 */
export function Waveform({ audioLevel = 0.3 }: Props) {
  const barsRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef(audioLevel);

  useEffect(() => {
    levelRef.current = audioLevel;
  }, [audioLevel]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const bars = barsRef.current?.children;
    if (!bars) return;

    interval = setInterval(() => {
      const level = levelRef.current;
      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i] as HTMLDivElement;
        // Base height + random variation scaled by audio level
        const base = 4;
        const maxExtra = 36 * Math.max(0.15, level);
        const height = base + Math.random() * maxExtra;
        bar.style.height = `${height}px`;
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={barsRef} style={styles.container}>
      {Array.from({ length: 32 }).map((_, i) => (
        <div key={i} style={styles.bar} />
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 48,
    width: '100%',
  },
  bar: {
    width: 3,
    height: 4,
    borderRadius: 2,
    background: 'var(--accent)',
    opacity: 0.6,
    transition: 'height 100ms ease',
  },
};
