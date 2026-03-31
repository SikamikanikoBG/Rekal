# Rekal UX/UI Design Document

## 1. Design Philosophy & Principles

### Core Philosophy
Rekal exists to **disappear during meetings and shine afterward**. The interface should never compete for attention with the conversation happening in the room. When a meeting ends, the tool should feel like a brilliant colleague who was silently taking perfect notes the whole time.

### Design Principles

1. **Invisible Until Needed**: The primary interaction (start/stop recording) must be achievable in under 1 second. The app should sit quietly in the system tray and spring to life with a single click.

2. **Calm Computing**: Meetings are often stressful. The interface must radiate calm confidence. No aggressive colors, no anxiety-inducing spinners, no unnecessary notifications. Processing states should feel like "the tool is working for you" not "you are waiting."

3. **Progressive Disclosure**: Show the minimum viable interface by default. Power features (templates, export options, chart customization) reveal themselves contextually. A first-time user and a power user should both feel the app was designed for them.

4. **Local-First Confidence**: Enterprise users need to trust that nothing leaves their machine. The UI should subtly reinforce this through iconography (lock icons, "Local AI" badges) and the absence of any cloud/sync language.

5. **Structured Output, Not Raw Data**: Raw transcripts are overwhelming. The default view should always be the AI-processed summary. The transcript is a reference, not the product.

6. **Keyboard-First, Mouse-Friendly**: Every action should have a keyboard shortcut. But the visual hierarchy should make mouse/touch interaction intuitive without memorizing shortcuts.

---

## 2. Color Palette

### Light Theme (Mockup A - Minimal)

| Token             | Value     | Usage                              |
|--------------------|-----------|------------------------------------|
| `--bg-primary`     | `#FAFAFA` | Main background                    |
| `--bg-secondary`   | `#F5F5F5` | Cards, panels                      |
| `--bg-elevated`    | `#FFFFFF` | Modals, popovers, hover states     |
| `--text-primary`   | `#1A1A1A` | Headings, primary content          |
| `--text-secondary` | `#6B7280` | Descriptions, timestamps           |
| `--text-muted`     | `#9CA3AF` | Placeholders, disabled states      |
| `--accent`         | `#6366F1` | Primary actions, links             |
| `--accent-soft`    | `#EEF2FF` | Accent backgrounds, tags           |
| `--recording`      | `#EF4444` | Recording indicator, active mic    |
| `--recording-soft` | `#FEE2E2` | Recording background glow          |
| `--success`        | `#10B981` | Completed states, checkmarks       |
| `--warning`        | `#F59E0B` | Action items, attention needed     |
| `--border`         | `#E5E7EB` | Dividers, card borders             |
| `--border-subtle`  | `#F3F4F6` | Subtle separators                  |

### Dark Theme (Mockup B - Rich)

| Token             | Value     | Usage                              |
|--------------------|-----------|------------------------------------|
| `--bg-primary`     | `#0F0F0F` | Main background                    |
| `--bg-secondary`   | `#1A1A1A` | Sidebar, panels                    |
| `--bg-elevated`    | `#252525` | Cards, active states               |
| `--bg-hover`       | `#2A2A2A` | Hover states                       |
| `--text-primary`   | `#F0F0F0` | Headings, primary content          |
| `--text-secondary` | `#888888` | Descriptions, timestamps           |
| `--text-muted`     | `#555555` | Placeholders, disabled             |
| `--accent`         | `#818CF8` | Primary actions, links             |
| `--accent-soft`    | `#1E1B4B` | Accent backgrounds                 |
| `--recording`      | `#F87171` | Recording indicator                |
| `--success`        | `#34D399` | Completed states                   |
| `--warning`        | `#FBBF24` | Action items                       |
| `--border`         | `#2A2A2A` | Dividers, card borders             |
| `--border-subtle`  | `#1F1F1F` | Subtle separators                  |

---

## 3. Typography

### Font Stack
- **Primary**: `Inter` (Google Fonts) - clean, highly legible, excellent at small sizes
- **Monospace**: `JetBrains Mono` - for timestamps, durations, technical content
- **Fallback**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

### Type Scale (based on 1.200 minor third)

| Token      | Size   | Weight | Line Height | Usage                        |
|------------|--------|--------|-------------|------------------------------|
| `display`  | 28px   | 600    | 1.2         | Meeting title in results     |
| `h1`       | 22px   | 600    | 1.3         | Section headings             |
| `h2`       | 18px   | 600    | 1.4         | Card titles, panel headers   |
| `h3`       | 15px   | 500    | 1.4         | Subsection headings          |
| `body`     | 14px   | 400    | 1.6         | Default body text            |
| `body-sm`  | 13px   | 400    | 1.5         | Secondary descriptions       |
| `caption`  | 12px   | 400    | 1.4         | Timestamps, metadata         |
| `mono`     | 13px   | 400    | 1.5         | Durations, technical values  |

---

## 4. Spacing System

Use an 4px base grid:

