import React from 'react';
import { tokens } from '../../styles/tokens';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

const typeStyles: Record<ToastType, { bg: string; border: string; color: string; icon: string }> = {
  success: {
    bg: 'var(--green-light)',
    border: 'rgba(46, 204, 113, 0.3)',
    color: 'var(--green)',
    icon: '\u2713',
  },
  error: {
    bg: 'var(--red-light)',
    border: 'rgba(231, 76, 60, 0.3)',
    color: 'var(--red)',
    icon: '!',
  },
  info: {
    bg: 'var(--accent-light)',
    border: 'rgba(108, 92, 231, 0.3)',
    color: 'var(--accent)',
    icon: 'i',
  },
};

export function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  const s = typeStyles[toast.type];

  return (
    <div
      className="fade-in"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: 'var(--bg-card)',
        border: `1px solid ${s.border}`,
        borderRadius: tokens.radius.md,
        boxShadow: tokens.shadow.md,
        minWidth: 240,
        maxWidth: 360,
        cursor: 'pointer',
      }}
      onClick={() => onDismiss(toast.id)}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: tokens.radius.full,
          background: s.bg,
          color: s.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: tokens.fontSize.xs,
          fontWeight: tokens.fontWeight.bold,
          flexShrink: 0,
        }}
      >
        {s.icon}
      </span>
      <span style={{ fontSize: tokens.fontSize.md, color: 'var(--text-primary)', flex: 1 }}>
        {toast.message}
      </span>
    </div>
  );
}
