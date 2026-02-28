# Roadmap: AI Security Recruitment Sales Intelligence Platform

**Created:** 2025-01-27
**Core Value:** Generate high-confidence, timely sales signals and enriched lead context that maximizes the probability of reaching hiring decision-makers at the right moment with credible, personalized reasons to engage.

## Phase Overview

| Phase | Name | Goal | Requirements | Status |
|-------|------|------|--------------|--------|
| 1 | Data Foundation | Build zero-cost data ingestion (RSS, CSV upload), Supabase schema, manual enrichment | MON-01, MON-02, MON-03, MON-04, MON-05, DATA-04, DATA-05 | ✓ Complete |
| 2 | Agent Architecture | Build Autonomy orchestration, researcher/resourcer/copywriter agents, hybrid LLM | AGT-01, AGT-02, AGT-03, AGT-05, AGT-06, INFRA-02 | ○ Pending |
| 3 | Agent Learning Loop | Implement feedback mechanism, agent improvement from thumbs-up/down | AGT-07, DATA-01, DATA-02 | ○ Pending |
| 4 | Integration & Digests | Build Attio sync, Slack digest reporter, output formatting | AGT-04, DATA-03, OUT-01, OUT-02, OUT-03 | ○ Pending |
| 5 | Operations & Optimization | VPS deployment, cost tracking, monitoring, initial 10-account pilot | OUT-04, INFRA-01, INFRA-03, INFRA-04 | ○ Pending |

---

## Phase 1: Data Foundation

**Goal:** Establish zero-cost data ingestion pipeline (RSS feeds + CSV uploads), Supabase schema for enrichment and manual data insertion

**Requirements Covered:**
- MON-01: System monitors hiring announcements (job postings, team expansions) for 10 pilot accounts
- MON-02: System monitors company signals (funding, product launches, leadership changes) for target accounts
- MON-03: System monitors individual signals (hires, promotions, challenges posted) for key personnel
- MON-04: System enriches signals with business context (competitor actions, industry trends, market moves)
- MON-05: Data collection integrates Apify for high-volume scraping + direct API calls for real-time enrichment
- DATA-04: Apollo enrichment provides hiring history, financials, and org structure
- DATA-05: Unique identifiers: company name + domain URL (starting point for all lookups)

**Success Criteria:**

1. RSS feed aggregator configured and running (multiple AI security industry sources, job boards, news)
2. CSV upload interface for manual enrichment data (hiring history, financials, org structure)
3. CSV schema mapped to Supabase (company_name, domain, hiring_history, financials, org_structure, etc.)
4. Supabase schema created: companies, signals, enrichment_data, feedback tables
5. Manual data insertion workflow: you upload CSV → data maps to company records
6. Free/low-cost data sources documented (RSS feeds, public APIs, free tiers)
7. Cost tracking shows <$5/month for 10 accounts (no Apollo API, only Supabase storage + Apify minimal)
8. 10 pilot companies seeded with baseline enrichment data from CSV
9. Unique ID system (company name + domain) working reliably across all tables
10. Data collection pipeline operational and tested for 1 week

**Notes:**
- RSS feeds: TechCrunch, CRN, LinkedIn job feeds, HackerNews, industry newsletters (free)
- CSV uploads: You provide hiring history, company financials, org structure based on your research
- Apollo API deferred: Not used in MVP; can integrate in future if ROI proves
- Cost basis: $0 for RSS, $0 for CSV, ~$5/month for Supabase (free tier covers MVP)

---

## Phase 2: Agent Architecture

**Goal:** Build core agent orchestration and agent roles using Autonomy framework

**Requirements Covered:**
- AGT-01: Sales Researcher agent identifies and validates hiring signals from multiple sources
- AGT-02: Resourcer agent identifies hiring patterns, trends, and competitive positioning for each account
- AGT-03: Copywriter agent generates email building blocks (signals, trends, relevance framing) for ICPs
- AGT-05: Agents use orchestrated architecture with shared context store (Supabase)
- AGT-06: Agents use hybrid LLM approach (Claude for reasoning, Ollama/Mistral for enrichment)
- INFRA-02: Agent orchestration via Autonomy framework

**Success Criteria:**

1. Autonomy framework set up and agents spawnable per company
2. Sales Researcher agent retrieves signals from Supabase and validates relevance (Claude reasoning)
3. Resourcer agent analyzes hiring patterns, identifies trends, competitive positioning (hybrid LLM)
4. Copywriter agent generates structured email blocks: signals, trends, relevance framing (Claude)
5. Orchestrated architecture: Researcher → Resourcer → Copywriter (shared context via Supabase)
6. Hybrid LLM working: Claude API for complex reasoning, Ollama/Mistral for summarization/enrichment
7. Agent prompts tuned for AI security domain (hiring patterns, GTM/Engineering roles, threat prevention)
8. Agents tested end-to-end on 2 pilot accounts
9. Agent outputs stored in Supabase for feedback tracking
10. Cost basis: Claude API calls only (Ollama/Mistral runs locally), ~$20-30/month for 10 accounts

---

## Phase 3: Agent Learning Loop

**Goal:** Implement feedback mechanism and agent self-improvement

**Requirements Covered:**
- AGT-07: Agents learn and improve from thumbs-up/thumbs-down feedback over time
- DATA-01: Supabase stores signals, trends, enrichment data, and agent feedback
- DATA-02: Data model mirrors CRM structure for flexibility (can move CRM or interact independently)

