# Requirements: AI Security Recruitment Sales Intelligence Platform

**Defined:** 2025-01-27
**Core Value:** Generate high-confidence, timely sales signals and enriched lead context that maximizes the probability of reaching hiring decision-makers at the right moment with credible, personalized reasons to engage.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Signal Collection & Monitoring

- [ ] **MON-01**: System monitors hiring announcements (job postings, team expansions) for 10 pilot accounts
- [ ] **MON-02**: System monitors company signals (funding, product launches, leadership changes) for target accounts
- [ ] **MON-03**: System monitors individual signals (hires, promotions, challenges posted) for key personnel
- [ ] **MON-04**: System enriches signals with business context (competitor actions, industry trends, market moves)
- [ ] **MON-05**: Data collection integrates Apify for high-volume scraping + direct API calls for real-time enrichment

### Agent Architecture & Intelligence

- [ ] **AGT-01**: Sales Researcher agent identifies and validates hiring signals from multiple sources
- [ ] **AGT-02**: Resourcer agent identifies hiring patterns, trends, and competitive positioning for each account
- [ ] **AGT-03**: Copywriter agent generates email building blocks (signals, trends, relevance framing) for ICPs
- [ ] **AGT-04**: Reporter agent synthesizes findings and prepares daily Slack digest
- [ ] **AGT-05**: Agents use orchestrated architecture with shared context store (Supabase)
- [ ] **AGT-06**: Agents use hybrid LLM approach (Claude for reasoning, Ollama/Mistral for enrichment)
- [ ] **AGT-07**: Agents learn and improve from thumbs-up/thumbs-down feedback over time

### Data Management & Storage

- [ ] **DATA-01**: Supabase stores signals, trends, enrichment data, and agent feedback
- [ ] **DATA-02**: Data model mirrors CRM structure for flexibility (can move CRM or interact independently)
- [ ] **DATA-03**: Daily sync to Attio CRM as account notes and prospect enrichment (no auto-lead creation)
- [ ] **DATA-04**: Apollo enrichment provides hiring history, financials, and org structure
- [ ] **DATA-05**: Unique identifiers: company name + domain URL (starting point for all lookups)

### Notifications & Output

- [ ] **OUT-01**: Daily Slack digests sent at GMT and EST mornings
- [ ] **OUT-02**: Each digest contains: 3 signals + 3 trends + relevance framing per account
- [ ] **OUT-03**: Human in loop — sales team reviews signals and decides outreach action
- [ ] **OUT-04**: Feedback mechanism (thumbs up/down) captured and fed back to agents

### Infrastructure & Operations

- [ ] **INFRA-01**: VPS-based deployment (self-managed or managed DigitalOcean/Render)
- [ ] **INFRA-02**: Agent orchestration via Autonomy framework
- [ ] **INFRA-03**: Costs tracked and optimized for per-lead economics
- [ ] **INFRA-04**: System operational for 10 pilot accounts with sub-$50 cost per validated signal

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Matching Engine & Automation

- **MATCH-01**: Matching engine automatically ranks leads by hiring likelihood and candidate fit
- **MATCH-02**: Automated lead creation in Attio based on confidence thresholds
- **MATCH-03**: A/B testing framework for outreach variations

### Advanced Capabilities

- **ADV-01**: Multi-language signal collection and outreach generation
- **ADV-02**: Real-time webhook-based agent responses (vs daily batch)
- **ADV-03**: Fine-tuned models based on recruitment feedback data
- **ADV-04**: Competitor signal tracking and win/loss analysis

### Scale

- **SCALE-01**: Expansion to 100-150 accounts per recruiter
- **SCALE-02**: Support for multiple recruiter profiles and preferences
- **SCALE-03**: Hierarchical organization models (parent company watching subsidiary signals)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Matching engine (auto-ranking, lead scoring) | High complexity; MVP assumes human review of signals |
| Auto-lead creation in Attio | Human in loop required for quality; matching engine needed first |
| Multi-language support | MVP focuses on English signals and outreach; scale later |
| Real-time agent responses | Daily batch digests align with sales team workflow; complexity vs benefit |
| Model fine-tuning | Prompt-based feedback loop sufficient for MVP; retraining adds overhead |
| Mobile app | Web-based Slack digests sufficient for v1 |
| Advanced compliance (GDPR, CCPA detail) | Core data handling compliant; detailed audit after MVP |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MON-01 | Phase 1 | Pending |
| MON-02 | Phase 1 | Pending |
| MON-03 | Phase 1 | Pending |
| MON-04 | Phase 1 | Pending |
| MON-05 | Phase 1 | Pending |
| AGT-01 | Phase 2 | Pending |
| AGT-02 | Phase 2 | Pending |
| AGT-03 | Phase 2 | Pending |
| AGT-04 | Phase 2 | Pending |
| AGT-05 | Phase 2 | Pending |
| AGT-06 | Phase 2 | Pending |
| AGT-07 | Phase 3 | Pending |
| DATA-01 | Phase 3 | Pending |
| DATA-02 | Phase 3 | Pending |
| DATA-03 | Phase 4 | Pending |
| DATA-04 | Phase 1 | Pending |
| DATA-05 | Phase 1 | Pending |
| OUT-01 | Phase 4 | Pending |
| OUT-02 | Phase 4 | Pending |
| OUT-03 | Phase 4 | Pending |
| OUT-04 | Phase 5 | Pending |
| INFRA-01 | Phase 5 | Pending |
| INFRA-02 | Phase 2 | Pending |
| INFRA-03 | Phase 5 | Pending |
| INFRA-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Requirements defined: 2025-01-27*
*Last updated: 2025-01-27 after initial definition*
