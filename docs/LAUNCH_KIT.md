# Social Launch Kit

Pre-written posts for launching Rekal across social platforms. Customize usernames, links, and screenshots before posting.

---

## Twitter/X Thread

**Tweet 1 (Hook):**
> I built a 100% local AI meeting note-taker.
>
> No cloud. No subscriptions. No data leaves your machine.
>
> Record. Transcribe. AI Notes. Chat with your meetings.
>
> It's open-source and free. Here's what it does:

**Tweet 2 (Recording):**
> It records system audio + your mic at the same time using WASAPI loopback.
>
> Click Record. Have your meeting. Click Stop.
>
> That's it. No bots joining your call. No "is it okay if I record this?" awkwardness.

**Tweet 3 (Transcription):**
> Transcription runs locally on your CPU with faster-whisper.
>
> No internet needed. No audio uploaded anywhere. The AI model runs right on your machine.
>
> Small model bundled out of the box. Medium and large available as optional downloads.

**Tweet 4 (AI Summaries):**
> Pick your own AI model for summarization:
>
> - Ollama (fully local, no API key)
> - OpenAI
> - Claude
> - Azure OpenAI
>
> You get structured notes: summary, action items, key decisions, topic tags.

**Tweet 5 (Chat):**
> The killer feature: chat with your meetings.
>
> "What did we decide about the timeline?"
> "List all action items assigned to Sarah."
> "Summarize the disagreements."
>
> Works per-meeting or across your entire meeting history.

**Tweet 6 (MCP):**
> It also runs as an MCP server.
>
> That means you can query your meeting data from Claude Code, Cursor, or any MCP client.
>
> Your meetings become a searchable knowledge base for your AI tools.

**Tweet 7 (CTA):**
> Rekal is:
> - 100% local (zero telemetry)
> - Free and open-source (MIT)
> - Windows-native (Electron + React + TypeScript)
> - Extensible (pluggable provider system)
>
> Star it, try it, break it, improve it:
> [GitHub link]

---

## Hacker News (Show HN)

**Title:**
```
Show HN: Rekal – 100% local AI meeting notes (Electron, whisper, Ollama)
```

**Body:**
```
Hi HN,

I built Rekal because I wanted AI meeting notes without sending my audio to the cloud.

It's an Electron app that records your system audio + mic, transcribes locally with faster-whisper, and generates structured notes with your choice of AI provider (Ollama for fully local, or OpenAI/Claude/Azure if you prefer).

Key features:
- One-click recording via WASAPI loopback (no bot joins your call)
- Local transcription on CPU — no internet needed
- Pluggable AI providers: Ollama, OpenAI, Claude, Azure OpenAI
- Chat with your meetings — ask AI questions about any transcript
- MCP server — use your meetings as a knowledge base from Claude Code or Cursor
- SQLite storage, encrypted credentials, structured logging
- No telemetry, no accounts, no data leaves your machine

Stack: Electron + React + TypeScript, faster-whisper (Python sidecar), better-sqlite3, electron-store.

I built this because every meeting note tool I tried either required uploading audio to someone else's server, needed a monthly subscription, or both. The local AI models are good enough now that there's no reason your meeting data needs to leave your machine.

Would love feedback on the architecture, provider system, or feature ideas.

GitHub: [link]
```

---

## Reddit Posts

### r/selfhosted

**Title:** `I built a self-hosted AI meeting note-taker — 100% local, no cloud, open source`

**Body:**
```
After getting frustrated with cloud-based meeting note tools that charge monthly and upload my audio, I built Rekal — a desktop app that does everything locally.

What it does:
- Records system audio + microphone
- Transcribes locally with faster-whisper (runs on CPU, no GPU needed)
- Generates AI summaries with Ollama (or OpenAI/Claude/Azure if you want)
- Lets you chat with your meetings and ask follow-up questions
- Stores everything in a local SQLite database

What makes it self-hosted friendly:
- Zero network calls in the default config (local whisper + Ollama)
- No accounts, no telemetry, no data collection
- MCP server built in — query your meetings from external tools
- Encrypted credential storage for cloud providers
- MIT licensed

Currently Windows-only (uses WASAPI for audio capture). Electron + React + TypeScript.

GitHub: [link]
```

### r/productivity

**Title:** `Free, open-source meeting note-taker that runs 100% on your machine`