| Token  | Value | Usage                                    |
|--------|-------|------------------------------------------|
| `xs`   | 4px   | Tight internal padding, icon gaps        |
| `sm`   | 8px   | Between related elements                 |
| `md`   | 12px  | Standard padding, list item spacing      |
| `base` | 16px  | Card padding, section spacing            |
| `lg`   | 24px  | Between sections, major groupings        |
| `xl`   | 32px  | Page margins, large section gaps         |
| `2xl`  | 48px  | Hero spacing, major layout gaps          |
| `3xl`  | 64px  | Top-level page padding                   |

### Border Radius
- `sm`: 4px (tags, small buttons)
- `md`: 8px (cards, inputs)
- `lg`: 12px (panels, modals)
- `xl`: 16px (large cards)
- `full`: 9999px (pills, avatars, mic button)

---

## 5. Layout Architecture

### Application Shell

```
+--------------------------------------------------+
|  [Title Bar / Drag Region]            [_ [] X]   |
+--------+-----------------------------------------+
|        |                                         |
| Side-  |            Main Content                 |
| bar    |                                         |
| (opt.) |                                         |
|        |                                         |
|        |                                         |
|        |                                         |
|        |                                         |
+--------+-----------------------------------------+
```

**Minimal layout (Mockup A)**: No persistent sidebar. Navigation via top tabs or contextual breadcrumbs. The content area is maximized. Sidebar slides in as an overlay when browsing meeting library.

**Rich layout (Mockup B)**: Persistent collapsible sidebar (220px default, 60px collapsed). Sidebar contains: navigation, recent meetings, quick actions. Main content area has its own header with contextual actions.

### Why This Layout
- The sidebar-less design (A) prioritizes focus and reduces cognitive load. It works because the app has a linear workflow: record -> process -> review.
- The sidebar design (B) prioritizes navigation and discovery. It works for power users who jump between meetings, reference old notes during new meetings, and use templates heavily.

---

## 6. Key Screens

### 6.1 Idle / Home Screen
**Purpose**: Landing pad. Show readiness to record, provide quick access to recent meetings.

- Hero element: Mic button (centered in A, prominent in B)
- Below mic: "Ready to record" status text
- Recent meetings list (last 5-10) with title, date, duration, template tag
- Quick access to search (Cmd+K / Ctrl+K)
- Template selector (collapsed by default)

### 6.2 Recording Screen
**Purpose**: Minimal distraction during active recording. Provide confidence that recording is working.

- Large timer (MM:SS format, monospace font)
- Audio waveform visualization (real-time, subtle)
- Bookmark/flag button (to mark important moments)
- Stop button (prominent, red)
- Mute indicator (shows mic/system audio status)
- Minimal chrome - most UI elements fade or collapse

### 6.3 Processing Screen
**Purpose**: Maintain user confidence during the 30-120 second processing window.

- Step indicator: "Transcribing..." -> "Analyzing..." -> "Generating notes..."
- Progress bar (determinate when possible, indeterminate for AI steps)
- Elapsed time display
- Animated visualization (subtle, calming)
- Cancel button (with confirmation)
- The key insight: show partial results as they become available (transcript appears first, then summary builds on top)

### 6.4 Results Screen
**Purpose**: The payoff. Present structured meeting intelligence.

Tabbed interface:
1. **Summary** (default): Key points, decisions made, overall sentiment
2. **Action Items**: Extracted tasks with assignees, deadlines, priority
3. **Transcript**: Full text with timestamps, speaker labels, searchable
4. **Analytics**: Talk-time distribution (pie chart), topic timeline, meeting duration comparison

Header: Meeting title (editable), date, duration, template tag, export button, share button

### 6.5 Meeting Library
**Purpose**: Browse and search all past meetings.

- Search bar (full-text across all transcripts and summaries)
- Filter by: date range, template, participants, tags
- List or grid view toggle
- Sort by: date, duration, relevance
- Bulk actions: export, delete, tag

### 6.6 Settings
**Purpose**: Configure audio, AI, and preferences.

- Audio: Input device, system audio capture, noise reduction
- AI: Model selection (Ollama models), summarization style, language
- Templates: Create/edit meeting templates
- Export: Default format, auto-export settings
- Appearance: Theme, font size, density
- Privacy: Data retention, auto-delete settings

---

## 7. Interaction Patterns

### 7.1 Mic Button Behavior

**Idle State**:
- Large circular button, accent color
- Subtle pulse animation (breathing, not urgent)
- Hover: slight scale up (1.05x), tooltip "Start Recording (Ctrl+R)"
- Click: immediate transition to recording state

**Recording State**:
- Button transforms to red/recording color
- Continuous pulse animation synced to audio level
- Ring animation radiates outward
- Click: stop recording, transition to processing
- Long-press (future): pause recording

**Transitions**:
- Idle -> Recording: 300ms scale + color transition, haptic feedback if available
- Recording -> Processing: Button shrinks, transforms into progress indicator
- Processing -> Results: Smooth crossfade, results slide up from bottom

### 7.2 Keyboard Shortcuts

