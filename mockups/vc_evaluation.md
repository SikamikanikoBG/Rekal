# Investment Memo: Rekal
## Local-First AI Meeting Intelligence for Enterprise Windows

**Fund:** [Redacted] Ventures | **Deal Lead:** Partner Evaluation
**Stage:** Pre-Seed / Seed | **Date:** March 2026
**Verdict:** Conditional Pass -- proceed to partner meeting with caveats noted below

---

## 1. Executive Summary

Rekal is a fully local, privacy-first AI meeting note-taker for enterprise Windows environments. It captures system audio and microphone input, transcribes via whisper.cpp, and generates structured meeting notes (summaries, action items, charts) using locally-hosted LLMs via Ollama. Zero data leaves the device.

**The thesis:** Enterprises want AI meeting intelligence but cannot tolerate SaaS data exfiltration. The local-first architecture turns a regulatory liability into a product advantage. If executed correctly, this is the "enterprise Signal" of meeting tools -- winning not despite privacy constraints but because of them.

---

## 2. Market Analysis

### TAM / SAM / SOM

| Segment | Estimate | Basis |
|---------|----------|-------|
| **TAM** (Global Meeting Productivity Software) | $18-22B by 2028 | Includes transcription, scheduling, analytics, note-taking. Growing ~18% CAGR from ~$9B in 2024. |
| **SAM** (AI Meeting Transcription & Notes, Enterprise) | $5-7B | Enterprise segment of AI-powered meeting tools. Excludes consumer, scheduling-only, and non-AI tools. |
| **SOM** (Privacy-First / On-Prem / Local Meeting AI, Windows Enterprise) | $800M-1.5B | Regulated industries (finance, healthcare, legal, defense, government) + privacy-conscious enterprises on Windows. This is the beachhead. |

**TAM Trajectory:** The overall market is expanding rapidly as AI transcription quality has crossed the "good enough" threshold. Gartner estimates 75% of enterprise meetings will have some AI augmentation by 2028, up from <15% in 2024.

### "Why Now?" -- Macro Timing

This product sits at the intersection of five converging forces:

1. **Local LLMs crossed the quality threshold (2024-2025).** Whisper.cpp runs real-time on consumer hardware. Llama 3, Mistral, Phi-3, and Qwen models run summarization tasks at near-GPT-3.5 quality on 16GB RAM laptops. This was impossible 18 months ago.

2. **Enterprise AI privacy backlash is peaking.** Samsung banned ChatGPT after source code leaks. JPMorgan restricted it. Italy banned it outright. Every Fortune 500 CISO is writing "acceptable use" policies for AI tools. A product that says "nothing leaves your laptop" short-circuits the entire procurement objection.

3. **Regulatory tailwind is accelerating.** EU AI Act (effective 2025-2026), updated HIPAA guidance on AI, SOC 2 Type II requirements for AI vendors, GDPR enforcement actions on AI training data. Every regulation makes cloud AI harder to procure and local AI more attractive.

4. **Remote/hybrid work is permanent.** 58% of knowledge workers are hybrid (Gallup 2025). Meeting volume has increased 150% since 2020. The pain of "meeting overload without notes" is universal and growing.

5. **Windows enterprise dominance persists.** Despite Mac gains in startups, Windows still runs on 72% of enterprise desktops (Gartner 2025). Building Windows-first is contrarian in the startup world but correct for the enterprise buyer.

### Competitive Landscape

| Competitor | Model | Strength | Weakness vs. Rekal |
|-----------|-------|----------|----------------------|
| **Otter.ai** | Cloud SaaS | Brand, integrations, network effects | All data in cloud. Blocked by many enterprises. |
| **Fireflies.ai** | Cloud SaaS | Automation, CRM integration | Same cloud exposure. Per-seat SaaS pricing friction. |
| **Microsoft Copilot (Teams)** | Cloud (Azure) | Distribution, bundled with M365 | Requires Teams + E5 licensing. Data still in Azure. Not meeting-agnostic. |
| **Granola** | Cloud/local hybrid | Beautiful UX, AI-enhanced notes | Mac-only. Not fully local. Limited enterprise features. |
| **Krisp** | Local audio processing | Noise cancellation + transcription | Transcription is secondary feature. Limited AI notes. |
| **Tactiq** | Browser extension | Cross-platform, easy setup | Chrome-only. Cloud processing. No desktop capture. |
| **Recall.ai** | API/Infrastructure | Powers other apps | B2B API, not end-user product. |

