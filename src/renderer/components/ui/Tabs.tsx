import React from 'react';
import { tokens } from '../../styles/tokens';

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  style?: React.CSSProperties;
}

export function Tabs({ tabs, active, onChange, style }: TabsProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        borderBottom: `1px solid ${'var(--border)'}`,
        ...style,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              padding: '10px 16px',
              fontSize: tokens.fontSize.md,
              fontWeight: tokens.fontWeight.medium,
              fontFamily: 'var(--font)',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
              cursor: 'pointer',
              transition: `all ${tokens.transition.fast}`,
              marginBottom: -1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                style={{
                  fontSize: tokens.fontSize.xs,
                  background: isActive ? 'var(--accent-light)' : 'var(--bg-hover)',
                  color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
                  padding: '1px 6px',
                  borderRadius: tokens.radius.full,
                  fontWeight: tokens.fontWeight.semibold,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
