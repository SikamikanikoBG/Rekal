# Devil's Advocate: Rekal — Local-First AI Meeting Note-Taker

**Author:** Devil's Advocate (Senior Product Critic)
**Date:** 2026-03-29
**Status:** Pre-development critical analysis
**TL;DR:** This product has a real market gap — but only if you resist the urge to build everything and instead nail transcription quality + dead-simple UX. A 7B model will disappoint if you let it try to be ChatGPT. Most of your users will quit within 48 hours if the transcript is bad or the app eats their laptop's RAM during a live meeting.

---

## Part 1: Risks & Hard Problems

### What Will ACTUALLY Go Wrong

**1. Audio quality is your silent killer.**

You're building for enterprise Windows laptops. That means:
- Terrible built-in microphones on ThinkPads and Latitudes
- Conference rooms where the laptop is 8 feet from half the speakers
- Bluetooth headsets that randomly switch profiles mid-meeting
- System audio capture from Teams/Zoom competing with the mic input for the same audio device
- Echo cancellation creating artifacts that whisper.cpp will hallucinate on
- Background HVAC noise in every corporate office on Earth

The user will blame YOUR product for bad audio, not their hardware. Every time.

**2. Transcription errors with accents and jargon will erode trust fast.**

whisper.cpp is good. It is not good enough for:
- Heavy Indian, Chinese, Japanese, or Eastern European accents (the majority of enterprise meeting participants globally)
- Domain-specific jargon: medical terms, legal terms, financial acronyms, internal company codenames
- Cross-talk (multiple speakers at once — happens in literally every meeting)
- Speaker diarization — whisper.cpp doesn't natively do this well. "Who said what" is as important as "what was said"
- Code-switching (participants mixing English with another language mid-sentence)

Accuracy will hover around 80-90% for real-world enterprise meetings. Academic benchmarks mean nothing here. Users will see the 10-20% errors, not the 80-90% accuracy.

**3. Ollama 7B quality is going to disappoint everyone.**

Let's be brutally honest about what a 7B parameter model can and cannot do:

| Task | 7B Reality | User Expectation |
|------|-----------|-----------------|
| Summarize a clean transcript | Decent | Great — they want ChatGPT quality |
| Summarize a messy transcript with errors | Garbage in, garbage out | Magic error correction |
| Extract action items | Misses nuanced/implicit items | Catches everything |
| Identify who owns each action item | Frequently wrong | Perfect attribution |
| Handle 60-min meeting transcript | Context window overflow or severe degradation | Works seamlessly |
| Generate "insights" or "key decisions" | Generic platitudes | Genuine insight |
| Multi-language meetings | Barely functional | Seamless |

A 7B model will produce summaries that are *just good enough* to seem useful but *just wrong enough* to require the user to verify everything — which defeats the purpose.

**4. RAM and CPU on enterprise laptops.**

Your stack requires simultaneously:
- whisper.cpp transcription (needs 1-4 GB RAM depending on model size, significant CPU/GPU)
- Ollama running a 7B model (needs 4-8 GB RAM minimum)
- The meeting app itself (Teams/Zoom: 500MB-1.5GB RAM)
- Your Electron/Tauri app (200MB-500MB)
- Windows + other enterprise bloatware (4-6 GB baseline)

**Total: 10-20 GB RAM needed.** Most enterprise laptops ship with 16 GB. Many still have 8 GB. You will make their laptop unusable during meetings — the ONE time performance matters most.

Real-time transcription on CPU (no GPU) for whisper.cpp medium model: expect 2-5x slower than real-time on a typical i7 enterprise laptop. Users will see growing lag during the meeting.

**5. IT policies will block you.**

Enterprise Windows laptops are managed by:
- Microsoft Intune / SCCM / Group Policy
- Application whitelisting (only approved .exe can run)
- Microphone access policies (often restricted to approved apps)
- Network policies that may block Ollama model downloads
- Disk encryption and limited disk space for models (whisper model + 7B LLM = 4-8 GB)

