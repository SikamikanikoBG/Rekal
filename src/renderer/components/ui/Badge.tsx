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
    background: tokens.colors.bgSurfaceHover,
    color: tokens.colors.textSecondary,
  },
  accent: {
    background: tokens.colors.accentSubtle,
    color: tokens.colors.accent,
  },
  success: {
    background: tokens.colors.successSubtle,
    color: tokens.colors.success,
  },
  warning: {
    background: tokens.colors.warningSubtle,
    color: tokens.colors.warning,
  },
  danger: {
    background: tokens.colors.dangerSubtle,
    color: tokens.colors.danger,
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
