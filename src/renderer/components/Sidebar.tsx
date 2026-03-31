import React, { useState, useEffect } from 'react';
import { tokens } from '../styles/tokens';

export type NavItem = 'dashboard' | 'meetings' | 'timeline' | 'tasks' | 'chat' | 'achievements' | 'settings';

interface SidebarProps {
  active: NavItem;
  onNavigate: (item: NavItem) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavEntry {
  id: NavItem;
  label: string;
  icon: React.ReactNode;
  bottom?: boolean;
}

const navItems: NavEntry[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'meetings',
    label: 'Meetings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    ),
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'achievements',
    label: 'Achievements',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    bottom: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    ),
  },
];

interface SidebarStats {
  level: number;
  title: string;
  xp: number;
  xpRequired: number;
  progress: number;
}

export function Sidebar({ active, onNavigate, collapsed = false, onToggleCollapse }: SidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [sidebarStats, setSidebarStats] = useState<SidebarStats | null>(null);
  const width = collapsed ? 56 : 200;

  useEffect(() => {
    window.api.gamification.getStats()
      .then((data: any) => {
        const { stats, levelInfo } = data;
        setSidebarStats({
          level: levelInfo.level,
          title: levelInfo.title,
          xp: stats.xp,
          xpRequired: levelInfo.nextLevel ? levelInfo.nextLevel.xpRequired : levelInfo.xpRequired,
          progress: levelInfo.progress,
        });
      })
      .catch(() => {});
  }, [active]); // Refresh when nav changes

  const topItems = navItems.filter((n) => !n.bottom);
  const bottomItems = navItems.filter((n) => n.bottom);

  return (
    <div style={{ ...styles.sidebar, width }}>
      {/* Logo area */}
      <div style={styles.logoArea}>
        {!collapsed && (
          <div style={styles.logoText}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={tokens.colors.accent} strokeWidth="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
            <span style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: tokens.colors.text }}>
              Rekal
            </span>
          </div>
        )}
        <button
          style={styles.collapseBtn}
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: `transform ${tokens.transition.normal}` }}>
            <path d="m11 17-5-5 5-5" />
            <path d="m18 17-5-5 5-5" />
          </svg>
        </button>
      </div>

      {/* Main nav */}
      <nav style={styles.nav}>
        {topItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={active === item.id}
            collapsed={collapsed}
            hovered={hoveredItem === item.id}
            onHoverStart={() => setHoveredItem(item.id)}
            onHoverEnd={() => setHoveredItem(null)}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </nav>

      {/* Bottom section */}
      <div style={styles.bottomSection}>
        <div style={styles.divider} />
        {bottomItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={active === item.id}
            collapsed={collapsed}
            hovered={hoveredItem === item.id}
            onHoverStart={() => setHoveredItem(item.id)}
            onHoverEnd={() => setHoveredItem(null)}
            onClick={() => onNavigate(item.id)}
          />
        ))}

        {/* Level badge and XP progress */}
        {!collapsed && sidebarStats && (
          <div style={styles.statsPlaceholder}>
            <div style={styles.levelBadge}>
              <span style={styles.levelNumber}>{sidebarStats.level}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={styles.statsTitle}>{sidebarStats.title}</p>
              <div style={styles.xpBar}>
                <div style={{ ...styles.xpFill, width: `${Math.round(sidebarStats.progress * 100)}%` }} />
              </div>
              <p style={styles.xpText}>
                {sidebarStats.xp} / {sidebarStats.xpRequired} XP
              </p>
            </div>
          </div>
        )}
        {collapsed && sidebarStats && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: tokens.spacing.sm }}>
            <div style={styles.levelBadge}>
              <span style={styles.levelNumber}>{sidebarStats.level}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NavButton({ item, active, collapsed, hovered, onHoverStart, onHoverEnd, onClick }: {
  item: NavEntry;
  active: boolean;
  collapsed: boolean;
  hovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onClick: () => void;
}) {
  const bg = active
    ? tokens.colors.accentSubtle
    : hovered
      ? tokens.colors.bgSurfaceHover
      : 'transparent';

  const color = active ? tokens.colors.accent : hovered ? tokens.colors.text : tokens.colors.textSecondary;

  return (
    <button
      onClick={onClick}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: collapsed ? '8px 0' : '8px 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: bg,
        color,
        border: 'none',
        borderRadius: tokens.radius.md,
        cursor: 'pointer',
        transition: `all ${tokens.transition.fast}`,
        fontSize: tokens.fontSize.md,
        fontWeight: active ? tokens.fontWeight.semibold : tokens.fontWeight.medium,
        fontFamily: 'var(--font)',
        position: 'relative',
      }}
      title={collapsed ? item.label : undefined}
    >
      {/* Active indicator */}
      {active && (
        <div style={{
          position: 'absolute',
          left: collapsed ? '50%' : -1,
          top: collapsed ? 'auto' : '50%',
          bottom: collapsed ? -2 : 'auto',
          transform: collapsed ? 'translateX(-50%)' : 'translateY(-50%)',
          width: collapsed ? 16 : 3,
          height: collapsed ? 3 : 16,
          background: tokens.colors.accent,
          borderRadius: tokens.radius.full,
        }} />
      )}
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {item.icon}
      </span>
      {!collapsed && <span>{item.label}</span>}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: tokens.colors.bgSurface,
    borderRight: `1px solid ${tokens.colors.borderSubtle}`,
    transition: `width ${tokens.transition.normal}`,
    flexShrink: 0,
    overflow: 'hidden',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacing.lg}px ${tokens.spacing.md}px`,
    paddingTop: tokens.spacing.sm,
    minHeight: 40,
  },
  logoText: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  collapseBtn: {
    background: 'none',
    border: 'none',
    color: tokens.colors.textTertiary,
    cursor: 'pointer',
    padding: 4,
    borderRadius: tokens.radius.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `all ${tokens.transition.fast}`,
    flexShrink: 0,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: `0 ${tokens.spacing.sm}px`,
    flex: 1,
  },
  bottomSection: {
    padding: `0 ${tokens.spacing.sm}px`,
    paddingBottom: tokens.spacing.md,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  divider: {
    height: 1,
    background: tokens.colors.borderSubtle,
    margin: `${tokens.spacing.sm}px 0`,
  },
  statsPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: `${tokens.spacing.md}px ${tokens.spacing.md}px`,
    marginTop: tokens.spacing.sm,
    background: tokens.colors.bg,
    borderRadius: tokens.radius.md,
  },
  levelBadge: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.full,
    background: tokens.colors.accentSubtle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  levelNumber: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.accent,
  },
  statsTitle: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textSecondary,
    marginBottom: 4,
  },
  xpBar: {
    height: 3,
    background: tokens.colors.border,
    borderRadius: tokens.radius.full,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    background: tokens.colors.accent,
    borderRadius: tokens.radius.full,
    transition: `width ${tokens.transition.slow}`,
  },
  xpText: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textTertiary,
    margin: 0,
    marginTop: 2,
  },
};
