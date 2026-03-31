import React from 'react';
import { tokens } from '../../styles/tokens';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  size?: 'sm' | 'md';
}

export function Input({ label, error, size = 'md', style, ...props }: InputProps) {
  const isSmall = size === 'sm';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label
          style={{
            fontSize: tokens.fontSize.xs,
            fontWeight: tokens.fontWeight.semibold,
            color: tokens.colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {label}
        </label>
      )}
      <input
        style={{
          padding: isSmall ? '6px 10px' : '8px 12px',
          fontSize: isSmall ? tokens.fontSize.sm : tokens.fontSize.md,
          fontFamily: 'var(--font)',
          background: tokens.colors.bg,
          color: tokens.colors.text,
          border: `1px solid ${error ? tokens.colors.danger : tokens.colors.border}`,
          borderRadius: tokens.radius.md,
          outline: 'none',
          transition: `border-color ${tokens.transition.fast}`,
          width: '100%',
          ...style,
        }}
        {...props}
      />
      {error && (
        <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.danger }}>
          {error}
        </span>
      )}
    </div>
  );
}