Getting on the approved software list takes 3-18 months at most enterprises. This is not a technical problem — it's a go-to-market wall.

### Where Users Will Abandon the Product

1. **First 5 minutes:** Setup requires downloading whisper model + LLM model (5-10 GB). User sees a progress bar, gets bored, never comes back.
2. **First meeting:** Transcript quality is noticeably worse than Teams' built-in transcription or Otter.ai. Trust is broken.
3. **After first summary:** The 7B summary misattributes an action item or misses a key decision. User manually corrects it, thinks "I could've just written notes myself."
4. **Week two:** The app slowed down their laptop during an important client call. They uninstall.
5. **Month one:** They realize they never go back and READ the meeting notes. The core value prop evaporates.

### What Competitors Do That We CAN'T Match Locally

| Competitor | Capability | Why Local Can't Match It |
|-----------|-----------|------------------------|
| Otter.ai | Real-time cloud transcription with custom vocabulary | They use massive server-side models fine-tuned on millions of hours. Your whisper.cpp small/medium model can't compete on accuracy. |
| Fireflies.ai | Automatic meeting bot that joins calls | They inject a bot into Zoom/Teams. You're relying on system audio capture — far less reliable. |
| Microsoft Copilot (Teams) | Native Teams integration, speaker ID, org chart awareness | They OWN the platform. You're screen-scraping or capturing audio externally. |
| Notion AI / Mem | Cloud-based RAG across all notes + meetings | A 7B local model can't do meaningful cross-meeting RAG. Context window too small, reasoning too weak. |
| Granola | Clean summary UX with GPT-4 quality | GPT-4/Claude quality summaries are 10-50x better than 7B. Users WILL notice. |

**The hard truth:** The ONLY advantage of local-first is privacy. If users don't deeply care about privacy (most don't until a breach happens), you lose on every other dimension.

### Privacy Claims — Are They Really True?

"Everything stays on your machine" sounds great. But let's stress-test it:

- **System audio capture records EVERYTHING** playing through speakers. If someone shares their screen with Slack messages, personal notifications, or plays a YouTube video — your app captured that audio. Is that "private"?
- **What about other meeting participants?** You're recording THEIR voices without server-side encryption or access controls. The recording lives as a raw file on one person's unencrypted laptop.
- **Enterprise DLP (Data Loss Prevention) tools** scan local files. Your meeting transcripts containing sensitive business discussions will be flagged and potentially uploaded to corporate security tools — breaking the "local only" promise without you even knowing.
- **Windows telemetry and cloud backup.** If the user has OneDrive backup enabled (many enterprise configs do this by default), your "local" files get synced to Microsoft's cloud automatically.
- **Crash dumps and logs.** If your app crashes, Windows Error Reporting may send transcript fragments to Microsoft.

**The privacy story is more nuanced than "it's local, therefore it's private."** You need to explicitly address these edge cases or you'll face a PR crisis when someone discovers their "private" transcripts in OneDrive.

### Legal Risks

**Recording consent laws are a minefield:**

- **Two-party/all-party consent states (USA):** California, Florida, Illinois (BIPA!), and 9+ other states require ALL participants to consent to recording. Your app makes it trivially easy to violate this.
- **GDPR (EU):** Recording meeting participants' voices is processing personal biometric data. You need explicit consent, a legal basis, data retention policies, and right-to-deletion mechanisms. Just storing a .wav file locally doesn't exempt you.
- **Canada (PIPEDA):** Similar consent requirements.
- **Germany:** Particularly strict — recording without consent can be a criminal offense, not just civil.

**Your liability exposure:**
- If an enterprise customer records a meeting illegally using your tool, they WILL blame the tool.
- "But we just provide the technology" is not a viable defense for brand reputation.
- You need consent mechanisms, recording indicators, and prominent legal disclaimers. This is not optional — it's a product requirement.

---

## Part 2: Product Killers to Avoid

### Features That Sound Cool But Will Be Mediocre with 7B

