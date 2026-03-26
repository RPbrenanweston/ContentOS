# Phase 1 User Stories — CMO + CRO Launch

**Status:** Ready for agent execution
**Owner:** RPBW
**Last Updated:** 2026-02-13

---

## Overview

Phase 1 success = all stories below in "✅ Accepted" state. No timelines. Stories are completed when acceptance criteria are met.

**Critical Path:** CMO stories must reach "POSITION-READY" gate before CRO can complete sequence stories.

---

## CMO Agent Stories

### US-CMO-001: Research & Outline Steady-State Framework

**As a** CMO agent
**I want to** research and outline the Steady-State Framework (Pillar A)
**So that** positioning is grounded in consultative discovery (industry data → education → trust)

**Acceptance Criteria:**
- [ ] GIVEN: Industry benchmarks (cost-per-hire 15-25%, salary ranges, hiring frequency) documented in CONTEXT.md
- [ ] WHEN: CMO conducts research using available thinking tools (Council debate on frameworks, FirstPrinciples on assumptions)
- [ ] THEN: Framework outline includes (1) problem diagnosis, (2) infrastructure positioning, (3) why current agencies fail at scale, (4) citations to 3+ academic/industry sources
- [ ] AND: Framework is "pragmatic operational" tone — no clichés, no case studies, data-first

**Definition of Done:**
- Research summary: 500-1000 words
- Citations documented with sources and retrieval date
- Outlined main sections (5-7 sections)
- Ready for Pillar A whitepaper writing

**Blocked By:** None (can start immediately)
**Unblocks:** US-CMO-004 (Whitepaper writing), US-CMO-006 (Content calendar)

**Status:** ✅ Accepted (2026-02-13)
**Output:** `outputs/cmo/pillar-a/US-CMO-001-steady-state-research.md`

---

### US-CMO-002: Research & Outline Surgical vs. Systemic Map

**As a** CMO agent
**I want to** research and outline the Surgical vs. Systemic decision map (Pillar B)
**So that** prospects can self-diagnose whether they need specialist placements or infrastructure

**Acceptance Criteria:**
- [ ] GIVEN: Sub-100 company hiring scenarios (1-5 hires/year, 5-20 hires/year, 20+ hires/year)
- [ ] WHEN: CMO maps when "specialist placement" (surgical) is right vs. "build infrastructure" (systemic)
- [ ] THEN: Framework shows clear diagnostic questions (e.g., "Do you hire the same role 3+ times/year?", "Is your hiring process repeatable?")
- [ ] AND: Each diagnosis path includes data/research supporting the recommendation
- [ ] AND: Avoids competitive positioning ("agencies suck") — stays consultative ("this is when infrastructure adds value")

**Definition of Done:**
- Decision tree diagram (visual or text-based)
- 3-5 diagnostic questions with branching logic
- Scenario examples for each branch (e.g., "startup at Series A: probably surgical now, infrastructure in 18 months")
- Research citations (3+ sources on hiring velocity, cost escalation)

**Blocked By:** None (can start immediately)
**Unblocks:** US-CMO-005 (Whitepaper writing), US-CMO-006 (Content calendar)

**Status:** ✅ Accepted (2026-02-13)
**Output:** `outputs/cmo/pillar-b/US-CMO-002-surgical-systemic-research.md`

---

### US-CMO-003: Research & Outline Pragmatic Costing Framework

**As a** CMO agent
**I want to** research and outline Pragmatic Costing (Pillar C)
**So that** positioning reframes recruitment cost as "fixed operational expense" with TCO advantages

**Acceptance Criteria:**
- [ ] GIVEN: Industry benchmarks (agency fees 15-25% salary, Exprs £36K/year fixed)
- [ ] WHEN: CMO builds TCO model comparing variable (agencies) vs. fixed (infrastructure) cost structures
- [ ] THEN: Model shows (1) baseline cost comparison, (2) compound efficiency gains over time, (3) salary escalation protection, (4) knowledge retention value
- [ ] AND: All claims backed by McKinsey, SHRM, or academic research (NOT Exprs proprietary data)
- [ ] AND: Framework uses CFO language ("fixed vs. variable budgeting", "operational expense", "infrastructure investment")

