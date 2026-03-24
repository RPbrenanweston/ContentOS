# Spacebot Agent Architecture — Brenan Weston Recruitment Automation

## Overview

Four specialist agents powering the recruitment automation pipeline. Each agent has a single responsibility and clean handoff points to the others.

## Agent Map

```
┌─────────────────────────────────────────────────────┐
│                  USER / SLACK                        │
│                                                      │
│  "research Acme"    "score the CISO"    "pp-email"  │
│        │                  │                 │        │
│        ▼                  ▼                 ▼        │
│  ┌───────────┐    ┌──────────────┐   ┌───────────┐  │
│  │  03       │    │     01       │   │    02      │  │
│  │ RESEARCH  │───▶│ ICP SCORER   │   │  EMAIL    │  │
│  │  INTEL    │    │              │   │  WRITER   │  │
│  │           │───────────────────────▶│           │  │
│  └───────────┘    └──────────────┘   └───────────┘  │
│        │                                             │
│        ▼                                             │
│  ┌───────────┐                                       │
│  │    04      │                                      │
│  │ SOURCING  │                                       │
│  │ & EVAL    │                                       │
│  └───────────┘                                       │
└─────────────────────────────────────────────────────┘
```

## Data Flow

1. **Research Intel** (03) produces RESEARCH_PACKs — the foundation everything else consumes
2. **ICP Scorer** (01) classifies prospects/accounts — can work from user input alone or enhanced by a RESEARCH_PACK
3. **Email Writer** (02) REQUIRES a RESEARCH_PACK to run the p1→p4→e1 chain — will not generate emails without one
4. **Sourcing & Eval** (04) works from job descriptions, candidate profiles, and optionally RESEARCH_PACKs for company context

## Agent Summary

| # | Agent | Purpose | Web Access | Model | Temperature |
|---|-------|---------|------------|-------|-------------|
| 01 | ICP Account Scorer | Classify prospects & accounts, recommend next actions | None | GPT-5 Nano | 0.1 |
| 02 | Outbound Email Writer | PP-Email chain → insight-led outreach emails | LinkedIn only | GPT-5 Nano | 0.3 (e1 only) |
| 03 | Company Research Intel | Build RESEARCH_PACKs with cited sources | Full web | GPT-5 Nano | 0.1 |
| 04 | Candidate Sourcing & Eval | Role prep packs, candidate evals, sourcing filters | LinkedIn only | GPT-5 Nano | 0.2 |

## Per-Agent Files

Each agent folder contains:
- **SOUL.md** — Core personality, values, operating principles, boundaries
- **IDENTITY.md** — What the agent knows, does, and how it structures output
- **USER.md** — Context about the human it serves, their preferences, common workflows
- **CONFIG_NOTES.md** — Model routing, tuning, memory, browser, and channel recommendations

## Setup in Spacebot

For each agent:
1. Create a new agent in Spacebot
2. Go to Config tab
3. Paste SOUL.md content into the **Soul** field
4. Paste IDENTITY.md content into the **Identity** field
5. Paste USER.md content into the **User** field
6. Apply CONFIG_NOTES.md recommendations to Model Routing, Tuning, Compaction, Cortex, Memory Persistence, Browser, and Sandbox settings

## V2 Enhancements (After Adding Campaign Examples)

When you have top-performing campaign examples ready:
- **Email Writer**: Add real email examples to the IDENTITY.md under each framework section (replace generic patterns with proven copy)
- **ICP Scorer**: Add real classification examples showing accounts that converted vs. didn't
- **Research Intel**: Add example RESEARCH_PACKs from successful campaigns
- **Sourcing & Eval**: Add role prep packs that led to successful placements, with annotation on what made them effective
