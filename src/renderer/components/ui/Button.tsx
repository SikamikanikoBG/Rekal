import React from 'react';
import { tokens } from '../../styles/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--accent)',
    color: '#FFFFFF',
  },
  secondary: {
    background: 'var(--bg-hover)',
    color: 'var(--text-primary)',
    border: `1px solid ${'var(--border)'}`,
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
  },
  danger: {
    background: 'var(--red-light)',
    color: 'var(--red)',
  },
};

const variantHoverStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: 'var(--accent-hover)' },
  secondary: { background: 'var(--bg-active)', borderColor: 'var(--border)' },
  ghost: { background: 'var(--bg-hover)', color: 'var(--text-primary)' },
  danger: { background: 'var(--red)', color: '#FFFFFF' },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '4px 10px', fontSize: tokens.fontSize.sm, borderRadius: tokens.radius.sm },
  md: { padding: '8px 16px', fontSize: tokens.fontSize.md, borderRadius: tokens.radius.md },
  lg: { padding: '10px 20px', fontSize: tokens.fontSize.lg, borderRadius: tokens.radius.md },
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  style,
  disabled,
  onMouseEnter,
  onMouseLeave,
  ...props
}: ButtonProps) {
  const [hovered, setHovered] = React.useState(false);

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontFamily: 'var(--font)',
    fontWeight: tokens.fontWeight.medium,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: `all ${tokens.transition.fast}`,
    opacity: disabled ? 0.5 : 1,
    whiteSpace: 'nowrap',
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...(hovered && !disabled ? variantHoverStyles[variant] : {}),
    ...style,
  };

  return (
    <button
      style={baseStyle}
      disabled={disabled}
      onMouseEnter={(e) => { setHovered(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHovered(false); onMouseLeave?.(e); }}
      {...props}
    >
      {children}
    </button>
  );
}