1. **"AI-generated action items with owners and deadlines"** — A 7B model cannot reliably distinguish "John, can you look into that?" (action item) from "John looked into that last week" (past event). It will produce action items that are 60% right, which is worse than 0% (because now you have to verify all of them).

2. **"Meeting sentiment analysis"** — This will be comically wrong. A 7B model will call a heated budget negotiation "positive" because people said "great" and "thanks" at the end.

3. **"Smart meeting templates"** — Users don't want to categorize their meetings upfront. They want to press Record and get useful output. Templates add friction.

4. **"Cross-meeting insights and trends"** — A 7B model with a 4K-8K context window cannot meaningfully reason across multiple meeting transcripts. This will produce generic observations like "communication was a recurring theme."

5. **"Auto-generated charts and visualizations"** — Charts of WHAT? Meeting duration? Word count? These are vanity metrics. No one will look at them twice.

6. **"Smart search across meeting library"** — Local vector search with a 7B embedding model will return frustratingly irrelevant results compared to what users expect from Google/ChatGPT-level search.

### The Overpromise Trap

The #1 way this product dies: you market it as an "AI meeting assistant" and users expect ChatGPT-in-a-meeting. They get a 7B model that produces B-minus summaries of C-plus transcripts. The gap between expectation and reality is where products go to die.

