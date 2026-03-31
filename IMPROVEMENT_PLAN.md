# Rekal Improvement Plan

> Generated: 2026-03-31 | Status: **In Progress**

---

## Priority Matrix

| P# | Epic | User Stories | Dependencies | Effort | Status |
|----|------|-------------|--------------|--------|--------|
| P0 | **Branding & Name** | US-10.1, US-10.2, US-10.3 | None | S | DONE — **Rekal** selected, full codebase rebranded |
| P1 | **UI/UX Overhaul** | US-2.1 – US-2.6 | P0 (name) | L | DONE — design system, sidebar, dark theme, 7 components, toast system |
| P2 | **Ollama URL Config** | US-1.1, US-1.2 | P1 (Settings UI) | S | DONE — configurable URL, test connection, all providers updated |
| P3 | **Enhanced Output Tabs** | US-3.1 – US-3.5 | P1 (UI framework) | M | DONE — Sentiment, Key Quotes, Follow-ups tabs with AI enrichment |
| P4 | **Per-Meeting AI Chat** | US-4.1 – US-4.3 | P3 (tab system) | M | DONE — chat tab, streaming, 4 providers, DB persistence |
| P5 | **Global AI Chat & Views** | US-5.1 – US-5.5 | P4 (chat engine), P1 (home screen) | L | DONE — Dashboard, Global Tasks, Timeline, Global Chat, Search (Ctrl+K) |
| P6 | **Gamification System** | US-6.1 – US-6.7 | P1 (UI), P5 (global data) | L | DONE — XP, levels, 17 achievements, streaks, challenges, full UI |
| P7 | **Enterprise Readiness** | US-7.1 – US-7.6 | P1 (architecture) | L | DONE — CSP, sandbox, input validation, logger, docs, CI, templates |
| P8 | **MCP & A2A Protocols** | US-8.1 – US-8.4 | P7 (security), P5 (global data) | L | MCP DONE (6 tools, stdio) — A2A deferred to v0.2.0 |
| P9 | **Production Launch** | US-9.1 – US-9.5 | ALL above | M | DONE — README, LICENSE, CHANGELOG, Launch Kit, funding config |

```
Dependency Graph:

P0 (Name) ──────┐
                 ▼
P1 (UI/UX) ─────┬──► P2 (Ollama URL)
                 │
                 ├──► P3 (Output Tabs) ──► P4 (Meeting Chat) ──► P5 (Global Chat/Views)
                 │                                                       │
                 ├───────────────────────────────────────────────────────┤
                 │                                                       ▼
                 ├──► P7 (Enterprise) ──► P8 (MCP/A2A) ────────► P6 (Gamification)
                 │                                                       │
                 └───────────────────────────────────────────────────────┘
                                                                         │
                                                                         ▼
                                                                  P9 (Launch)
```

---

## P0 — Branding & Name

### US-10.1: Name Research & Selection
**As a** product owner
**I want** a unique, catchy, AI-forward name
**So that** the product stands out on GitHub and supports viral growth

**Acceptance Criteria:**
- [ ] Research existing names (npm, GitHub, domains) to avoid conflicts
- [ ] Name communicates AI + meeting notes
- [ ] Name is memorable, short (1-2 words), and brandable
- [ ] Candidates evaluated: MeetMind, NoteGenius, RecallAI, Echoic, Mnemonic, SynapseNotes, MindMinutes, EchoNotes, CortexNotes, VoxMind
- [ ] Final name selected and approved

**Result:** `___________` (TBD)

### US-10.2: Rebrand Codebase
**As a** developer
**I want** the codebase updated with the new name
**So that** all references are consistent

**Acceptance Criteria:**
- [ ] package.json name updated
- [ ] electron-builder.yml product name updated
- [ ] Window title updated
- [ ] Config store paths updated
- [ ] Database path updated (with migration)

### US-10.3: Brand Identity
**As a** product owner
**I want** a logo concept and color palette
**So that** the app has a professional identity

**Acceptance Criteria:**
- [ ] Primary color palette defined (2-3 colors)
- [ ] Logo concept described (can be generated later)
- [ ] Typography choices documented
- [ ] Applied to UI theme

---

## P1 — UI/UX Overhaul

