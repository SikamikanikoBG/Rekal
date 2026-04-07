import React, { useState, useEffect } from 'react';
import { Setup } from './screens/Setup';
import { Idle } from './screens/Idle';
import { Recording } from './screens/Recording';
import { Processing } from './screens/Processing';
import { Results } from './screens/Results';
import { Settings } from './screens/Settings';
import { Achievements } from './screens/Achievements';
import { Dashboard } from './screens/Dashboard';
import { GlobalTasks } from './screens/GlobalTasks';
import { Timeline } from './screens/Timeline';
import { GlobalChat } from './screens/GlobalChat';
import { SearchOverlay } from './components/SearchOverlay';
import { Sidebar, NavItem } from './components/Sidebar';
import { ToastProvider, useToast } from './components/ui/ToastProvider';
import { useGamificationToasts } from './hooks/useGamification';
import { tokens } from './styles/tokens';

export type Screen = 'setup' | 'idle' | 'recording' | 'processing' | 'results' | 'settings' | 'achievements' | 'dashboard' | 'tasks' | 'timeline' | 'globalchat';

export interface AppState {
  screen: Screen;
  // Navigation
  activeNav: NavItem;
  sidebarCollapsed: boolean;
  // Providers
  transcriptionProvider: string;
  transcriptionModel: string;
  summarizationProvider: string;
  summarizationModel: string;
  language: string;
  // Recording
  audioPath: string | null;
  transcript: any | null; // can be { prebuilt: true, text: string } during processing, or full transcript after
  notes: any | null;
  recordingDuration: number;
  // Meeting
  currentMeetingId: string | null;
  meetingTitle: string | null;
  meetingDate: string | null;
  // Failed session retry
  failedSessionId: string | null;
}

declare global {
  interface Window { api: any; }
}

function generateTitle(transcript: any, notes: any): string {
  if (notes?.topics?.length > 0) return notes.topics[0];
  if (notes?.summary) {
    const clean = notes.summary.substring(0, 60).trim();
    return clean.length < notes.summary.length ? clean + '...' : clean;
  }
  if (transcript?.segments?.length > 0) return transcript.segments[0].text.substring(0, 60).trim();
  return `Meeting ${new Date().toLocaleDateString()}`;
}

// Screens that should show the sidebar layout
const SIDEBAR_SCREENS: Screen[] = ['idle', 'results', 'settings', 'achievements', 'dashboard', 'tasks', 'timeline', 'globalchat'];

// Map nav items to screens
function navToScreen(nav: NavItem): Screen {
  switch (nav) {
    case 'dashboard': return 'dashboard';
    case 'meetings': return 'idle';
    case 'timeline': return 'timeline';
    case 'tasks': return 'tasks';
    case 'chat': return 'globalchat';
    case 'achievements': return 'achievements';
    case 'settings': return 'settings';
    default: return 'dashboard';
  }
}

/** Wires gamification toast notifications to the ToastProvider */
function GamificationToastWiring() {
  const toast = useToast();
  useGamificationToasts(toast);
  return null;
}

