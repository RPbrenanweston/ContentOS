# AI Security Recruitment Sales Intelligence Platform

## What This Is

A multi-agent AI system that monitors hiring and business signals across target AI security companies, enriches that data with industry context, and generates personalized outreach materials for a recruitment sales operation. Agents learn and improve from feedback, feeding daily digests to sales teams via Slack to drive cold outreach at scale.

## Core Value

**Generate high-confidence, timely sales signals and enriched lead context that maximizes the probability of reaching hiring decision-makers at the right moment with credible, personalized reasons to engage.**

## Requirements

### Validated

(None yet — ship to validate)

### Active

#### Signal Collection & Monitoring
- [ ] **MON-01**: System monitors hiring announcements (job postings, team expansions) for 10 pilot accounts
- [ ] **MON-02**: System monitors company signals (funding, product launches, leadership changes) for target accounts
- [ ] **MON-03**: System monitors individual signals (hires, promotions, challenges posted) for key personnel
- [ ] **MON-04**: System enriches signals with business context (competitor actions, industry trends, market moves)
- [ ] **MON-05**: Data collection integrates Apify for high-volume scraping + direct API calls for real-time enrichment

#### Agent Architecture
- [ ] **AGT-01**: Sales Researcher agent identifies and validates hiring signals from multiple sources
- [ ] **AGT-02**: Resourcer agent identifies hiring patterns, trends, and competitive positioning for each account
- [ ] **AGT-03**: Copywriter agent generates email building blocks (signals, trends, relevance framing) for ICPs
- [ ] **AGT-04**: Reporter agent synthesizes findings and prepares daily Slack digest
- [ ] **AGT-05**: Agents use orchestrated architecture with shared context store (Supabase)
- [ ] **AGT-06**: Agents use hybrid LLM approach (Claude for reasoning, Ollama/Mistral for enrichment)
- [ ] **AGT-07**: Agents learn and improve from thumbs-up/thumbs-down feedback over time

#### Data Management
- [ ] **DATA-01**: Supabase stores signals, trends, enrichment data, and agent feedback
- [ ] **DATA-02**: Data model mirrors CRM structure for flexibility (can move CRM or interact independently)
- [ ] **DATA-03**: Daily sync to Attio CRM as account notes and prospect enrichment (no auto-lead creation)
- [ ] **DATA-04**: Apollo enrichment provides hiring history, financials, and org structure
- [ ] **DATA-05**: Unique identifiers: company name + domain URL (starting point for all lookups)

#### Notifications & Output
- [ ] **OUT-01**: Daily Slack digests sent at GMT and EST mornings
- [ ] **OUT-02**: Each digest contains: 3 signals + 3 trends + relevance framing per account
- [ ] **OUT-03**: Human in loop — sales team reviews signals and decides outreach action
- [ ] **OUT-04**: Feedback mechanism (thumbs up/down) captured and fed back to agents

#### Infrastructure
- [ ] **INFRA-01**: VPS-based deployment (self-managed or managed DigitalOcean/Render)
- [ ] **INFRA-02**: Agent orchestration via Autonomy framework
- [ ] **INFRA-03**: Costs tracked and optimized for per-lead economics

### Out of Scope

- **Matching engine** — Deferred to v2. MVP assumes human reviews signals and decides to engage.
- **Auto-lead creation** — Enrichment only; human in loop for Attio lead creation.
- **Multi-language support** — MVP focuses on English signals and outreach.
- **Real-time agent responses** — MVP uses daily batch digests (no webhook-based immediate actions).
- **Advanced ML training** — Agent learning is prompt-based feedback loop, not model retraining.

## Context

### Business Model
- Recruitment placement fees: 25% of annual salary (negotiable to 20%)
- Target TAM: 100-150 accounts per recruiter × 2 recruiters = 200-300 accounts at scale
- MVP: 10 pilot accounts to validate signal quality and conversion
- Industries: AI security (hiring GTM/Engineering roles, AI-native security, threat prevention)
- ICPs: Founders, C-suite, engineering leaders, sales leaders, talent/recruitment leaders

### Signal Strategy
- **Hiring announcements** → Identify hiring need
- **Company signals** → Validate urgency (funding, growth, product launch)
- **Individual signals** → Find who's responsible, what they're discussing
- **Business insights** → Differentiate outreach ("you hire from X, competitor doing Y, trend is Z")

### Data Enrichment Sources
- Apify (job boards, LinkedIn scraping)
- Apollo.io (hiring history, financials, org structure)
- Industry news, podcasts, social listening
- Direct API integrations (LinkedIn, news APIs, job boards)

### Cost Optimization
- Hybrid LLM: Claude for agent reasoning (complex decisions), Ollama/Mistral for enrichment (lower cost)
- Batch processing: Daily digests instead of real-time
- Feedback loop: Thumbs up/down training to reduce noise, improve signal quality
- VPS infrastructure: Self-managed cost control

## Constraints

- **MVP Scope**: 10 pilot accounts (expansion to 100-150 later)
- **Addressable Market**: AI security hiring (GTM/Engineering focus)
- **Human in Loop**: Sales team validates all signals before outreach (no automation of contact)
- **Daily Cadence**: Slack digests morning (GMT + EST) drive sales activity
- **Cost Per Lead**: Must remain sub-$50 per validated signal to hit unit economics
- **Feedback Integration**: Learning loop must close within 1-2 weeks to show agent improvement
- **Data Privacy**: Supabase-based CRM replica must comply with recruitment data handling

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Orchestrated agent architecture with shared context | Agents need to see each other's findings (researcher feeds resourcer, resourcer feeds copywriter) | — Pending |
| Hybrid LLM (Claude + Ollama/Mistral) | Claude for reasoning, local LLM for cost on enrichment tasks | — Pending |
| Supabase as primary store, Attio as secondary | Decouples from CRM, maintains flexibility to switch or run independently | — Pending |
| Daily batch digests over real-time | Reduces infrastructure complexity, aligns with sales team workflow (morning planning) | — Pending |
| Thumbs up/down feedback loop | Simple, lightweight mechanism for agent learning without model retraining | — Pending |
| VPS + Autonomy framework | Self-managed infrastructure for cost control, Autonomy for agent orchestration | — Pending |

---
*Last updated: 2025-01-27 after deep questioning*