| Shortcut       | Action                          |
|----------------|---------------------------------|
| `Ctrl+R`       | Start/stop recording            |
| `Ctrl+B`       | Add bookmark during recording   |
| `Ctrl+K`       | Quick search                    |
| `Ctrl+E`       | Export current meeting          |
| `Ctrl+N`       | New meeting (with template)     |
| `Ctrl+,`       | Settings                        |
| `Ctrl+1-4`     | Switch result tabs              |
| `Escape`       | Close modal/panel, minimize     |

### 7.3 Loading & Processing States

**Principle**: Never show an empty screen. Never show a generic spinner without context.

- **Skeleton screens** for content that's loading from local DB
- **Step-by-step progress** for transcription/AI processing
- **Partial results** displayed as they become available
- **Time estimates** based on recording duration (e.g., "~45 seconds remaining")
- **Background processing option**: "Minimize and we'll notify you when ready"

---

## 8. Handling Processing Wait Time

This is the most critical UX challenge. A 2-minute meeting generates ~15 seconds of processing. A 60-minute meeting might take 2-3 minutes. Here's the strategy:

### Streaming Partial Results
As whisper.cpp transcribes, show the transcript building in real-time (typewriter effect). This is engaging and provides immediate value. The user can start reading while AI summarization runs in parallel.

### Progress Decomposition
Break the process into visible steps:
1. "Processing audio..." (5-10%)
2. "Transcribing speech..." (10-60%) - show word count climbing
3. "Identifying speakers..." (60-70%)
4. "Generating summary..." (70-85%)
5. "Extracting action items..." (85-95%)
6. "Creating analytics..." (95-100%)

### Background Processing
After 10 seconds, offer a subtle "Continue in background" option. The app minimizes to tray and sends a system notification when complete.

### Calm Animation
During processing, show a subtle, mesmerizing animation (gentle wave, orbiting dots, or flowing gradient). This should be calming, not anxiety-inducing. Think macOS screensaver energy, not loading spinner energy.

---

## 9. Accessibility Considerations

### WCAG 2.1 AA Compliance

- **Color contrast**: All text meets 4.5:1 ratio (normal text) and 3:1 (large text)
- **Focus indicators**: Visible focus rings on all interactive elements (2px solid accent, 2px offset)
- **Screen reader**: All interactive elements have ARIA labels. Recording state changes announced via `aria-live` regions
- **Keyboard navigation**: Full tab-order support. No keyboard traps. Skip links for main content
- **Motion**: Respect `prefers-reduced-motion`. Disable all animations when set. Waveform becomes a simple level meter
- **Font scaling**: UI must remain usable at 200% zoom. Use relative units (rem) throughout
- **High contrast**: Support Windows High Contrast Mode via `forced-colors` media query

### Specific Accessibility Patterns
- Mic button: `role="switch"` with `aria-checked` for recording state
- Progress: `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Tabs: Proper `role="tablist"`, `role="tab"`, `role="tabpanel"` with arrow key navigation
- Charts: Include `role="img"` with `aria-label` describing the data. Provide a text-based data table alternative
- Notifications: Use `aria-live="polite"` for processing updates, `aria-live="assertive"` for recording state changes

---

## 10. System Tray Behavior

### Tray Icon States
- **Idle**: Monochrome app icon
- **Recording**: Red dot overlay on icon, pulsing
- **Processing**: Animated spinner overlay
- **Complete**: Green checkmark overlay (for 5 seconds, then returns to idle)

### Tray Menu (Right-click)
```
Start Recording          Ctrl+R
---
Recent Meetings >
  - Standup 3/29
  - 1:1 with Sarah 3/28
  - Sprint Planning 3/27
---
Open Rekal
Settings
---
Quit
```

### Tray Behaviors
- Left-click: Toggle app window visibility
- During recording: Left-click shows a compact floating timer widget (always-on-top option)
- Notification on processing complete: "Meeting notes ready - Q1 Planning Review" (clickable, opens results)
- Minimize to tray by default (configurable). Close button minimizes, not quits.

### Compact Floating Widget (During Recording)
A small, always-on-top widget showing:
- Timer
- Waveform (tiny)
- Bookmark button
- Stop button
Draggable, snaps to screen edges. Semi-transparent when not hovered.

---

## 11. Additional UX Considerations

### Onboarding (First Launch)
1. Welcome screen with privacy message ("Everything stays on your machine")
2. Microphone permission request with visual guide
3. System audio capture setup (with test)
4. AI model download/selection (Ollama setup check)
5. Choose a template for your first meeting

### Error States
- **No microphone**: Clear message with link to Windows sound settings
- **Ollama not running**: "Start Ollama" button with setup instructions
- **Disk space low**: Warning before recording starts
- **Transcription fails**: Offer retry, show raw audio player as fallback

### Empty States
- No meetings yet: Illustration + "Record your first meeting" CTA
- No search results: Suggest broader search terms
- No action items found: "No action items detected. You can add them manually."

### Data Privacy Indicators
- Footer badge: "Local AI - Your data never leaves this device"
- Settings: Clear data retention controls
- Export: Explicit "This will create a file on your computer" language (no cloud ambiguity)