export default function App() {
  const [state, setState] = useState<AppState>({
    screen: 'dashboard',
    activeNav: 'dashboard',
    sidebarCollapsed: false,
    transcriptionProvider: 'whisper-local',
    transcriptionModel: 'small',
    summarizationProvider: 'ollama',
    summarizationModel: '',
    language: 'auto',
    audioPath: null,
    transcript: null,
    notes: null,
    recordingDuration: 0,
    currentMeetingId: null,
    meetingTitle: null,
    meetingDate: null,
    failedSessionId: null,
  });

  const setScreen = (screen: Screen) => setState((s) => ({ ...s, screen }));
  const update = (partial: Partial<AppState>) => setState((s) => ({ ...s, ...partial }));

  async function handleProcessingComplete(transcript: any, notes: any, costInfos?: any[]) {
    const id = crypto.randomUUID();
    const title = generateTitle(transcript, notes);
    const date = new Date().toISOString();
    try {
      await window.api.saveMeeting({
        id, title, date,
        duration: state.recordingDuration,
        audioPath: state.audioPath || '',
        transcript, notes, bookmarks: [],
      });
      // Save usage costs with the meeting ID
      if (costInfos && costInfos.length > 0) {
        for (const ci of costInfos) {
          try {
            await window.api.costs.save({
              meetingId: id,
              serviceType: ci.serviceType,
              provider: ci.provider,
              model: ci.model,
              inputTokens: ci.inputTokens || 0,
              outputTokens: ci.outputTokens || 0,
              audioSeconds: ci.audioSeconds || 0,
              costUsd: ci.costUsd,
            });
          } catch (costErr) { console.error('Failed to save cost:', costErr); }
        }
      }
      // Award XP for recording a meeting
      try { await window.api.gamification.awardXP('MEETING_RECORDED', id); } catch (_) {}
    } catch (e) { console.error('Failed to save meeting:', e); }
    update({ screen: 'results', transcript, notes, currentMeetingId: id, meetingTitle: title, meetingDate: date });
  }

  function handleRetryFailedSession(session: { id: string; audioPath: string; transcript: any; failedStep: string }) {
    update({
      screen: 'processing',
      audioPath: session.audioPath,
      recordingDuration: 0,
      failedSessionId: session.id,
      transcript: session.transcript
        ? { prebuilt: true, text: session.transcript.segments?.map((s: any) => s.text).join(' ').trim() || '' }
        : null,
    });
  }

  async function handleViewMeeting(id: string) {
    try {
      const m = await window.api.getMeeting(id);
      if (m) {
        update({
          screen: 'results', transcript: m.transcript, notes: m.notes,
          recordingDuration: m.duration, currentMeetingId: m.id, meetingTitle: m.title, meetingDate: m.date,
        });
        // Award XP for reviewing a past meeting
        try { await window.api.gamification.awardXP('MEETING_REVIEWED', m.id); } catch (_) {}
      }
    } catch (e) { console.error('Failed to load meeting:', e); }
  }

  function handleNavigate(nav: NavItem) {
    const screen = navToScreen(nav);
    update({ activeNav: nav, screen });
  }

  function handleToggleCollapse() {
    update({ sidebarCollapsed: !state.sidebarCollapsed });
  }

  const [managedMode, setManagedMode] = useState(false);

  useEffect(() => {
    window.api.getManagedMode().then((source: string) => {
      setManagedMode(source === 'file' || source === 'remote');
    }).catch(() => {});
  }, []);

  // Apply saved theme on load
  useEffect(() => {
    window.api.getConfig().then((cfg: any) => {
      document.documentElement.classList.toggle('light', cfg.theme === 'light');
    }).catch(() => {});
  }, []);

  const [searchOpen, setSearchOpen] = useState(false);

  // Ctrl+K global shortcut for search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Determine active nav from screen
  function getActiveNav(): NavItem {
    switch (state.screen) {
      case 'settings': return 'settings';
      case 'results': return 'meetings';
      case 'idle': return 'meetings';
      case 'achievements': return 'achievements';
      case 'dashboard': return 'dashboard';
      case 'tasks': return 'tasks';
      case 'timeline': return 'timeline';
      case 'globalchat': return 'chat';
      default: return state.activeNav;
    }
  }

  const showSidebar = SIDEBAR_SCREENS.includes(state.screen);
  const isFullscreen = !showSidebar;

  return (
    <ToastProvider>
      <GamificationToastWiring />
      <div className="titlebar-drag" />
      <div className="app-container">
        {isFullscreen ? (
          // Full-screen experiences: Setup, Recording, Processing
          <>
            {state.screen === 'setup' && (
              <Setup onComplete={() => update({ screen: 'dashboard', activeNav: 'dashboard' })} />
            )}
            {state.screen === 'recording' && (
              <Recording
                onStop={(audioPath, duration, transcript) => update({ screen: 'processing', audioPath, recordingDuration: duration, transcript: transcript ? { prebuilt: true, text: transcript } : null })}
                onCancel={() => setScreen('dashboard')}
              />
            )}
            {state.screen === 'processing' && (
              <Processing
                audioPath={state.audioPath!}
                prebuiltTranscript={state.transcript?.prebuilt ? state.transcript.text : undefined}
                failedSessionId={state.failedSessionId || undefined}
                onComplete={handleProcessingComplete}
                onError={() => update({ screen: 'dashboard', activeNav: 'dashboard', failedSessionId: null })}
              />
            )}
          </>
        ) : (
          // Sidebar layout
          <div style={layoutStyles.wrapper}>
            <Sidebar
              active={getActiveNav()}
              onNavigate={handleNavigate}
              collapsed={state.sidebarCollapsed}
              onToggleCollapse={handleToggleCollapse}
              managedMode={managedMode}
            />
            <div style={layoutStyles.main}>
              {state.screen === 'idle' && (
                <Idle
                  onStartRecording={() => setScreen('recording')}
                  onViewMeeting={handleViewMeeting}
                  onOpenSettings={managedMode ? undefined : () => update({ screen: 'settings', activeNav: 'settings' })}
                />
              )}
              {state.screen === 'results' && (
                <Results
                  transcript={state.transcript} notes={state.notes} duration={state.recordingDuration}
                  title={state.meetingTitle || 'Meeting'} date={state.meetingDate || new Date().toISOString()}
                  meetingId={state.currentMeetingId || ''}
                  onBack={() => update({ screen: 'dashboard', activeNav: 'dashboard', transcript: null, notes: null, audioPath: null, currentMeetingId: null, meetingTitle: null, meetingDate: null })}
                />
              )}
              {state.screen === 'dashboard' && (
                <Dashboard
                  onStartRecording={() => setScreen('recording')}
                  onViewMeeting={handleViewMeeting}
                  onRetryFailedSession={handleRetryFailedSession}
                />
              )}
              {state.screen === 'tasks' && (
                <GlobalTasks onViewMeeting={handleViewMeeting} />
              )}
              {state.screen === 'timeline' && (
                <Timeline onViewMeeting={handleViewMeeting} />
              )}
              {state.screen === 'globalchat' && (
                <GlobalChat />
              )}
              {state.screen === 'achievements' && (
                <Achievements />
              )}
              {state.screen === 'settings' && !managedMode && (
                <Settings
                  onSave={() => update({ screen: 'dashboard', activeNav: 'dashboard' })}
                  onBack={() => update({ screen: 'dashboard', activeNav: 'dashboard' })}
                />
              )}
            </div>
          </div>
        )}
      </div>
      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onViewMeeting={(id) => { setSearchOpen(false); handleViewMeeting(id); }}
      />
    </ToastProvider>
  );
}

const layoutStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flex: 1,
    height: '100%',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: 'var(--bg)',
  },
};