**Success Criteria:**

1. Feedback UI (thumbs up/down) captures user responses to signals
2. Feedback stored in Supabase with signal ID, agent output, user rating
3. Agent system prompts updated based on feedback patterns (weekly learning cycle)
4. Learning loop closes within 1-2 weeks: feedback → prompt update → improved output
5. Sample feedback from 100+ signals shows ≥20% improvement in signal quality/relevance
6. Data model supports CRM-independent workflows (can export/import between systems)
7. Agents show measurable improvement by Phase 3 end
8. Feedback loop dashboard: thumbs-up rate, agent performance trends, top-performing prompts
9. Data schema remains flexible for future Apollo integration (optional fields, not required)
10. Cost basis: No new costs (existing Supabase + Claude API reuse)

---

## Phase 4: Integration & Digests

**Goal:** Connect to Attio, build Slack digest reporter

**Plans:** 3 plans

**Requirements Covered:**
- AGT-04: Reporter agent synthesizes findings and prepares daily Slack digest
- DATA-03: Daily sync to Attio CRM as account notes and prospect enrichment (no auto-lead creation)
- OUT-01: Daily Slack digests sent at GMT and EST mornings
- OUT-02: Each digest contains: 3 signals + 3 trends + relevance framing per account
- OUT-03: Human in loop — sales team reviews signals and decides outreach action

**Success Criteria:**

1. Reporter agent synthesizes researcher + resourcer findings into structured digest
2. Digest contains 3 signals + 3 trends + relevance framing per account
3. Slack integration sends daily digests at GMT and EST mornings (scheduled via cron/Autonomy)
4. Attio sync: signals stored as account notes, prospects enriched with trend data
5. Attio API integration: daily batch sync (no real-time updates)
6. Digest formatting is scannable, actionable, drives outreach decisions
7. Human review required before any contact (manual action confirmation)
8. Daily digest generated for all 10 pilot accounts without errors
9. Slack digest includes feedback link (one-click thumbs up/down)
10. Cost basis: Attio API calls (~$10/month), Slack API free tier, no new infrastructure

**Plans:**
- [ ] 04-01-PLAN.md — Reporter agent core (synthesizer, ranker, formatter)
- [ ] 04-02-PLAN.md — Slack integration with timezone-aware scheduling
- [ ] 04-03-PLAN.md — Attio CRM integration and E2E testing

---

## Phase 5: Operations & Optimization

**Goal:** Deploy to VPS, optimize costs, run pilot with 10 accounts

**Requirements Covered:**
- OUT-04: Feedback mechanism (thumbs up/down) captured and fed back to agents
- INFRA-01: VPS-based deployment (self-managed or managed DigitalOcean/Render)
- INFRA-03: Costs tracked and optimized for per-lead economics
- INFRA-04: System operational for 10 pilot accounts with sub-$50 cost per validated signal

**Success Criteria:**

1. VPS deployed (DigitalOcean or Render) with Docker containerization
2. Autonomy agents containerized and deployable via Docker Compose
3. Ollama/Mistral running locally on VPS (for cost optimization)
4. Feedback mechanism production-ready (thumbs up/down captured and stored)
5. Cost tracking dashboard: per-signal, per-account, per-recruiter visibility
6. Costs validated: <$50/month total for 10 accounts (all-in including VPS, Claude API, Supabase)
7. Cost per validated signal: <$5 (assuming 10-20 signals per account per month)
8. Monitoring and alerting in place (agent failures, data collection gaps, API errors)
9. 10-account pilot running for ≥2 weeks, generating daily digests
10. First signals validated by sales team, feedback loop active and improving

**Infrastructure Breakdown:**
- VPS: $10-15/month (2GB RAM, DigitalOcean basic)
- Supabase: $0-5/month (free tier covers MVP)
- Claude API: $20-25/month (reasoning agents at 100 calls/day)
- Ollama/Mistral: $0 (runs locally)
- Attio sync: $10/month (API access)
- **Total: ~$40-55/month for 10 accounts → ~$4-5.50 per account**

---

## Requirement Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MON-01 | 1 | Pending |
| MON-02 | 1 | Pending |
| MON-03 | 1 | Pending |
| MON-04 | 1 | Pending |
| MON-05 | 1 | Pending |
| AGT-01 | 2 | Pending |
| AGT-02 | 2 | Pending |
| AGT-03 | 2 | Pending |
| AGT-04 | 4 | Pending |
| AGT-05 | 2 | Pending |
| AGT-06 | 2 | Pending |
| AGT-07 | 3 | Pending |
| DATA-01 | 3 | Pending |
| DATA-02 | 3 | Pending |
| DATA-03 | 4 | Pending |
| DATA-04 | 1 | Pending |
| DATA-05 | 1 | Pending |
| OUT-01 | 4 | Pending |
| OUT-02 | 4 | Pending |
| OUT-03 | 4 | Pending |
| OUT-04 | 5 | Pending |
| INFRA-01 | 5 | Pending |
| INFRA-02 | 2 | Pending |
| INFRA-03 | 5 | Pending |
| INFRA-04 | 5 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Roadmap created: 2025-01-27*
*Last updated: 2025-01-27 after adjustments*