### US-2.1: Design System Foundation
**As a** developer
**I want** a consistent design system with tokens and reusable components
**So that** the UI feels cohesive instead of patchwork

**Acceptance Criteria:**
- [ ] CSS-in-JS replaced with proper CSS modules or a design token system
- [ ] Color tokens: background, surface, text, accent, danger, success
- [ ] Typography scale: heading, subheading, body, caption, mono
- [ ] Spacing scale: 4px base unit
- [ ] Border radius, shadow, and transition tokens
- [ ] Reusable components: Button, Card, Input, Badge, Tabs, Modal, Sidebar

### US-2.2: Navigation Redesign — Sidebar Layout
**As a** user
**I want** a persistent sidebar with clear navigation
**So that** I can quickly switch between meetings, chat, and settings

**Acceptance Criteria:**
- [ ] Left sidebar with: Home/Dashboard, Meetings list, Global Chat, Timeline, Settings
- [ ] Sidebar collapses on small screens
- [ ] Active state indicator
- [ ] Meeting list shows recent meetings with search/filter
- [ ] Clicking a meeting opens it in the main content area

### US-2.3: Home Dashboard
**As a** user
**I want** a dashboard as my landing page
**So that** I see my productivity at a glance and can start recording immediately

**Acceptance Criteria:**
- [ ] Quick-record button (prominent CTA)
- [ ] Recent meetings (last 5) with preview
- [ ] Streak/stats widget (ties into gamification P6)
- [ ] Pending action items count
- [ ] Global AI chat entry point

### US-2.4: Recording Experience Polish
**As a** user
**I want** a distraction-free recording experience
**So that** I can focus on my meeting

**Acceptance Criteria:**
- [ ] Full-screen or modal recording mode
- [ ] Larger waveform visualization
- [ ] Live elapsed time prominently displayed
- [ ] Bookmark with labels (quick-tag: "Important", "Action", "Question")
- [ ] Minimize-to-tray option during recording

### US-2.5: Settings Page Redesign
**As a** user
**I want** organized settings with clear sections
**So that** configuration feels approachable

**Acceptance Criteria:**
- [ ] Tabbed or accordion sections: General, Providers, Audio, Appearance, About
- [ ] Ollama URL field (feeds into P2)
- [ ] Default language selector
- [ ] Theme toggle (light/dark)
- [ ] Data management (export all, clear data)

### US-2.6: Responsive Polish & Animations
**As a** user
**I want** smooth transitions and micro-interactions
**So that** the app feels professional and alive

**Acceptance Criteria:**
- [ ] Page transitions (fade/slide)
- [ ] Loading skeletons instead of spinners
- [ ] Hover states on all interactive elements
- [ ] Toast notifications for actions (copied, saved, etc.)
- [ ] Keyboard shortcuts for common actions

---

## P2 — Ollama URL Configuration

### US-1.1: Custom Ollama URL Setting
**As a** user
**I want** to specify the Ollama server URL
**So that** I can use a remote Ollama instance or custom port

**Acceptance Criteria:**
- [ ] URL input field in Settings > Providers
- [ ] Default pre-filled: `http://localhost:11434`
- [ ] URL persisted in electron-store config
- [ ] Validation: test connection on save (GET /api/tags)
- [ ] Error message if connection fails

### US-1.2: Ollama Provider Uses Configured URL
**As a** developer
**I want** the Ollama provider to read from config instead of hardcoding
**So that** the URL setting actually works

**Acceptance Criteria:**
- [ ] `ollama.ts` reads URL from config store
- [ ] Falls back to `http://localhost:11434` if not set
- [ ] Model listing uses configured URL
- [ ] Generation endpoint uses configured URL
- [ ] Connection test IPC handler added

---

## P3 — Enhanced Output Tabs

### US-3.1: Meeting Mind Map Tab
**As a** user
**I want** a visual mind map of meeting topics
**So that** I can see relationships between discussed themes

**Acceptance Criteria:**
- [ ] Tree/graph visualization of topics and subtopics
- [ ] Generated from AI summary data
- [ ] Interactive: click to expand/collapse nodes
- [ ] Color-coded by topic category

### US-3.2: Sentiment & Tone Analysis Tab
**As a** user
**I want** to see the emotional tone of my meetings
**So that** I can gauge team morale and meeting effectiveness