**Definition of Done:**
- TCO comparison table (5-7 scenarios: startup, growth, scaling)
- Research citations (4-5 sources: McKinsey hiring, SHRM data, IT infrastructure models)
- Cost per hire decline curve (showing efficiency gains by placement #)
- Framework narrative: 800-1200 words

**Blocked By:** None (can start immediately)
**Unblocks:** US-CMO-007 (Whitepaper writing), US-CMO-006 (Content calendar)

**Status:** ✅ Accepted (2026-02-13)
**Output:** `outputs/cmo/pillar-c/US-CMO-003-pragmatic-costing-research.md`

---

### US-CMO-004: Write & Finalize Steady-State Framework Whitepaper

**As a** CMO agent
**I want to** write the full Steady-State Framework whitepaper
**So that** positioning document is publication-ready and CRO can reference it in sales conversations

**Acceptance Criteria:**
- [ ] GIVEN: US-CMO-001 (research outline) is complete with citations
- [ ] WHEN: CMO writes polished whitepaper (2000-3000 words)
- [ ] THEN: Whitepaper includes (1) executive summary, (2) problem diagnosis, (3) framework explanation, (4) when to apply, (5) case study alternatives (data-driven examples, not customer stories)
- [ ] AND: Tone passes "pragmatic operational" test (read by CFO, not marketer)
- [ ] AND: Every major claim backed by academic/industry source in footnotes
- [ ] AND: PDF-ready format (header, footer, proper citations)

**Definition of Done:**
- Whitepaper markdown (ready for PDF conversion)
- 5+ peer citations with proper attribution
- Executive summary (200 words)
- Case study section replaced with 2-3 data-driven scenarios

**Blocked By:** US-CMO-001
**Unblocks:** US-CMO-009 (POSITION-READY gate), US-CRO-002 (sequence writing)

**Status:** ✅ Accepted (2026-02-13)
**Output:** `outputs/cmo/pillar-a/US-CMO-004-steady-state-whitepaper.md`

---

### US-CMO-005: Write & Finalize Surgical vs. Systemic Whitepaper

**As a** CMO agent
**I want to** write the Surgical vs. Systemic decision map whitepaper
**So that** prospects have a clear diagnostic tool to self-evaluate infrastructure fit

**Acceptance Criteria:**
- [ ] GIVEN: US-CMO-002 (research outline) is complete with diagnostic questions
- [ ] WHEN: CMO writes polished whitepaper (1500-2500 words)
- [ ] THEN: Whitepaper includes (1) diagnostic overview, (2) question-by-question guide, (3) scenario walkthroughs, (4) next steps for each diagnosis
- [ ] AND: Includes interactive decision tree (even as text, structured as "If X, then go to section Y")
- [ ] AND: Cites research on hiring velocity, cost escalation, knowledge retention
- [ ] AND: Avoids competitive language ("better than agencies") — stays consultative

**Definition of Done:**
- Whitepaper markdown
- Decision tree (visual or structured text)
- 3+ complete scenario walkthroughs (Series A startup, scaling 50-person, rapid growth 100+ person)
- 4+ peer citations

**Blocked By:** US-CMO-002
**Unblocks:** US-CMO-009 (POSITION-READY gate), US-CRO-003 (objection playbook)

**Status:** ✅ Accepted (2026-02-13)
**Output:** `outputs/cmo/pillar-b/US-CMO-005-surgical-systemic-whitepaper.md`

---

### US-CMO-006: Create Content Calendar & Publication Schedule

**As a** CMO agent
**I want to** create a monthly content calendar
**So that** CRO, Social Manager, and Copywriter know what's coming and can align sales/social efforts

**Acceptance Criteria:**
- [ ] GIVEN: All 3 pillars outlined (US-CMO-001, 002, 003)
- [ ] WHEN: CMO creates 3-month rolling calendar (Feb, Mar, Apr)
- [ ] THEN: Calendar includes (1) pillar-mapped blog topics, (2) whitepaper milestones, (3) social content themes, (4) publishing dates
- [ ] AND: Includes dependencies: "Blog X publishes before Email Y references it"
- [ ] AND: Each calendar entry links to corresponding user story or content asset
- [ ] AND: Prioritizes critical path: pillars → whitepapers → amplification content

**Definition of Done:**
- Month-by-month calendar (markdown or table format)
- 8-12 content items across 3 months
- Dependencies clearly marked
- Links to PHASE1_USERSTORIES.md for tracking

**Blocked By:** Partial block on US-CMO-001, 002, 003 (outlines needed, drafts not required)
**Unblocks:** US-CMO-010 (Brand voice guide), Social Manager Phase 2 sub-agent

**Status:** ✅ Accepted (2026-02-13)
**Output:** `outputs/cmo/US-CMO-006-content-calendar.md`

---

### US-CMO-007: Write & Finalize Pragmatic Costing Whitepaper

**As a** CMO agent
**I want to** write the Pragmatic Costing TCO whitepaper
**So that** CRO has a data-backed framework for pricing conversations with CFOs/founders

**Acceptance Criteria:**
- [ ] GIVEN: US-CMO-003 (research outline, TCO model) is complete
- [ ] WHEN: CMO writes polished whitepaper (2000-3000 words)
- [ ] THEN: Whitepaper includes (1) cost comparison methodology, (2) TCO scenarios by company size/stage, (3) compound efficiency explanation, (4) salary escalation protection value, (5) infrastructure ROI timeline
- [ ] AND: Every number backed by industry data (SHRM, Payscale, Bureau of Labor Stats, McKinsey)
- [ ] AND: Includes cost per hire decline curve (visual + explanation)
- [ ] AND: Frames cost as "operational expense infrastructure" (CFO language, not vendor pitch)

**Definition of Done:**
- Whitepaper markdown
- 3-4 TCO comparison tables (startup vs. Series A vs. scaling)
- Cost per hire decline curve (by placement #)
- 6+ peer citations with URLs and retrieval dates
- Executive summary for CFO (1-page version)

**Blocked By:** US-CMO-003
**Unblocks:** US-CMO-009 (POSITION-READY gate), US-CRO-004 (pricing conversation framework)

**Status:** ✅ Accepted (2026-02-13)
**Output:** `outputs/cmo/pillar-c/US-CMO-007-pragmatic-costing-whitepaper.md`

---

### US-CMO-008: Create Brand Voice Guide for Sub-Agents & CRO

**As a** CMO agent
**I want to** document the finalized brand voice guide
**So that** CRO, Copywriter, Social Manager, and other sub-agents stay aligned on tone, language, and positioning

**Acceptance Criteria:**
- [ ] GIVEN: All 3 whitepapers written (US-CMO-004, 005, 007)
- [ ] WHEN: CMO creates Brand Voice Guide
- [ ] THEN: Guide includes (1) tone pillars (pragmatic, operational, consultative), (2) do/don't examples, (3) industry term usage (accurate + no hype), (4) claim-backing requirements, (5) cliché avoidance list, (6) example emails/copy using the voice
- [ ] AND: Includes template: "When writing about [topic], use [voice], cite [sources], avoid [clichés]"
- [ ] AND: Examples extracted from pillar whitepapers (real content, not invented)

**Definition of Done:**
- Brand Voice Guide markdown (1500-2000 words)
- 10-15 do/don't examples covering email, blog, social
- Claim-backing template ("Research from X shows...")
- Cliché list (20+ examples to avoid)
- Examples section with 3-5 sample copy pieces in brand voice

**Blocked By:** US-CMO-004, 005, 007 (whitepapers needed for examples)
**Unblocks:** US-CRO-001 (sequence drafting), Social Manager/Copywriter Phase 2 onboarding

**Status:** ✅ Accepted (2026-02-13)
**Output:** `outputs/cmo/US-CMO-008-brand-voice-guide.md`

---

### US-CMO-009: Issue POSITION-READY Gate (All 3 Pillars Finalized)

**As a** CMO agent
**I want to** formally issue POSITION-READY gate
**So that** CRO knows positioning is locked and can begin writing sequences with confidence

**Acceptance Criteria:**
- [ ] GIVEN: US-CMO-004, 005, 007, 008 all complete and RPBW-approved
- [ ] WHEN: CMO reviews all deliverables for consistency (tone, citations, positioning)
- [ ] THEN: Issues POSITION-READY gate message: "All 3 pillars finalized. Positioning locked. No further changes without RPBW approval."
- [ ] AND: Gate message includes summary of what's locked: Steady-State Framework, Surgical vs. Systemic, Pragmatic Costing
- [ ] AND: Lists all supporting assets: 3 whitepapers, brand voice guide, content calendar

**Definition of Done:**
- POSITION-READY gate message posted to shared task list
- Gate message includes links to all finalized documents
- Message format: structured for CRO to read and confirm ("Proceeding with sequence writing" response)

**Blocked By:** US-CMO-004, 005, 007, 008
**Unblocks:** US-CRO-001, 002, 003, 004 (CRO can now write sequences without blocking on positioning)

**Status:** ✅ Accepted (2026-02-13)
**Output:** Gate message posted to `tasks/SHARED-GATES.md`

---

### US-CMO-010: Conduct Positioning Validation (Internal Stress-Test)

**As a** CMO agent
**I want to** stress-test all 3 pillars against realistic objections
**So that** positioning is robust and CRO isn't blindsided by founder pushback

**Acceptance Criteria:**
- [ ] GIVEN: All 3 whitepapers finalized (US-CMO-004, 005, 007)
- [ ] WHEN: CMO conducts RedTeam or Council debate (32 agents vs. positioning)
- [ ] THEN: Documents 5-10 strongest objections/questions that emerge, with CMO-approved responses
- [ ] AND: Responses cite whitepaper sections or external research (not hand-waving)
- [ ] AND: Identifies any positioning gaps or contradictions (e.g., "Framework A says 'infrastructure at 10+ hires' but Framework B says 'at 15+ hires'")
- [ ] AND: Feeds findings to CRO as "anticipated objections" for objection playbook

**Definition of Done:**
- Objections document (5-10 likely objections with CMO responses)
- Each response backed by whitepaper or research
- Positioning consistency check (no contradictions between pillars)
- Summary note to CRO: "These objections are baked into Pragmatic Costing section; reference [page X] in conversations"

**Blocked By:** US-CMO-004, 005, 007
**Unblocks:** US-CRO-003 (objection playbook writing)

**Status:** ✅ Accepted (2026-02-13)
**Output:** `outputs/cmo/US-CMO-010-positioning-validation.md`

---

## CRO Agent Stories

### US-CRO-001: Draft PP-Email Sequences (p1-p4 + e1)

**As a** CRO agent
**I want to** draft the PP-Email outbound sequences (p1 through p4 + exit email)
**So that** SDR has campaign-ready email copy to execute UK Founders campaign

**Acceptance Criteria:**
- [ ] GIVEN: POSITION-READY gate issued (US-CMO-009) — positioning is locked
- [ ] WHEN: CRO writes 5 emails (p1, p2, p3, p4, e1 exit) following PP-Email framework
- [ ] THEN: Each email includes (1) CMO-approved positioning language, (2) industry data reference, (3) consultative question or insight, (4) clear CTA (discovery call)
- [ ] AND: Emails reference or cite the 3 pillars (Steady-State, Surgical vs. Systemic, Pragmatic Costing) naturally — not hard-sell
- [ ] AND: All emails use "pragmatic operational" tone (CFO language, not marketing hype)
- [ ] AND: Sequences avoid clichés from CMO brand voice guide
- [ ] AND: Subject lines are data/consultative-focused ("Your hiring cost structure", "Placement frequency question") not competitive ("Stop overpaying")

**Definition of Done:**
- 5 email drafts (p1-p4, e1)
- Markdown format with subject lines, body copy, CTAs
- Inline citations to industry data (e.g., "Research from SHRM shows...")
- Ready for voice review by CMO (SEQUENCE-DRAFT gate)

**Blocked By:** US-CMO-009 (POSITION-READY gate) -- CLEARED
**Unblocks:** US-CRO-002 (voice review), SDR Phase 2 sub-agent

**Status:** ✅ Accepted (2026-02-13)
**Output:** `outputs/cro/US-CRO-001-pp-email-sequences.md`

---

### US-CRO-002: Iterate Sequences Based on CMO Voice Review

**As a** CRO agent
**I want to** revise email sequences based on CMO voice feedback
**So that** final sequences are brand-aligned and ready for campaign

**Acceptance Criteria:**
- [ ] GIVEN: US-CRO-001 complete (draft sequences submitted for review)
- [ ] WHEN: CMO reviews sequences and provides feedback (voice alignment, tone, citation accuracy)
- [ ] THEN: CRO revises sequences addressing all feedback (no "we'll ignore that" decisions)
- [ ] AND: CRO asks clarifying questions on any ambiguous feedback
- [ ] AND: Revised sequences maintain original structure but improve CMO alignment

**Definition of Done:**
- Revised email sequences (incorporating all CMO feedback)
- Change log documenting what was revised and why
- Ready for SEQUENCE-DRAFT gate

**Blocked By:** US-CRO-001 completion + CMO voice review time
**Unblocks:** US-CRO-005 (SEQUENCE-DRAFT gate), SDR Phase 2 execution

**Status:** 🟡 Pending

---

### US-CRO-003: Write Discovery Call Script

**As a** CRO agent
**I want to** write and refine the discovery call script
**So that** SDR/AE have approved script for initial prospect conversations

**Acceptance Criteria:**
- [ ] GIVEN: POSITION-READY gate issued (US-CMO-009)
- [ ] WHEN: CRO writes discovery call script (15-20 min call)
- [ ] THEN: Script includes (1) opening (consultant intro, not vendor pitch), (2) discovery questions (diagnose surgical vs. systemic), (3) Steady-State Framework explanation (if relevant), (4) close (next step: can we explore TCO?)
- [ ] AND: Script uses CMO-approved tone and language
- [ ] AND: All claims back-referenced to whitepapers or industry data
- [ ] AND: Script includes "what to listen for" (pain signals, hiring velocity indicators)
- [ ] AND: Script includes objection responses (handles "we already have a recruiter internally", "want to try one month first")

**Definition of Done:**
- Discovery call script markdown (1000-1500 words)
- Annotated with timing ("Opening: 2 min", "Discovery: 8 min", etc.)
- Inline references to CMO whitepapers and industry data
- Objection responses section (5-7 common objections)
- Ready for CMO voice review and AE testing

**Blocked By:** US-CMO-009 (POSITION-READY gate) -- CLEARED
**Unblocks:** US-CRO-005 (gate issuance), AE Phase 2 sub-agent

**Status:** ✅ Accepted (2026-02-13)
**Output:** `outputs/cro/US-CRO-003-discovery-call-script.md`

---

### US-CRO-004: Write Objection Playbook

**As a** CRO agent
**I want to** write the objection handling playbook
**So that** SDR/AE have CMO-approved responses to common prospect objections

**Acceptance Criteria:**
- [ ] GIVEN: US-CMO-010 (positioning stress test) — anticipated objections documented
- [ ] WHEN: CRO documents objections + responses
- [ ] THEN: Playbook includes (1) objection statement, (2) root concern diagnosis, (3) consultative response (not defensive), (4) data/research backing, (5) suggested next step
- [ ] AND: Objections cover: agency superiority, internal recruiter exists, small volume ("try one month"), pricing too high, "we'll stay with current agency"
- [ ] AND: Responses use CMO-approved language and cite whitepapers/industry data
- [ ] AND: Responses frame as "consultant asking clarifying questions" not "sales rep defending product"

**Definition of Done:**
- Objection playbook markdown (1500-2000 words)
- 6-8 common objections with full responses
- Root concern diagnosis for each (what's the founder *really* asking?)
- Data backing for each response
- Template: "Objection → Root Concern → Consultative Response → Data → Next Step"

**Blocked By:** US-CMO-010 (anticipated objections from positioning stress-test) -- CLEARED
**Unblocks:** US-CRO-005 (gate issuance), SDR/AE Phase 2 sub-agents

**Status:** ✅ Accepted (2026-02-13)
**Output:** `outputs/cro/US-CRO-004-objection-playbook.md`

---

### US-CRO-005: Write Pricing Conversation Framework

**As a** CRO agent
**I want to** create the pricing conversation framework
**So that** AE can handle pricing conversations using Pragmatic Costing positioning

**Acceptance Criteria:**
- [ ] GIVEN: US-CMO-007 (Pragmatic Costing whitepaper) complete
- [ ] WHEN: CRO writes pricing framework
- [ ] THEN: Framework includes (1) objection diagnosis ("too expensive" usually means "haven't calculated TCO"), (2) TCO calculator walkthrough, (3) cost comparison chart, (4) ROI timeline explanation, (5) close language
- [ ] AND: Framework uses CFO language ("fixed vs. variable cost", "operational expense", "predictable budget")
- [ ] AND: All numbers cite SHRM/Payscale/industry data (not proprietary Exprs claims)
- [ ] AND: Includes talking points: "At 5 placements/year, infrastructure is £36K fixed vs. £50K+ variable"

**Definition of Done:**
- Pricing framework markdown (1000-1500 words)
- TCO calculator explanation (step-by-step walkthrough)
- Cost comparison chart (show the math)
- 5-7 pricing conversation scenarios (startup, Series A, scaling)
- CFO-focused talking points (10+ examples)

**Blocked By:** US-CMO-007 (Pragmatic Costing whitepaper) -- CLEARED
**Unblocks:** US-CRO-006 (gate issuance), AE Phase 2 onboarding

**Status:** ✅ Accepted (2026-02-13)
**Output:** `outputs/cro/US-CRO-005-pricing-conversation-framework.md`

---

### US-CRO-006: Create Sales Onboarding Handoff Template

**As a** CRO agent
**I want to** create a deal handoff document template
**So that** every closed deal is documented for Customer Success and CRO can analyze win/loss patterns

**Acceptance Criteria:**
- [ ] GIVEN: All sequence, script, objection, and pricing stories complete (US-CRO-001 through 005)
- [ ] WHEN: CRO creates handoff template
- [ ] THEN: Template includes (1) prospect pain points discovered, (2) positioning used to win (which pillar resonated?), (3) objections faced + how responded, (4) pricing justification (why £36K/month?), (5) 90-day success milestones, (6) CSM handoff notes
- [ ] AND: Template is one-pager format (easy for AE to complete post-close)
- [ ] AND: Template includes analysis hooks (e.g., "Which pillar closed the deal?" to track messaging effectiveness)

**Definition of Done:**
- Handoff template markdown (one-page format)
- 8-10 data fields for AE to complete post-close
- Examples of good/bad handoff entries
- Instructions for CS team on how to use it

**Blocked By:** US-CRO-001, 003, 004, 005 (all revenue ops stories inform this)
**Unblocks:** CS Phase 2 sub-agent, CRO analytics

**Status:** ✅ Accepted (2026-02-13)
**Output:** `outputs/cro/US-CRO-006-sales-onboarding-handoff-template.md`

---

### US-CRO-007: Iterate All Deliverables Based on CMO Voice Review

**As a** CRO agent
**I want to** revise all sales sequences, scripts, and playbooks based on CMO feedback
**So that** all customer-facing copy is brand-aligned

**Acceptance Criteria:**
- [ ] GIVEN: US-CRO-001, 003, 004, 005, 006 complete and submitted for CMO review
- [ ] WHEN: CMO reviews all deliverables for voice/tone/positioning alignment
- [ ] THEN: CRO addresses all feedback (no contentious disputes — if CMO objects, it's law)
- [ ] AND: CRO maintains quality while incorporating feedback
- [ ] AND: CRO asks clarifying questions on ambiguous feedback

**Definition of Done:**
- Revised sequences, scripts, playbooks, pricing framework (incorporating all CMO feedback)
- Change log for each document
- Ready for SEQUENCE-DRAFT gate

**Blocked By:** CMO review time (asynchronous, no blocking)
**Unblocks:** US-CRO-008 (gate issuance), Phase 2 sub-agents

**Status:** 🟡 Pending

---

### US-CRO-008: Issue SEQUENCE-DRAFT Gate & Prepare for SDR/AE Launch

**As a** CRO agent
**I want to** formally issue SEQUENCE-DRAFT gate
**So that** RPBW and CMO know revenue operations are ready and Phase 2 sub-agents can launch

**Acceptance Criteria:**
- [ ] GIVEN: US-CRO-001, 003, 004, 005, 006, 007 all complete and CMO-approved
- [ ] WHEN: CRO reviews all deliverables for consistency and readiness
- [ ] THEN: Issues SEQUENCE-DRAFT gate message: "Email sequences, discovery script, objection playbook, pricing framework, and handoff template finalized. Ready for SDR/AE execution."
- [ ] AND: Gate message includes links to all assets
- [ ] AND: Message includes summary for SDR: "Here's what you're executing. Here's the positioning. Here's what success looks like."

**Definition of Done:**
- SEQUENCE-DRAFT gate message posted to shared task list
- Gate message includes summary + links
- Gate message invites RPBW feedback ("Ready to launch Phase 2?")

**Blocked By:** US-CRO-001 through 007
**Unblocks:** Phase 2 SDR/AE agent spawning, Phase 1 completion

**Status:** 🟡 Pending

---

## Gate Definitions (Async Status Updates)

All stories post gate messages to shared task list when complete. Format:

```
[GATE_NAME]
Status: ✅ ISSUED
Issued By: [Agent]
Timestamp: [ISO 8601]
Summary: [What was completed]
Links: [URL to assets]
Next: [Who unblocks and what do they do]
```

### POSITION-READY Gate
**Issued by:** CMO (US-CMO-009)
**Received by:** CRO
**Effect:** CRO can begin writing sequences without waiting for positioning finalization

### SEQUENCE-DRAFT Gate
**Issued by:** CRO (US-CRO-008)
**Received by:** RPBW + CMO
**Effect:** Phase 1 complete; Phase 2 sub-agent spawning can begin

---

## Phase 1 Success Criteria

All stories must reach ✅ Accepted state:

- [ ] US-CMO-001 through 010: All CMO stories accepted
- [ ] US-CRO-001 through 008: All CRO stories accepted
- [ ] POSITION-READY gate: Issued
- [ ] SEQUENCE-DRAFT gate: Issued
- [ ] RPBW approves Phase 2 expansion

**No timeline. Done = when all stories are accepted.**

---

## Phase 1 Backlog Status

| ID | Title | Status | Accepted? |
|---|---|---|---|
| US-CMO-001 | Research Steady-State Framework | ✅ Accepted | ✅ |
| US-CMO-002 | Research Surgical vs. Systemic Map | ✅ Accepted | ✅ |
| US-CMO-003 | Research Pragmatic Costing Framework | ✅ Accepted | ✅ |
| US-CMO-004 | Write Steady-State Whitepaper | ✅ Accepted | ✅ |
| US-CMO-005 | Write Surgical vs. Systemic Whitepaper | ✅ Accepted | ✅ |
| US-CMO-006 | Create Content Calendar | ✅ Accepted | ✅ |
| US-CMO-007 | Write Pragmatic Costing Whitepaper | ✅ Accepted | ✅ |
| US-CMO-008 | Create Brand Voice Guide | ✅ Accepted | ✅ |
| US-CMO-009 | Issue POSITION-READY Gate | ✅ Accepted | ✅ |
| US-CMO-010 | Conduct Positioning Validation | ✅ Accepted | ✅ |
| US-CRO-001 | Draft PP-Email Sequences | ✅ Accepted (2026-02-13) | ✅ |
| US-CRO-002 | Iterate Sequences (Voice Review) | 🟡 Pending (blocked on CMO voice review) | ⬜ |
| US-CRO-003 | Write Discovery Call Script | ✅ Accepted (2026-02-13) | ✅ |
| US-CRO-004 | Write Objection Playbook | ✅ Accepted (2026-02-13) | ✅ |
| US-CRO-005 | Write Pricing Framework | ✅ Accepted (2026-02-13) | ✅ |
| US-CRO-006 | Create Handoff Template | ✅ Accepted (2026-02-13) | ✅ |
| US-CRO-007 | Iterate All Deliverables (Voice Review) | 🟡 Pending (blocked on CMO voice review) | ⬜ |
| US-CRO-008 | Issue SEQUENCE-DRAFT Gate | 🟡 Pending (blocked on CRO-002 + CRO-007) | ⬜ |

---

**Document Status:** Ready for agent execution
**Next Step:** Spawn CMO agent with CMO-SPAWN.md + this backlog
