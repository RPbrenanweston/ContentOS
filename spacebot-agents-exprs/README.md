# Exprs.io — Spacebot Agent Architecture

## What is Exprs?

Recruitment infrastructure for scaling companies. A fixed-cost operating system that replaces agency dependency for teams of 20-100 employees. GBP 3K/month (UK) / USD 4K/month (US).

## Agent Architecture

```
                    ┌─────────────────────────────┐
                    │       BRENAN / SLACK         │
                    │                               │
                    │  "research Acme"              │
                    │  "score this prospect"        │
                    │  "creative ideas for Paddle"  │
                    │  "prep my call"               │
                    └─────────┬─────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌────────────┐  ┌──────────────┐  ┌───────────────────┐
│ 03 RESEARCH│  │ 01 ACCOUNT   │  │ 04 DISCOVERY      │
│    INTEL   │  │   SCORER     │  │    & SALES        │
│            │  │              │  │                   │
│ Builds     │  │ Classifies   │  │ Call prep         │
│ RESEARCH   │──▶ prospects    │  │ Objections        │
│ PACKs      │  │ against ICP  │  │ Pricing           │
└──┬─────┬───┘  └──────────────┘  └───────────────────┘
   │     │
   ▼     ▼
┌────────────┐  ┌──────────────────┐
│ 02 EMAIL   │  │ 05 CREATIVE      │
│   WRITER   │  │    IDEAS         │
│            │  │                  │
│ PP-Email   │  │ 3 personalised   │
│ chain      │  │ ideas per        │
│ p1→p4→e1   │  │ prospect (scale) │
└────────────┘  └──────────────────┘
```

## Data Flow

1. **Research Intel** (03) produces RESEARCH_PACKs — the foundation
2. **Account Scorer** (01) classifies against ICP — works standalone or enhanced by research
3. **Email Writer** (02) requires a RESEARCH_PACK to run the full chain — deep, consultative sequences
4. **Discovery & Sales** (04) uses research + scoring for call prep, handles objections and pricing live
5. **Creative Ideas** (05) generates 3 personalised ideas per prospect at scale — lightweight, high-volume outbound. Needs only a company description, not a full RESEARCH_PACK.

### Email Writer (02) vs Creative Ideas (05)

| Dimension | 02 Email Writer | 05 Creative Ideas |
|-----------|----------------|-------------------|
| **Input required** | Full RESEARCH_PACK | Company description only |
| **Output** | 5-email sequence (p1→e1) | 3 bullet ideas or 1-liner |
| **Cost per prospect** | ~$0.05-0.10 | ~$0.001-0.002 |
| **Best for** | High-priority accounts, deep personalisation | Scale outbound, first-touch campaigns |
| **Volume** | 5-10 prospects/day | 100-1,000 prospects/day |
| **Framework** | PP-Email chain (analytical reasoning) | Eric Nowoslawski Creative Ideas (constrained AI) |

## Agent Summary

| # | Agent | Purpose | Web | Model | Temp |
|---|-------|---------|-----|-------|------|
| 01 | Account Scorer | Classify prospects against Exprs ICP | None | Nano | 0.1 |
| 02 | Email Writer | PP-Email chain → 5-email sequences | LinkedIn | Nano | 0.1/0.3 |
| 03 | Research Intel | Build RESEARCH_PACKs with cited sources | Full | Nano | 0.1 |
| 04 | Discovery & Sales | Call prep, objections, pricing, close | Limited | Nano | 0.15 |
| 05 | Creative Ideas | 3 personalised ideas per prospect at scale | Optional | Nano | 0.3 |

## Shared Context (All Agents)

### Voice: Pragmatic Operational
Sounds like a CFO explaining an infrastructure decision. NOT a startup pitch or sales call.

### Three Pillars
- **A — Steady-State**: Recruitment as infrastructure. Compound efficiency. Process ownership.
- **B — Surgical vs Systemic**: 70-85% of roles are repeatable. Stop paying specialist rates for systemic work.
- **C — Pragmatic Costing**: TCO comparison. GBP 173K (agencies, 3yr) vs GBP 108K (infrastructure, 3yr).

### Pricing
- UK: GBP 3K/month (GBP 36K/year) fixed
- US: USD 4K/month (USD 48K/year) fixed
- Never lead with price. Lead with cost comparison.

### ICP
- Primary: Founders/CEOs, 20-100 employees, 5-20 hires/year, agency-dependent
- Secondary: CTOs/VPs, 30-100 employees, building technical teams
- Tertiary: CFOs/Finance Directors, budget approval authority

### Banned Language
game-changer, revolutionary, disruptive, cutting-edge, best-in-class, world-class, synergy, leverage (verb), unlock, unleash, empower, elevate, transform (without evidence), limited time, act now, spots filling up

## Setup in Spacebot

For each agent:
1. Create new agent in Spacebot
2. Config → Soul: paste SOUL.md
3. Config → Identity: paste IDENTITY.md
4. Config → User: paste USER.md
5. Apply CONFIG_NOTES.md to Model Routing, Tuning, Memory, Browser, Cortex

## Per-Agent Files

```
spacebot-agents-exprs/
├── README.md              ← You are here
├── 01-account-scorer/
│   ├── SOUL.md
│   ├── IDENTITY.md
│   ├── USER.md
│   └── CONFIG_NOTES.md
├── 02-email-writer/
│   ├── SOUL.md
│   ├── IDENTITY.md
│   ├── USER.md
│   └── CONFIG_NOTES.md
├── 03-research-intel/
│   ├── SOUL.md
│   ├── IDENTITY.md
│   ├── USER.md
│   └── CONFIG_NOTES.md
├── 04-discovery-sales/
│   ├── SOUL.md
│   ├── IDENTITY.md
│   ├── USER.md
│   └── CONFIG_NOTES.md
└── 05-creative-ideas/          ← NEW: Eric Nowoslawski framework
    ├── SOUL.md                  Pragmatic Operational analyst
    ├── IDENTITY.md              10 hand-written examples + 3 pillars
    ├── USER.md                  Brenan's voice + batch workflow
    └── CONFIG_NOTES.md          Nano + cached inputs + scaling notes
```

## V2: Adding Campaign Examples

When top-performing campaign examples are ready:
- **Email Writer**: Replace generic patterns with proven copy that converted
- **Account Scorer**: Add real classification examples (converted vs didn't)
- **Research Intel**: Add example packs from successful campaigns
- **Discovery & Sales**: Add real call transcripts with annotations on what worked