**Acceptance Criteria:**
- [ ] Overall meeting sentiment score (positive/neutral/negative)
- [ ] Sentiment timeline chart (over meeting duration)
- [ ] Key moments highlighted (most positive, most tense)
- [ ] Generated via AI prompt during summarization

### US-3.3: Follow-ups & Deadlines Tab
**As a** user
**I want** a structured view of follow-ups with deadlines
**So that** nothing falls through the cracks

**Acceptance Criteria:**
- [ ] Extracted deadlines with dates
- [ ] Assignee mapping (from transcript speaker detection)
- [ ] Priority indicators (high/medium/low)
- [ ] Export to calendar format (.ics)
- [ ] Overdue highlighting

### US-3.4: Key Quotes Tab
**As a** user
**I want** important quotes extracted from the transcript
**So that** I can reference exact words said

**Acceptance Criteria:**
- [ ] AI-extracted notable quotes
- [ ] Linked to transcript timestamp
- [ ] Click to jump to that point in transcript
- [ ] Copy individual quotes

### US-3.5: Meeting Comparison View
**As a** user
**I want** to compare notes from recurring meetings
**So that** I can track progress over time

**Acceptance Criteria:**
- [ ] Side-by-side comparison of two meetings
- [ ] Diff view for action items (new, completed, carried over)
- [ ] Topic overlap visualization

---

## P4 — Per-Meeting AI Chat

### US-4.1: Chat Interface in Meeting View
**As a** user
**I want** to chat with AI about a specific meeting
**So that** I can ask follow-up questions about the transcript

**Acceptance Criteria:**
- [ ] Chat tab/panel in Results view
- [ ] Full transcript + notes passed as context
- [ ] Conversational UI (message bubbles, input bar)
- [ ] Suggested starter questions ("What were the main disagreements?", "Summarize in 3 bullets")
- [ ] Uses selected summarization provider

### US-4.2: Chat Context Management
**As a** developer
**I want** efficient context handling for meeting chat
**So that** responses are accurate and fast

**Acceptance Criteria:**
- [ ] Transcript chunked if exceeding context window
- [ ] Conversation history maintained per meeting
- [ ] Chat history persisted to DB (new `chats` table)
- [ ] Clear chat option

### US-4.3: Chat Actions
**As a** user
**I want** to take actions from chat responses
**So that** AI insights become actionable

**Acceptance Criteria:**
- [ ] "Add as action item" button on AI responses
- [ ] "Copy" button on each message
- [ ] "Regenerate" option on AI responses
- [ ] Export chat as markdown

---

## P5 — Global AI Chat & Views

### US-5.1: Global AI Chat
**As a** user
**I want** to chat with AI across ALL my meetings
**So that** I can find patterns and info across my meeting history

**Acceptance Criteria:**
- [ ] Dedicated Global Chat screen in sidebar
- [ ] Context includes all meeting summaries + action items
- [ ] Smart retrieval: AI searches relevant meetings for each question
- [ ] Example queries: "What did we decide about the API last month?", "Show all open action items for Sarah"
- [ ] Source attribution (links back to specific meetings)

### US-5.2: Global Tasks View
**As a** user
**I want** all action items from all meetings in one place
**So that** I have a unified task list

**Acceptance Criteria:**
- [ ] Aggregated action items from all meetings
- [ ] Grouped by meeting (with meeting link)
- [ ] Filterable: by status (open/done), by meeting, by assignee
- [ ] Sortable: by date, by priority
- [ ] Toggle done/undone updates source meeting
- [ ] Overdue indicators

### US-5.3: Global Timeline
**As a** user
**I want** a chronological timeline of all meeting events
**So that** I can see my meeting history at a glance

**Acceptance Criteria:**
- [ ] Vertical timeline with meeting cards
- [ ] Each card shows: title, date, duration, topic tags, action count
- [ ] Click to expand: shows summary + key decisions inline
- [ ] Click meeting title to navigate to full meeting view
- [ ] Filter by date range, search by keyword
- [ ] Infinite scroll / pagination

### US-5.4: Cross-Meeting Analytics Dashboard
**As a** user
**I want** aggregate analytics across all meetings
**So that** I can understand my meeting patterns

