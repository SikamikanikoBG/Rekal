# Rekal

Rekal — Total Recall for Your Meetings. Local-first AI meeting note-taker for Windows. Records meetings, transcribes locally with faster-whisper, summarizes with user-chosen Ollama model.

## Stack
- **Shell**: Electron + React + TypeScript
- **Transcription**: faster-whisper (Python sidecar, CTranslate2, runs on CPU)
- **Summarization**: Ollama (user picks model)
- **Audio**: WASAPI loopback + microphone
- **Storage**: SQLite via better-sqlite3
- **Design**: Mockup A (minimal, Linear-inspired, light theme)

## Key Decisions
- Smart installer scans for existing deps before installing anything
- User chooses their own Ollama model (no hardcoded default)
- Whisper `small` model bundled, `medium`/`large` available as optional downloads
- No admin rights required — installs to %LOCALAPPDATA%
- Privacy-first: everything runs locally, no cloud calls

## Dev Commands
- `npm run dev` — start dev mode (main + renderer)
- `npm run build` — build for production
- `npm run package` — create installer

## Project Structure
- `src/main/` — Electron main process
- `src/renderer/` — React frontend
- `src/shared/` — Shared types
- `whisper-sidecar/` — Python faster-whisper wrapper
- `resources/` — Bundled binaries and models