**Never use these phrases in marketing:**
- "Never miss a detail" (they will miss details)
- "Perfect meeting notes" (they won't be perfect)
- "AI-powered insights" (a 7B model doesn't have insights)
- "Replaces your note-taker" (it doesn't — it supplements)

### Configuration Death

If your setup process involves ANY of these, you'll lose 50%+ of users:
- "Choose your whisper model size"
- "Configure your Ollama endpoint"
- "Select your audio input device" (without auto-detection)
- "Set your preferred summary format"
- "Create a template for your meeting type"

Users want to install and press ONE button. Every configuration screen is a user lost.

---

## Part 3: What MUST Work Perfectly

### Non-Negotiable Features (Ranked)

1. **Audio capture that "just works"** — Detects mic, captures system audio, handles device switching. If this fails even once, trust is gone forever.

2. **Transcription quality above 85% word accuracy** — Below this threshold, the transcript becomes more work to fix than writing notes from scratch. Use whisper medium or large model, not small/tiny.

3. **Processing speed under 5 minutes for a 30-minute meeting** — Users want notes IMMEDIATELY after a meeting ends. If they have to wait 15 minutes, they'll write their own notes and forget about your app.

4. **Summary that captures the 3-5 key points** — Not 20 bullet points. Not a wall of text. Three to five things that actually matter. This is where prompt engineering on the 7B model is critical.

5. **One-click export/copy** — Get the notes into where the user actually works (email, Slack, Notion, Jira). If it takes more than one click, they'll screenshot instead.

### Quality Thresholds

| Metric | Minimum Viable | Target | Product-Killer Below |
|--------|---------------|--------|---------------------|
| Word accuracy (clean audio) | 88% | 93%+ | < 82% |
| Word accuracy (noisy/accented) | 78% | 85%+ | < 70% |
| Summary captures main decisions | 3 of 5 | 5 of 5 | < 2 of 5 |
| Action item detection | 60% recall | 80% recall | < 40% |
| Processing time (30 min meeting) | 5 min | 2 min | > 10 min |
| RAM usage during recording | < 2 GB | < 1 GB | > 4 GB |
| RAM usage during processing | < 8 GB | < 6 GB | > 12 GB |

### Performance Thresholds

- **Recording start:** < 2 seconds from button press to active recording
- **Live transcription lag:** < 10 seconds behind real-time (if offering live preview)
- **Post-meeting processing:** User should see SOMETHING within 30 seconds (even partial results)
- **App startup to ready state:** < 5 seconds (Ollama preload can happen lazily)
- **Total disk footprint:** < 10 GB including models — enterprise laptops have limited space

---

## Part 4: Contrarian Recommendations

### Features to CUT

1. **CUT: Charts and analytics dashboard.** Nobody needs a pie chart of their meeting time. This is a feature for pitch decks, not users.

2. **CUT: Meeting templates.** Let the AI figure out the meeting type from context. Don't make the user choose upfront.

3. **CUT: Meeting library with advanced search.** For v1, a simple chronological list with text search is enough. Don't build a database product.

4. **CUT: Real-time live transcription display.** This is technically hard, resource-intensive, and distracting during meetings. Transcribe AFTER the meeting. Users should be paying attention to the meeting, not watching a transcript scroll.

5. **CUT: Speaker diarization in v1.** Get the words right first. Attributing who said what is a secondary problem that adds enormous complexity.

6. **CUT: Custom LLM prompt configuration.** Users don't know what a prompt is. Give them one good output format.

7. **CUT: Multi-language support in v1.** English-first. Get it right for one language before attempting others.

### The ONE Thing to Nail

**A clean, accurate transcript with a short, honest summary.**

That's it. Not action items. Not insights. Not charts. Not templates.

Record → Transcribe → Summarize (3-5 bullets) → Copy to clipboard.

If the transcript is 90%+ accurate and the summary captures the key points, users will forgive everything else. If the transcript is bad, nothing else matters.

The summary should be SHORT. Five bullet points maximum. Each bullet should be one sentence. The user should be able to paste it into Slack and have their team understand what happened.

### Handling the "7B Models Aren't That Smart" Reality

**Strategy: Use the LLM for LESS, not MORE.**

1. **Summarization only.** Don't ask the 7B to extract action items, identify decisions, detect sentiment, or generate insights. Ask it to do ONE thing: summarize the transcript into 3-5 bullet points.

2. **Chunked processing.** Break the transcript into 10-minute chunks, summarize each, then summarize the summaries. This stays within context window limits and produces better results.

3. **Extractive, not abstractive.** Bias the prompt toward pulling KEY QUOTES from the transcript rather than generating new text. A 7B model quoting the transcript is more trustworthy than a 7B model paraphrasing it.

4. **Show your work.** Display the full transcript alongside the summary. Let users see exactly where the summary came from. Transparency builds trust when AI quality is imperfect.

5. **Provide manual editing as a FIRST-CLASS feature.** The transcript WILL have errors. Make it trivially easy to click on any word and fix it. This isn't a failure state — it's the expected workflow.

6. **Consider offering optional cloud processing.** I know "local-first" is the brand. But give power users the OPTION to send transcripts to GPT-4/Claude for better summaries. Make it opt-in, with clear privacy trade-off messaging. Some users will gladly trade privacy for quality.

### Final Uncomfortable Truths

1. **Microsoft will eat your lunch.** Copilot in Teams already does most of this, cloud-powered, with zero setup. Your only moat is "works without cloud" — that's a niche, not a market.

2. **The privacy audience is smaller than you think.** Most enterprise users will choose "better notes via cloud" over "worse notes but private." Your true audience is regulated industries (healthcare, legal, finance, government) and privacy-conscious individuals. Size that market honestly.

3. **"Local-first" is a CONSTRAINT, not a FEATURE.** Don't market the architecture. Market the outcome: "Meeting notes that never leave your laptop." Users don't care about whisper.cpp or Ollama. They care about their notes being private and useful.

4. **You're competing with a pen and paper.** Many users' alternative to your product isn't Otter.ai — it's jotting three bullet points in a notebook. Your product needs to be BETTER than that low bar, not just more automated.

5. **Ship something that works in 30 days or you'll over-engineer it to death.** Every meeting note app in history has died from feature creep. Build the record-transcribe-summarize pipeline, put it in front of 10 real users, and iterate from there.

---

## Summary Recommendation

**Build the world's best local transcription-to-summary pipeline. Nothing else. Ship it in a month. Let users tell you what's missing instead of guessing.**

The mockup at `mockup_d_pragmatic.html` reflects this philosophy: a brutally simple interface that acknowledges its own limitations, handles errors gracefully, and does one thing well.
