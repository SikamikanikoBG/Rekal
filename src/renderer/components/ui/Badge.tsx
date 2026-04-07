import React from 'react';
import { tokens } from '../../styles/tokens';

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: React.CSSProperties;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    background: 'var(--bg-hover)',
    color: 'var(--text-secondary)',
  },
  accent: {
    background: 'var(--accent-light)',
    color: 'var(--accent)',
  },
  success: {
    background: 'var(--green-light)',
    color: 'var(--green)',
  },
  warning: {
    background: 'var(--orange-light)',
    color: 'var(--orange)',
  },
  danger: {
    background: 'var(--red-light)',
    color: 'var(--red)',
  },
};

export function Badge({ children, variant = 'default', style }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        fontSize: tokens.fontSize.xs,
        fontWeight: tokens.fontWeight.medium,
        borderRadius: tokens.radius.full,
        whiteSpace: 'nowrap',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