**Acceptance Criteria:**
- [ ] Total meetings this week/month
- [ ] Total meeting hours
- [ ] Most discussed topics (word cloud)
- [ ] Action item completion rate
- [ ] Meeting frequency chart (calendar heatmap)
- [ ] Average meeting duration trend

### US-5.5: Smart Search
**As a** user
**I want** powerful search across all meeting data
**So that** I can find anything quickly

**Acceptance Criteria:**
- [ ] Full-text search across transcripts, summaries, action items
- [ ] Filters: date range, has open actions, topic
- [ ] Search result previews with highlighted matches
- [ ] Keyboard shortcut to open search (Ctrl+K)

---

## P6 — Gamification System

### US-6.1: User Profile & XP System
**As a** user
**I want** to earn XP and level up by using the app
**So that** I feel progress and stay motivated

**Acceptance Criteria:**
- [ ] XP earned for: recording meetings (+50), completing action items (+20), maintaining streaks (+100/day), reviewing old meetings (+10), using AI chat (+5/question)
- [ ] Level system: Intern → Junior → Senior → Lead → VP → CEO → Board Member → Legendary
- [ ] Level displayed in sidebar with progress bar
- [ ] Level-up animation/notification
- [ ] XP history viewable

### US-6.2: Achievement Badges
**As a** user
**I want** to unlock achievements
**So that** I have goals to work toward

**Acceptance Criteria:**
- [ ] 30+ unique achievements across categories:
  - **Recording**: First Meeting, 10 Meetings, 100 Meetings, Marathon (2hr+), Early Bird (before 8am), Night Owl (after 8pm)
  - **Productivity**: Task Master (100 tasks done), Zero Inbox (all tasks done), Streak Lord (30-day streak)
  - **AI Power User**: First Chat, 100 Questions Asked, Insight Hunter (used global chat)
  - **Social**: Shared 10 meetings, Team Player (5 meetings with 3+ people)
  - **Hidden**: Easter eggs (record exactly at midnight, etc.)
- [ ] Toast notification on unlock
- [ ] Achievements gallery page
- [ ] Rarity tiers: Common, Rare, Epic, Legendary

### US-6.3: Daily/Weekly Streaks
**As a** user
**I want** to maintain streaks for consistent app usage
**So that** I build a productive habit

**Acceptance Criteria:**
- [ ] Daily streak: record or review at least one meeting per workday
- [ ] Weekly streak: complete all action items from the week
- [ ] Streak counter in dashboard with fire icon
- [ ] Streak freeze: 1 free pass per week (auto or purchasable with XP)
- [ ] Streak milestones: 7, 30, 90, 365 days with special badges

### US-6.4: Productivity Score
**As a** user
**I want** a daily/weekly productivity score
**So that** I can track my meeting effectiveness

**Acceptance Criteria:**
- [ ] Score formula: meetings recorded + action items completed + streak bonus + chat usage
- [ ] Weekly report notification (in-app)
- [ ] Historical score graph
- [ ] Personal best tracking
- [ ] Score breakdown (what contributed most)

### US-6.5: Meeting Insights Rewards
**As a** user
**I want** to discover "insights" as rewards
**So that** gamification feels useful, not gimmicky

**Acceptance Criteria:**
- [ ] AI-generated weekly insight: "You spent 40% more time in 1:1s this week"
- [ ] Monthly retrospective auto-generated
- [ ] "Patterns detected" notifications: "Your Tuesday standups run 2x longer than Thursday's"
- [ ] Unlock insights by reaching XP thresholds

### US-6.6: Challenges & Quests
**As a** user
**I want** weekly challenges to push me
**So that** the app stays fresh

**Acceptance Criteria:**
- [ ] Weekly challenge system: "Complete 5 action items", "Record 3 meetings", "Ask 10 AI questions"
- [ ] Challenge progress bar
- [ ] Bonus XP for challenge completion
- [ ] Challenge variety (rotates weekly from pool of 20+)

### US-6.7: Leaderboard-Ready Data Model
**As a** developer
**I want** the gamification data model to support future team leaderboards
**So that** when we add team features, leaderboard is trivial

**Acceptance Criteria:**
- [ ] `user_stats` table: xp, level, streak, achievements (JSON)
- [ ] `xp_events` table: event_type, xp_amount, timestamp, meeting_id
- [ ] `achievements` table: achievement_id, unlocked_at
- [ ] `challenges` table: challenge_id, progress, completed_at
- [ ] All gamification state in SQLite (local-first)
- [ ] Export stats as JSON (future: sync to team server)

