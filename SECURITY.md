# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in Rekal, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities.
2. Email the maintainers with a description of the vulnerability.
3. Include steps to reproduce the issue if possible.
4. Allow reasonable time for a fix before public disclosure.

We aim to acknowledge reports within 48 hours and provide a fix or mitigation plan within 7 days.

## Security Model

Rekal is designed as a **local-first** application. The core security principles are:

### Data Stays Local
- All audio recordings, transcripts, and meeting notes are stored locally in `%LOCALAPPDATA%\Rekal`.
- The SQLite database (`meetings.db`) never leaves the machine.
- No telemetry, analytics, or usage data is collected.

### Process Isolation
- The Electron renderer runs with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- All communication between renderer and main process goes through validated IPC handlers.
- Content Security Policy (CSP) headers restrict script execution and network connections.

### Credential Storage
- API keys (OpenAI, Anthropic, Azure) are stored in an encrypted config file via `electron-store`.
- Keys are never logged; the structured logger redacts fields named `apiKey`, `key`, `token`, `password`, and `secret`.

### Network Access
- By default, Rekal makes **no network requests**. The default providers (whisper-local + Ollama) run entirely on-device.
- Network access is only required when using cloud providers (OpenAI, Anthropic, Azure), and only to their respective API endpoints.
- CSP headers restrict `connect-src` to `self`, `localhost`, and known provider domains.

### Whisper Sidecar
- The Python faster-whisper sidecar runs as a local subprocess.
- It processes audio files from the local recordings directory and returns JSON output.
- No network access is required or made by the sidecar.

## Data Handling

### What is stored
- Audio recordings (WAV files) in `%LOCALAPPDATA%\Rekal\recordings\`
- Meeting data (transcripts, notes, bookmarks) in `%LOCALAPPDATA%\Rekal\meetings.db`
- Configuration and API keys in `%LOCALAPPDATA%\Rekal\config.json` (encrypted)
- Application logs in `%LOCALAPPDATA%\Rekal\logs\` (sensitive fields are redacted)

### What is NOT stored or transmitted
- No data is sent to any server unless you explicitly configure a cloud provider.
- No usage analytics or crash reports are transmitted.
- Audio is never uploaded unless you choose OpenAI Whisper API as your transcription provider.