**Body:**
```
I built a meeting note app that works without the cloud.

The problem: Tools like Otter.ai and Fireflies are great, but they upload your audio to their servers and charge monthly. If your meetings contain sensitive information, that's a dealbreaker.

My solution: Rekal records your meetings, transcribes them locally using AI, and generates structured notes — all on your own computer. Nothing is uploaded anywhere.

Features:
- One-click recording (captures both speaker output and your mic)
- AI transcription that runs on your CPU (no internet needed)
- Structured summaries with action items, key decisions, and topics
- Chat with any meeting — ask follow-up questions about what was discussed
- Gamification to keep you consistent (XP, achievements, streaks)
- Free and open-source (MIT license)

You pick your own AI model — Ollama for fully local, or plug in OpenAI/Claude if you prefer speed over privacy.

GitHub: [link]
```

### r/electronjs

**Title:** `Built a production Electron app — local AI meeting notes with whisper + Ollama`

**Body:**
```
Sharing my Electron + React + TypeScript project: Rekal — a local-first AI meeting note-taker.

Interesting Electron patterns used:
- WASAPI loopback audio capture via MediaRecorder
- Python sidecar process for faster-whisper transcription
- SQLite via better-sqlite3 with WAL mode
- Encrypted config store via electron-store
- Content Security Policy + context isolation + sandbox
- Structured JSON logger with sensitive field redaction
- MCP server running as a separate Node process
- IPC input validation with path traversal protection

Architecture: pluggable provider registry for both transcription and summarization. Adding a new AI provider means implementing one interface and registering it — no changes to core code.

The app records meetings, transcribes them with faster-whisper on CPU, and generates AI notes with Ollama (or cloud providers). Everything stays local by default.

Happy to answer questions about the Electron security model, the provider system, or the sidecar approach.

GitHub: [link]
```

### r/LocalLLaMA

**Title:** `Built a meeting note-taker powered by Ollama — record, transcribe, and summarize locally`

**Body:**
```
I built Rekal specifically because I wanted to use local LLMs for meeting notes instead of sending everything to the cloud.

How Ollama is used:
- You pick any Ollama model you want (no hardcoded default)
- Configurable Ollama URL (localhost:11434 by default, but supports remote instances)
- Structured summarization prompt that returns JSON (summary, action items, decisions, topics)
- Streaming responses so you see the AI thinking in real-time
- Per-meeting and global chat — ask questions about your transcripts

The transcription side uses faster-whisper (CTranslate2) running on CPU. Small model is bundled, medium/large available as optional downloads.

Full pipeline runs with zero internet access: WASAPI audio capture -> faster-whisper -> Ollama -> SQLite.

The app also supports OpenAI, Claude, and Azure OpenAI as alternative summarization providers if you want to compare output quality against your local models.

MIT licensed, Electron + React + TypeScript.

GitHub: [link]
```

---

## Product Hunt

**Tagline:**
```
100% local AI meeting notes — no cloud, no subscriptions, no data leaves your machine
```

**Description:**
```
Rekal records your meetings, transcribes them locally with faster-whisper, and generates AI-powered notes with your choice of model.

Everything runs on your machine. No audio is uploaded. No accounts required. No monthly fees.

Features:
- One-click recording (system audio + microphone)
- Local transcription on CPU (no internet needed)
- AI summaries with Ollama, OpenAI, Claude, or Azure
- Chat with your meetings — ask AI follow-up questions
- MCP server — use meetings as a knowledge base from other AI tools
- Gamification — XP, achievements, streaks to stay productive
- Enterprise security — CSP, encryption, audit logging

Built for anyone who takes meetings seriously but takes privacy more seriously.
```

**Topics:**
- Productivity
- Artificial Intelligence
- Open Source
- Privacy
- Developer Tools

**Maker Comment:**
```
Hi Product Hunt! I built Rekal because I wanted AI meeting notes without the privacy tradeoff.

Every tool I tried either uploaded my audio to the cloud, required a monthly subscription, or both. With local AI models being good enough now (faster-whisper for transcription, Ollama for summarization), there's no reason your meeting data needs to leave your machine.

The MCP integration is my favorite feature — it turns your meetings into a searchable knowledge base you can query from Claude Code or Cursor. "What did we decide about the API in last week's standup?" gets answered in seconds.

Happy to answer any questions!
```

---

## Launch Checklist

- [ ] Screenshots captured for all main screens
- [ ] Demo video or GIF recorded
- [ ] GitHub repo description and topics set
- [ ] GitHub release created with installer artifact
- [ ] README screenshot placeholders replaced with real images
- [ ] Star History chart URL updated with actual repo path
- [ ] Badge URLs updated with actual repo path
- [ ] All `[GitHub link]` placeholders replaced with actual URL
- [ ] Product Hunt ship page created
- [ ] Hacker News post scheduled (Tuesday or Wednesday, 9-10am ET)
- [ ] Reddit posts staggered (one per day over 4 days)
- [ ] Twitter thread scheduled
