# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-31

### Added
- One-click meeting recording with WASAPI loopback + microphone capture
- Local transcription via faster-whisper (CPU-based, no internet required)
- AI summarization with multiple providers (Ollama, OpenAI, Claude, Azure OpenAI)
- Per-meeting AI chat with streaming responses and conversation persistence
- Global AI chat across all meetings
- Gamification system — XP, 10 levels, 17 achievements, streaks, and weekly challenges
- MCP server with 6 tools for external tool integration (stdio transport)
- Dark theme UI with sidebar navigation and design token system
- Configurable Ollama URL with connection testing
- Export as Markdown, Meeting Minutes, or Email
- SQLite local storage with WAL mode and full-text search
- Structured JSON logging with rotation and sensitive field redaction
- Enterprise security — CSP, context isolation, sandbox, input validation
- GitHub Actions CI pipeline
- Issue templates (bug report, feature request) and PR template
- Architecture documentation, security policy, and contributing guide
