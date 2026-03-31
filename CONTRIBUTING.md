# Contributing

Thank you for your interest in contributing to Rekal.

## Development Setup

### Prerequisites
- Node.js 20+
- npm
- Windows 10/11 (primary platform)
- Ollama (for summarization testing)
- Python 3.10+ with faster-whisper (for transcription testing)

### Getting Started

```bash
git clone <repo-url>
cd Rekal
npm install
npm run dev
```

This starts the Electron main process, React renderer (via Vite), and watches for changes.

### Build Commands
- `npm run dev` -- Start dev mode with hot reload
- `npm run build` -- Build main process (TypeScript) and renderer (Vite)
- `npm run package` -- Build and create Windows installer via electron-builder

## Project Structure

```
src/
  main/           # Electron main process
    audio/        # Recording file management
    config/       # Encrypted config store (electron-store)
    logging/      # Structured JSON logger
    providers/    # Pluggable transcription and summarization providers
      transcription/  # whisper-local, openai-whisper, azure-speech
      summarization/  # ollama, openai, claude, azure-openai
    setup/        # Dependency scanner and installer
    storage/      # SQLite database (better-sqlite3)
  renderer/       # React frontend (Vite + TypeScript)
  shared/         # Shared TypeScript types
whisper-sidecar/  # Python faster-whisper wrapper
resources/        # Bundled binaries, models, icons
```

## Code Style

- TypeScript strict mode for both main and renderer code.
- Use `const` by default; `let` only when reassignment is needed.
- IPC handlers must validate their inputs (type checks, path traversal checks).
- Never log sensitive data (API keys, tokens). Use the structured logger which auto-redacts sensitive fields.
- Keep the main process responsive -- use async operations for I/O.

## Pull Request Process

1. Fork the repository and create a feature branch from `main`.
2. Make your changes, ensuring they follow the code style above.
3. Test locally:
   - Run `npm run dev` and verify the feature works.
   - Run `npm run build` to ensure it compiles cleanly.
4. Fill out the pull request template completely.
5. A maintainer will review your PR and may request changes.

## Adding a New Provider

Rekal uses a pluggable provider system. To add a new transcription or summarization provider:

1. Create a new file in `src/main/providers/transcription/` or `src/main/providers/summarization/`.
2. Implement the `TranscriptionProvider` or `SummarizationProvider` interface (see `types.ts` in each directory).
3. Register the provider in `src/main/providers/index.ts`.
4. If the provider requires an API key, add the key name to `ConfigSchema['apiKeys']` in `src/main/config/store.ts`.

## Architecture Overview

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a detailed system architecture description.