---

## P7 — Enterprise Readiness

### US-7.1: Security Hardening
**As an** enterprise admin
**I want** the app to follow security best practices
**So that** it can be approved for corporate use

**Acceptance Criteria:**
- [ ] CSP (Content Security Policy) headers in Electron
- [ ] Context isolation verified (already in preload)
- [ ] No `nodeIntegration` in renderer
- [ ] API keys encrypted at rest (electron-store already encrypts)
- [ ] Audit: no eval(), no remote code execution
- [ ] Input sanitization on all IPC handlers
- [ ] Dependency audit (`npm audit` clean)
- [ ] SBOM (Software Bill of Materials) generation

### US-7.2: Logging & Observability
**As an** enterprise admin
**I want** structured logging
**So that** issues can be diagnosed

**Acceptance Criteria:**
- [ ] Structured logger (winston or electron-log)
- [ ] Log levels: error, warn, info, debug
- [ ] Log rotation (max 10MB, 5 files)
- [ ] Sensitive data redaction (API keys, transcript content)
- [ ] Crash reporting (local crash dumps)

### US-7.3: Data Management
**As an** enterprise user
**I want** to manage my data
**So that** I comply with data policies

**Acceptance Criteria:**
- [ ] Export all data (meetings, transcripts, notes) as JSON/ZIP
- [ ] Import data from export
- [ ] Delete all data (factory reset)
- [ ] Data retention policy setting (auto-delete after N days)
- [ ] Storage usage display in settings

### US-7.4: Configuration Management
**As an** enterprise admin
**I want** to pre-configure the app
**So that** I can deploy it with company settings

**Acceptance Criteria:**
- [ ] Config file support (`config.json` in app directory)
- [ ] Environment variable overrides
- [ ] Lock certain settings (admin-managed)
- [ ] Default provider configuration

### US-7.5: Architecture Documentation
**As a** developer/auditor
**I want** clear architecture documentation
**So that** I can understand the system

**Acceptance Criteria:**
- [ ] Architecture diagram (Mermaid)
- [ ] Data flow diagram (recording → transcription → summarization)
- [ ] Security model documentation
- [ ] API/IPC reference
- [ ] Provider plugin guide

### US-7.6: Automated Testing Foundation
**As a** developer
**I want** a testing framework
**So that** changes don't break existing features

**Acceptance Criteria:**
- [ ] Jest/Vitest configured
- [ ] Unit tests for: DB operations, provider registry, config store, parse-notes
- [ ] Integration test: IPC handler round-trip
- [ ] CI pipeline (GitHub Actions)
- [ ] Test coverage reporting

---

## P8 — MCP & A2A Protocol Support

### US-8.1: MCP Server Implementation
**As a** developer using Claude Code
**I want** Rekal to expose an MCP server
**So that** I can query my meetings from any MCP client

**Acceptance Criteria:**
- [ ] MCP server runs on configurable port (default: 3210)
- [ ] Starts automatically when app is running
- [ ] Toggle in Settings to enable/disable
- [ ] Authentication: local token-based auth

### US-8.2: MCP Tools (Resources)
**As an** MCP client user
**I want** rich tools for interacting with meetings
**So that** I can use Rekal as a knowledge base

**Acceptance Criteria:**
- [ ] `list_meetings` — list all meetings with filters
- [ ] `get_meeting` — full meeting details (transcript + notes)
- [ ] `search_meetings` — full-text search
- [ ] `get_action_items` — all action items (filterable)
- [ ] `ask_meeting` — AI Q&A about a specific meeting
- [ ] `ask_all_meetings` — AI Q&A across all meetings
- [ ] `get_meeting_stats` — analytics data

### US-8.3: A2A Protocol Support
**As a** developer
**I want** A2A (Agent-to-Agent) protocol support
**So that** other AI agents can interact with Rekal

**Acceptance Criteria:**
- [ ] A2A endpoint (HTTP/JSON-RPC)
- [ ] Agent card with capabilities description
- [ ] Task-based interaction (submit query → get result)
- [ ] Streaming support for long responses

