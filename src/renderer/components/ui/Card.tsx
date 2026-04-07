import React from 'react';
import { tokens } from '../../styles/tokens';

interface CardProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
  className?: string;
}

const paddingMap = {
  none: 0,
  sm: tokens.spacing.md,
  md: tokens.spacing.lg,
  lg: tokens.spacing.xl,
};

export function Card({ children, header, padding = 'md', style, className }: CardProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${'var(--border-light)'}`,
        borderRadius: tokens.radius.lg,
        overflow: 'hidden',
        ...style,
      }}
    >
      {header && (
        <div
          style={{
            padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
            borderBottom: `1px solid ${'var(--border-light)'}`,
            fontSize: tokens.fontSize.sm,
            fontWeight: tokens.fontWeight.semibold,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {header}
        </div>
      )}
      <div style={{ padding: paddingMap[padding] }}>
        {children}
      </div>
    </div>
  );
}
