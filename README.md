<div align="center">

# Rekal

**Total Recall for Your Meetings**

*Your meetings. Your machine. Your AI.*

100% local AI meeting notes — record, transcribe, summarize, and chat with your meetings.
No cloud. No subscriptions. No data leaves your computer.

<!-- [Screenshot: main dashboard with dark theme, sidebar, and meeting list] -->

[![CI](https://img.shields.io/github/actions/workflow/status/user/rekal/ci.yml?style=flat-square&label=CI)](./../../actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](./CONTRIBUTING.md)
[![Version](https://img.shields.io/badge/version-0.1.0-orange.svg?style=flat-square)](./CHANGELOG.md)

[Download](#quick-start) | [Features](#features) | [MCP Integration](#mcp-integration) | [Development](#development)

</div>

---

## Why Rekal?

| | |
|---|---|
| **Privacy by design** | Your audio, transcripts, and notes never leave your machine. Zero telemetry. Zero cloud. |
| **No subscriptions** | Free and open-source. No monthly fees, no per-minute charges, no usage limits. |
| **Works offline** | Local whisper transcription + local Ollama models. No internet required. |
| **Your choice of AI** | Plug in Ollama, OpenAI, Claude, or Azure OpenAI. Switch providers anytime. |

---

## Features

<table>
<tr>
<td width="33%" valign="top">

### One-Click Recording
Record system audio (WASAPI loopback) and your microphone simultaneously. Bookmark important moments during the meeting.

</td>
<td width="33%" valign="top">

### Local Transcription
Transcribe with faster-whisper running on your CPU. No internet needed. Small model bundled; medium and large available as optional downloads.

</td>
<td width="33%" valign="top">

### AI-Powered Notes
Generate structured meeting summaries, action items, key decisions, and topic tags. Choose your provider and model.

</td>
</tr>
<tr>
<td valign="top">

### Chat With Your Meetings
Ask AI questions about any transcript. Per-meeting and global chat with streaming responses. Conversation history is saved.

</td>
<td valign="top">

### Global Knowledge Base
Search across all meetings. Ask AI questions that span your entire meeting history. Full-text search with highlighted results.

</td>
<td valign="top">

### MCP Integration
Expose your meetings as an MCP server. Query your meeting data from Claude Code, Cursor, or any MCP-compatible client.

</td>
</tr>
<tr>
<td valign="top">

### Gamification
Earn XP, level up, unlock achievements, and maintain streaks. Weekly challenges keep you productive without feeling forced.

</td>
<td valign="top">

### Enterprise Ready
Content Security Policy, context isolation, sandboxed renderer, encrypted credential storage, structured logging with rotation, and audit trail.

</td>
<td valign="top">

### Privacy First
Everything runs locally. No accounts, no sign-ups, no data collection. Your meetings are yours alone.

</td>
</tr>
</table>

---

## Quick Start

### 1. Download

Grab the latest installer from the [Releases](./../../releases) page.

### 2. Install

Run the installer. No admin rights required — installs to `%LOCALAPPDATA%`. The smart installer detects existing dependencies (Ollama, Python) and skips what you already have.

### 3. Record

Click **Record**, have your meeting, click **Stop**. Rekal transcribes and summarizes automatically.

> **Prerequisites:** [Ollama](https://ollama.com) must be installed and running with at least one model pulled (e.g. `ollama pull llama3`). For fully local operation, no other setup is needed.

---

## How It Works

```
                    +-------------------+
                    |   Your Meeting    |
                    +--------+----------+
                             |
                    WASAPI loopback + mic
                             |
                    +--------v----------+
                    |  Audio Recording  |
                    |   (WAV file)      |
                    +--------+----------+
                             |
                    +--------v----------+
                    |   Transcription   |
                    |  faster-whisper   |   <-- runs on CPU, no internet
                    |  (or cloud API)   |
                    +--------+----------+
                             |
                    +--------v----------+
                    |   Summarization   |
                    |  Ollama / OpenAI  |   <-- your choice of provider
                    |  Claude / Azure   |
                    +--------+----------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v---+  +------v------+  +----v-------+
     |  Summary   |  |   Action    |  |    Chat    |
     |  & Topics  |  |   Items     |  |   with AI  |
     +------------+  +-------------+  +------------+
              |              |              |
              +--------------+--------------+
                             |
                    +--------v----------+
                    |  SQLite Database  |   <-- local, portable, yours
                    +-------------------+
```

---

## MCP Integration

Rekal includes an MCP (Model Context Protocol) server that lets external tools query your meeting data. Use it as a knowledge base from Claude Code, Cursor, or any MCP-compatible client.

### Setup

Add to your MCP client configuration (e.g., `.claude/mcp.json`):

```json
{
  "mcpServers": {
    "rekal": {
      "command": "node",
      "args": ["<path-to-rekal>/dist/main/main/mcp/server.js"],
      "transport": "stdio"
    }
  }
}
```

Or build and run directly:

```bash
npm run build:mcp
npm run mcp
```

### Available Tools

| Tool | Description |
|------|-------------|
| `list_meetings` | List all meetings with optional search filter and pagination |
| `get_meeting` | Get full meeting details — transcript, notes, bookmarks |
| `search_meetings` | Full-text search across titles, transcripts, and notes |
| `get_action_items` | Get action items across meetings, filter by status or meeting |
| `get_transcript` | Get the full timestamped transcript for a meeting |
| `get_meeting_stats` | Analytics — global stats or per-meeting breakdown |

### Example Queries from Claude Code

```
"What action items are still open from last week's meetings?"
"Search my meetings for discussions about the API redesign"
"Give me stats on how many meetings I had this month"
```

---

## Providers

### Transcription

| Provider | Network | Notes |
|----------|---------|-------|
| **Local Whisper** (default) | None | faster-whisper on CPU. Bundled `small` model; `medium`/`large` optional. |
| OpenAI Whisper API | OpenAI | Requires API key. Uploads audio to OpenAI. |
| Azure Speech | Azure | Requires key + region. |

### Summarization

| Provider | Network | Notes |
|----------|---------|-------|
| **Ollama** (default) | localhost | Fully local. You pick the model. Configurable URL. |
| OpenAI | OpenAI | GPT models. Requires API key. |
| Claude | Anthropic | Claude models. Requires API key. |
| Azure OpenAI | Azure | Requires key + endpoint + deployment name. |

> Both defaults (Local Whisper + Ollama) require **zero internet access**. Your data stays on your machine.

---

## Screenshots

<!--
Screenshots will be added before launch. Planned screenshots:

1. Dashboard — home screen with quick-record button and recent meetings
2. Recording — live waveform with bookmarks and elapsed time
3. Meeting Results — transcript, summary, action items, and chat tabs
4. AI Chat — per-meeting conversation with streaming responses
5. Settings — provider configuration and preferences
6. Gamification — XP, achievements, and streak display
-->

*Screenshots coming soon.*

---

## Architecture

Rekal is an Electron + React + TypeScript application with a pluggable provider system.

```
src/
  main/              Electron main process
    audio/           Recording file management
    config/          Encrypted config store (electron-store)
    logging/         Structured JSON logger with rotation
    mcp/             MCP server (stdio transport)
    providers/       Pluggable transcription + summarization providers
    storage/         SQLite database (better-sqlite3, WAL mode)
  renderer/          React frontend (Vite + TypeScript)
  shared/            Shared TypeScript types
whisper-sidecar/     Python faster-whisper wrapper
resources/           Bundled binaries, models, icons
```

Key design decisions:
- **Context isolation** — renderer is sandboxed with no Node.js access
- **IPC validation** — all handler inputs are type-checked and sanitized
- **Provider registry** — add new AI providers without touching core code
- **Local-first storage** — SQLite with WAL mode, no cloud sync

For the full architecture documentation, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

---

## Comparison

| Feature | Rekal | Otter.ai | Fireflies.ai | Krisp | Granola |
|---------|-----------|----------|---------------|-------|---------|
| **100% Local** | Yes | No | No | Partial | No |
| **Open Source** | Yes (MIT) | No | No | No | No |
| **Free** | Yes | Freemium | Freemium | Freemium | Freemium |
| **No Account Required** | Yes | No | No | No | No |
| **Custom AI Models** | Yes | No | No | No | No |
| **Offline Mode** | Yes | No | No | Partial | No |
| **Data Ownership** | Full | Cloud | Cloud | Cloud | Cloud |
| **MCP Integration** | Yes | No | No | No | No |
| **Zero Telemetry** | Yes | No | No | No | No |
| **Self-Hosted** | Yes | No | No | No | No |

---

## Development

### Prerequisites

- Node.js 20+
- npm
- Windows 10/11
- [Ollama](https://ollama.com) (for summarization)
- Python 3.10+ with faster-whisper (for local transcription)

### Setup

```bash
git clone <repo-url>
cd Rekal
npm install
npm run dev
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev mode with hot reload (main + renderer) |
| `npm run build` | Build main process (TypeScript) and renderer (Vite) |
| `npm run package` | Build and create Windows installer via electron-builder |
| `npm run build:mcp` | Build MCP server only |
| `npm run mcp` | Run MCP server (stdio) |

### Building Executables

Rekal can be packaged as standalone Windows executables — no Node.js or dev tools required on the target machine.

```bash
# Build everything (installer + portable)
npm run package

# Or build specific targets:
npx electron-builder --win nsis       # NSIS installer (.exe)
npx electron-builder --win portable   # Single portable .exe
```

Output goes to the `release/` folder:

| File | Size | Description |
|------|------|-------------|
| `Rekal-Setup-0.1.0.exe` | ~87 MB | **Installer** — installs to `%LOCALAPPDATA%`, no admin rights needed. Creates desktop & Start Menu shortcuts. Includes uninstaller. |
| `Rekal-Portable-0.1.0.exe` | ~78 MB | **Portable** — single file, no installation. Copy to USB, network share, or any folder and double-click to run. |

**For enterprise/corporate laptops:** Use the portable `.exe` — zero installation, no registry changes, no admin permissions required. Just copy and run.

> **Note:** The executables are not code-signed. Windows SmartScreen may show a warning on first launch — click "More info" → "Run anyway". For production distribution, add a code signing certificate in `electron-builder.yml`.

---

## Contributing

We welcome contributions of all kinds. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, code style guidelines, and the PR process.

**Adding a new AI provider?** The pluggable registry makes it straightforward — see the [provider guide](./CONTRIBUTING.md#adding-a-new-provider) in the contributing docs.

---

## Security

Rekal is designed with security as a core principle. See [SECURITY.md](./SECURITY.md) for:

- Security model and threat boundaries
- How credentials are stored and protected
- How to report vulnerabilities
- CSP, sandbox, and isolation details

---

## License

[MIT](./LICENSE) -- use it, modify it, ship it.

---

<div align="center">

**Built for people who believe their meeting data belongs to them.**

[Report Bug](./../../issues) | [Request Feature](./../../issues) | [Discussions](./../../discussions)

<!-- Star History placeholder
[![Star History Chart](https://api.star-history.com/svg?repos=user/rekal&type=Date)](https://star-history.com/#user/rekal&Date)
-->

</div>