**Positioning Matrix:**

```
                    Cloud ────────────────── Local
                      │                        │
    Consumer ─────── Otter ─── Granola          │
         │          Fireflies    │              │
         │            │          │              │
         │            │          │              │
    Enterprise ── MS Copilot ────────── Rekal ◄── WHITE SPACE
         │            │                        │
         │          Recall.ai                  │
```

**The gap is real:** There is no well-funded, polished, local-first AI meeting tool targeting Windows enterprise users. This is the white space.

---

## 3. Moat Assessment

### What IS Defensible

1. **Enterprise procurement relationships.** Once you're approved by a CISO and embedded in procurement, switching costs are enormous. Enterprise security reviews take 3-6 months. Each approval is a mini-moat.

2. **Local model optimization know-how.** Running whisper.cpp + Ollama efficiently on heterogeneous enterprise hardware (varying GPUs, RAM, CPU generations) is genuinely hard engineering. The team that solves "works on a 3-year-old ThinkPad with 16GB RAM" has real technical moat.

3. **Template and workflow library.** Industry-specific meeting templates (legal depositions, medical consultations, board meetings, sprint retrospectives) become a content moat. Hard to replicate because they require domain expertise + user feedback loops.

4. **Enterprise integration depth.** Deep integrations with Active Directory, SCCM/Intune deployment, Group Policy configuration, and Windows security APIs create switching costs that casual competitors won't invest in.

### What Is NOT Defensible

1. **The core AI models.** Whisper and Ollama models are open source. Anyone can use them. The models themselves are not a moat.

2. **The basic feature set.** Record + transcribe + summarize is table stakes. Every competitor will have this within 12 months.