### US-8.4: Connection Status & Management
**As a** user
**I want** to see and manage active connections
**So that** I know what's accessing my data

**Acceptance Criteria:**
- [ ] Connections panel in Settings
- [ ] Active connections list with client info
- [ ] Connection history/log
- [ ] Revoke access button
- [ ] Rate limiting per client

---

## P9 — Production Launch

### US-9.1: README & Landing Page
**As a** GitHub visitor
**I want** an impressive README
**So that** I immediately understand and want to try the app

**Acceptance Criteria:**
- [ ] Hero banner with app screenshot/GIF
- [ ] One-line value proposition
- [ ] Feature highlights with icons
- [ ] Quick start (3 steps)
- [ ] Architecture overview
- [ ] Comparison table (vs Otter.ai, Fireflies, etc.) — focus on local/privacy
- [ ] Contributing guide
- [ ] License (MIT)

### US-9.2: GitHub Repository Setup
**As a** project maintainer
**I want** proper GitHub repo configuration
**So that** the project looks professional

**Acceptance Criteria:**
- [ ] Repository description and topics
- [ ] Issue templates (bug, feature, question)
- [ ] PR template
- [ ] CONTRIBUTING.md
- [ ] CODE_OF_CONDUCT.md
- [ ] SECURITY.md
- [ ] GitHub Actions CI/CD
- [ ] Release workflow with auto-changelog

### US-9.3: Release Artifacts
**As a** user
**I want** downloadable releases
**So that** I can install without building from source

**Acceptance Criteria:**
- [ ] Windows installer (.exe) via electron-builder
- [ ] Portable version (.zip)
- [ ] Auto-update support (electron-updater)
- [ ] Code signing (or at least instructions)
- [ ] Release notes per version

### US-9.4: Positioning & Messaging
**As a** product owner
**I want** clear positioning
**So that** the app stands out in the market

**Acceptance Criteria:**
- [ ] Tagline: "Your meetings, your machine, your AI"
- [ ] Key differentiators: 100% local, no cloud, free, open-source, extensible
- [ ] Target personas defined: solo professionals, privacy-conscious teams, developers
- [ ] Comparison with alternatives documented

### US-9.5: Social Launch Kit
**As a** product owner
**I want** materials for launch
**So that** we can drive initial GitHub stars

**Acceptance Criteria:**
- [ ] Twitter/X thread draft
- [ ] Hacker News post draft
- [ ] Reddit post draft (r/selfhosted, r/productivity, r/electronjs)
- [ ] Product Hunt draft
- [ ] Demo video script/outline

---

## Implementation Progress Tracker

| Priority | Epic | Started | Completed | Notes |
|----------|------|---------|-----------|-------|
| P0 | Branding & Name | 2026-03-31 | 2026-03-31 | **Rekal** — "Total Recall for Your Meetings". Full codebase rebranded. |
| P1 | UI/UX Overhaul | 2026-03-31 | 2026-03-31 | Design tokens, sidebar, dark theme, 7 UI components, toast system |
| P2 | Ollama URL Config | 2026-03-31 | 2026-03-31 | Config store, all providers updated, Settings UI with test connection |
| P3 | Enhanced Output Tabs | 2026-03-31 | 2026-03-31 | Sentiment & Tone, Key Quotes, Follow-ups & Deadlines tabs |
| P4 | Per-Meeting AI Chat | 2026-03-31 | 2026-03-31 | Chat tab in Results, streaming for Ollama/OpenAI/Claude/Azure, DB persistence |
| P5 | Global AI Chat & Views | 2026-03-31 | 2026-03-31 | Dashboard, Global Tasks, Timeline, Global Chat, Search overlay (Ctrl+K) |
| P6 | Gamification System | 2026-03-31 | 2026-03-31 | XP, 10 levels, 17 achievements, streaks, challenges — full backend + UI |
| P7 | Enterprise Readiness | 2026-03-31 | 2026-03-31 | CSP, sandbox, input validation, structured logger, docs, CI, templates |
| P8 | MCP & A2A Protocols | 2026-03-31 | 2026-03-31 | 6 MCP tools (stdio), toggle from app. A2A deferred to v0.2.0. |
| P9 | Production Launch | 2026-03-31 | 2026-03-31 | README, LICENSE, CHANGELOG, Launch Kit, funding config |