3. **"Local-first" as a concept.** This is a positioning choice, not a technology barrier. Otter could ship a local mode in 6 months if they wanted to (they won't, because it breaks their data flywheel, but they could).

### Venture Scale or Lifestyle Business?

**This can be venture-scale, but only if the team executes on one of two paths:**

**Path A: Platform Play.** Rekal becomes the "local AI platform for enterprise" -- meeting notes is the wedge, but the platform expands to email summarization, document analysis, code review, and any knowledge work that enterprises want AI for but can't send to the cloud. TAM expands 5-10x.

**Path B: Vertical Domination.** Go deep into 2-3 regulated verticals (healthcare, legal, financial services) where the privacy requirement is non-negotiable. Build compliance features (audit logs, retention policies, role-based access) that justify $50-100/seat/month pricing. $200M+ ARR is achievable with <5% market penetration of the regulated enterprise segment.

**Without one of these paths, this is a $10-30M ARR business** -- great for the founders, not great for a fund needing 10x+ returns on a seed check.

### Network Effects & Data Flywheel

**The honest answer: weak direct network effects.** Local-first inherently limits data aggregation. You can't build a centralized model that improves with usage if data never leaves the device.

**Possible indirect network effects:**

- **Template marketplace.** Users create and share meeting templates. More templates attract more users. This is a content network effect (like Notion templates).
- **Federated learning (future).** With user consent, aggregate anonymized model improvement signals without centralizing data. Hard to build, but defensible if achieved.
- **Enterprise viral loop.** One person uses it in a meeting, others see the notes, they want it too. This is the Slack/Zoom adoption pattern and it's powerful.
- **Plugin/integration ecosystem.** If Rekal becomes a platform, third-party integrations create a multi-sided network effect.

**Recommendation:** The team should design for the template marketplace and enterprise viral loop from day one. These are the most achievable network effects given the local-first constraint.

---

## 4. GTM Strategy Recommendations

### Ideal First Customer (ICP v1)

**Profile:** Mid-market (500-5000 employees) companies in regulated industries.

Specifically:
- **Title:** Director/VP of Engineering, or Head of Product at a healthcare, fintech, or legal tech company
- **Pain:** Their team is in 15+ meetings/week, losing decisions and action items. They tried Otter but InfoSec killed it during security review.
- **Budget:** $20-50/seat/month is within departmental discretion (no C-suite approval needed for <$50K annual)
- **Technical:** Comfortable with desktop software. Not allergic to local installation. IT department is cooperative, not adversarial.

**Anti-ICP (avoid initially):**
- Fortune 100 (sales cycles too long, 12-18 months)
- Startups (will use Otter/Granola, don't care about privacy enough)
- Non-technical orgs (can't handle local model setup)

### Bottom-Up vs. Top-Down

**Start bottom-up, convert to top-down.**

Phase 1 (Months 1-6): Individual users download and use it free. No IT approval needed. This is the PLG motion.

Phase 2 (Months 6-12): When 5+ people at a company use it, trigger the "team" upsell. Now you're talking to a team lead.

Phase 3 (Months 12-24): When 3+ teams use it, trigger the "enterprise" conversation. Now you're talking to IT/procurement. Offer centralized deployment (SCCM/Intune packages), admin console, audit logs.

**This is exactly how Slack, Figma, and Notion grew.** Bottom-up adoption creates internal champions who fight the procurement battle for you.

### Open Source Core + Premium

**Yes, but be strategic about the boundary.**

| Open Source (Free) | Premium (Paid) |
|-------------------|----------------|
| Recording + transcription | AI summaries + action items |
| Basic note editing | Meeting analytics + charts |
| Single-user local storage | Team sharing (local network) |
| Standard templates | Custom template builder |
| Export to TXT/MD | Export to Notion, Jira, Confluence |
| Community support | Priority support + SLA |
| | Admin console + deployment tools |
| | SSO / Active Directory integration |
| | Compliance features (audit log, retention) |

**The open source core builds trust** (enterprises can audit the code -- "see, we really don't phone home") and **creates the adoption funnel.** The premium features are where the money is, and they're all things enterprises will pay for.

### Community-Led Growth

**High potential. Here's the playbook:**

1. **GitHub repo** with the open source core. Target 5K stars in first 6 months. This is your credibility signal.
2. **Discord/Forum** for power users. Meeting productivity tips, template sharing, prompt engineering for better summaries.
3. **"Meeting Notes of the Week"** content series. Show real (anonymized) before/after examples of meetings with and without Rekal.
4. **Enterprise privacy blog.** Become the thought leader on "AI without data leaks." This attracts the exact buyer you want.
5. **Integration bounties.** Pay community developers to build integrations (Obsidian, Logseq, Todoist, Linear, etc.).

---

## 5. Product-Market Fit Signals

### Leading Indicators of PMF

| Metric | PMF Signal | Why It Matters |
|--------|-----------|---------------|
| **D7 retention** | >60% of users who complete first meeting transcription return within 7 days | Shows the core loop is sticky |
| **Meetings per user per week** | >3 meetings recorded per active user | Shows it's becoming a habit, not a one-time trial |
| **Organic referral rate** | >30% of new users cite "colleague showed me" | The enterprise viral loop is working |
| **Time to first "aha"** | <5 minutes from install to first useful note | Fast TTV = high conversion |
| **NPS among active users** | >50 | Enterprise buyers trust NPS; you'll need this for sales decks |
| **Sean Ellis test** | >40% would be "very disappointed" without it | The canonical PMF test |

### First 90 Days: What to Measure

**Week 1-2: Installation & Onboarding**
- Install completion rate (what % of downloads actually complete setup?)
- Model download completion rate (Ollama models are large -- do users give up?)
- Time from download to first transcription
- Hardware compatibility failure rate

**Week 3-6: Core Loop Validation**
- Transcription accuracy satisfaction (thumbs up/down on transcripts)
- Summary quality satisfaction
- Average meeting length being recorded
- Feature usage: which post-meeting features (action items, charts, export) get used?

**Week 7-12: Retention & Expansion**
- D7, D14, D30 retention curves
- Meetings per user per week trend
- Multi-person adoption within same company (the viral signal)
- Upgrade intent: how many free users express interest in premium features?
- Feature requests: what are people asking for? (This tells you where to go next)

**Kill Criteria:** If D30 retention is below 25% after the first 500 users with product iteration, seriously question whether the local-first constraint is too much friction. The biggest risk is that "local" means "too hard to set up" for the target buyer.

---

## 6. The Pitch Deck Skeleton

### 10 Slides That Raise a Seed Round

**Slide 1: Title**
> "Rekal: AI Meeting Intelligence That Never Leaves Your Laptop"
> Tagline: "Enterprise-grade meeting notes. Zero cloud dependency. Complete privacy."

**Slide 2: The Problem**
> Knowledge workers spend 31 hours/month in meetings. 73% say meetings are unproductive. The existing solutions (Otter, Fireflies, Copilot) require sending every word spoken in your company to the cloud. Regulated industries and security-conscious enterprises can't use them. They're stuck with manual notes or nothing.
> *Show the stat: "62% of Fortune 500 companies have restricted or banned cloud AI transcription tools."*

**Slide 3: The Solution**
> Rekal records, transcribes, and summarizes meetings entirely on your local machine. Whisper.cpp for transcription. Local LLMs via Ollama for AI features. Nothing leaves your laptop. Ever.
> *Demo screenshot / GIF of the product in action.*

**Slide 4: Why Now?**
> Three things changed in the last 18 months:
> 1. Local AI models are now good enough (Whisper v3, Llama 3, Phi-3)
> 2. Enterprise AI privacy backlash is peaking (Samsung, JPMorgan, Italy bans)
> 3. Regulatory pressure is accelerating (EU AI Act, HIPAA AI guidance)
> *The window is open. It will close when incumbents add local modes.*

**Slide 5: Product Demo**
> Live walkthrough: Record meeting -> Real-time transcription -> AI summary with action items -> Export to Notion/Jira
> *This slide is a live demo or a 60-second video. Make it feel magical.*

**Slide 6: Market Size**
> TAM: $20B (AI Meeting Productivity), SAM: $6B (Enterprise AI Meeting Notes), SOM: $1.2B (Privacy-first, Windows enterprise)
> Show the positioning matrix. Highlight the white space.

**Slide 7: Business Model**
> Free: Open source core (record + transcribe)
> Pro ($25/mo): AI summaries, action items, analytics, templates, integrations
> Enterprise ($50/seat/mo): Admin console, SSO, compliance, deployment tools, SLA
> *Show projected revenue: $X ARR by end of Year 2 based on conversion assumptions.*

**Slide 8: Traction / Social Proof**
> (Pre-launch version): GitHub stars, waitlist signups, LOIs from design partners, pilot results
> (Post-launch version): MRR, user count, retention curves, NPS, logos
> *Even pre-revenue, show demand signals. Waitlist of 2,000+ from regulated industry employees is compelling.*

**Slide 9: Team**
> Why this team wins: [technical depth in local AI / enterprise sales experience / domain expertise in regulated industries]
> *Highlight unfair advantages: previous exits, relevant experience, unique access to the target market.*

**Slide 10: The Ask**
> Raising $X at $Y valuation.
> Use of funds: 60% engineering (local model optimization, enterprise features), 25% GTM (community + first enterprise sales hire), 15% ops.
> Milestones for next round: $X00K ARR, Y enterprise customers, Z% retention.

### The Story That Sells

**Narrative arc:** "Every company wants AI meeting notes. Most can't use them because of privacy. We built the solution that works without the cloud. The technology just became possible, the regulation just became mandatory, and we're the first team building this properly for Windows enterprise."

**The emotional hook:** "Imagine a world where your meeting notes are as private as the meeting itself."

**The fear factor for investors:** "If we don't fund this, Microsoft will add local Copilot features in 18-24 months and the window closes. The startup that owns the local AI meeting category before then will be the acquisition target."

---

## 7. Revenue Model Options

### The Core Challenge

Local-first breaks the traditional SaaS model. You can't gate features behind a server. You can't track usage for billing. You can't do per-API-call pricing. The software runs entirely on the user's machine.

### Revenue Model Options (Ranked by Viability)

**1. Tiered Desktop License (Recommended Primary Model)**
- Free tier: Core recording + transcription (open source)
- Pro tier ($20-30/user/month): AI features, templates, integrations, priority model updates
- Enterprise tier ($40-60/seat/month): Admin console, bulk deployment, compliance, SSO, SLA
- **Enforcement:** License key validation (periodic online check, grace period for offline). This is how JetBrains, Sublime Text, and other desktop software monetize.
- **Projected blended ARPU:** $30-35/seat/month at scale

**2. Enterprise Site Licensing**
- Annual contracts: $50K-500K/year based on seat count
- Includes: deployment support, custom templates, dedicated success manager, on-prem admin server (optional)
- **This is where the big money is.** A 5,000-seat deal at $40/seat/month = $2.4M ARR from a single customer.

**3. Model Marketplace (Medium-Term)**
- Curated, optimized models for specific use cases (medical transcription, legal terminology, financial jargon)
- Partner with model creators, take 30% marketplace fee
- Users pay $5-15/month per premium model pack
- **This creates a platform dynamic** and additional revenue without cloud dependency

**4. Template & Integration Marketplace**
- Premium meeting templates (industry-specific, role-specific)
- Premium integrations (Salesforce, SAP, Epic, Cerner)
- Community creators earn 70%, Rekal takes 30%
- **Small revenue but big ecosystem value**

**5. Professional Services (Enterprise Only)**
- Custom model fine-tuning for enterprise vocabulary
- Integration development for internal tools
- Training and onboarding programs
- $150-300/hour, minimum engagement $25K
- **High margin, but doesn't scale. Use strategically to land whale accounts.**

**6. Hardware Partnerships (Speculative)**
- Partner with Lenovo, Dell, HP to pre-install Rekal on enterprise laptops
- Revenue share or per-device licensing fee
- **Long sales cycle but massive distribution if achieved**

### Revenue Projections (Conservative)

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| Free users | 10,000 | 50,000 | 200,000 |
| Paid users | 500 | 5,000 | 25,000 |
| Conversion rate | 5% | 10% | 12.5% |
| Blended ARPU | $25/mo | $30/mo | $35/mo |
| ARR | $150K | $1.8M | $10.5M |
| Enterprise deals | 2 | 15 | 50 |
| Enterprise ARR | $100K | $2M | $15M |
| **Total ARR** | **$250K** | **$3.8M** | **$25.5M** |

---

## 8. Risk Assessment

### High Risk
- **Microsoft local Copilot:** If Microsoft adds local meeting summarization to Windows/Teams, the TAM shrinks dramatically. Mitigation: move fast, be meeting-agnostic (not just Teams), go deeper on compliance features.
- **Hardware requirements:** Local LLMs need decent hardware. If target users have old laptops with 8GB RAM, the product won't work. Mitigation: optimize aggressively, offer tiered model sizes, validate hardware requirements with design partners early.

### Medium Risk
- **Model quality gap:** Local models are good but not GPT-4 good. If users compare Rekal summaries to cloud alternatives and find them lacking, retention suffers. Mitigation: rapid model upgrade cycle, prompt engineering, user feedback loops.
- **Enterprise sales cycle:** Even with bottom-up adoption, enterprise procurement is slow. The company needs 18+ months of runway to survive the sales cycle. Mitigation: keep burn low, generate revenue from Pro tier while enterprise deals close.

### Low Risk
- **Privacy regulation reversal:** Extremely unlikely. The trend is toward more regulation, not less.
- **Open source competitors:** Building a polished enterprise product on top of OSS models requires significant engineering. The models are open, but the product is the moat.

---

## 9. Investment Decision Framework

### What Makes This Investable
- Clear white space in a large, growing market
- Perfect "why now?" timing (local AI + privacy backlash + regulation)
- Defensible enterprise wedge in regulated industries
- Plausible path to $25M+ ARR within 3 years
- Multiple expansion vectors (platform play, vertical depth)

### What Gives Me Pause
- Weak network effects vs. cloud competitors
- Microsoft platform risk is real and existential
- Local-first limits the data flywheel that drives most AI companies
- Enterprise sales is expensive and slow; cash burn will be front-loaded
- Hardware requirements may limit addressable market more than TAM suggests

### My Recommendation

**Conditional pass to partner meeting.** The market timing is excellent and the positioning is smart. The key diligence questions are:

1. **Team:** Do they have enterprise sales DNA alongside the technical chops? Local AI + enterprise sales is a rare combination.
2. **Hardware validation:** Have they tested on real enterprise hardware fleets? What's the minimum viable spec?
3. **Design partners:** Do they have 3+ enterprise LOIs or paid pilots? Talk is cheap; procurement intent is not.
4. **Model quality:** Side-by-side comparison of their local summaries vs. Otter/GPT-4. How close is "close enough"?
5. **Microsoft thesis:** What's their plan if Microsoft adds local Copilot to Windows in 2027?

If the team can answer these five questions convincingly, this is a seed investment worth making at a $8-12M pre-money valuation with a $2-3M check.

---

*This memo represents the evaluation of one partner and does not constitute a fund investment decision. All market size estimates are based on publicly available data and internal modeling as of March 2026.*
