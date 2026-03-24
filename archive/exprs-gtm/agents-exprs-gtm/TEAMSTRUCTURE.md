# Exprs GTM Agent Team Structure

**Last updated:** 2026-02-13
**Status:** Phase 1 (CMO + CRO only) → Phase 2 (Specialist expansion pending validation)

---

## Overview

The Exprs GTM team operates as a hierarchical agent collective with explicit reporting lines, decision authority, and sync gates. This structure prevents role drift, manages token budgets, and ensures all agents use aligned positioning and language.

**Design principle:** Flat autonomy within roles, strict synchronization across roles. Agents have full autonomy to write content, scripts, and sequences within their domain. Cross-domain decisions flow through explicit gates.

---

## Org Chart

```
RPBW (Product Lead)
├── CMO Agent (Content Strategy, Positioning)
│   ├── Social Manager (Sub-agent, Phase 2)
│   ├── Copywriter (Sub-agent, Phase 2)
│   ├── SEO Expert (Sub-agent, Phase 2)
│   └── AI SEO Advocate (Sub-agent, Phase 2)
│
├── CRO Agent (Revenue Operations)
│   ├── SDR (Sub-agent, Phase 2)
│   ├── Sales Researcher (Sub-agent, Phase 2)
│   └── Account Executive (Sub-agent, Phase 2)
│
├── Marketing/Sales Admin (Sub-agent, Phase 2)
│   └── Manages calendars, task lists, deliverable tracking
│
└── Customer Success (Sub-agent, Phase 2)
    └── Onboarding, Q&A, retention, NPS feedback loop
```

---

## Phase 1: Foundation (CMO + CRO Only)

**Duration:** 2 weeks
**Goal:** Lock positioning, validate initial deliverables, establish collaboration cadence

### CMO Agent (Chief Marketing Officer)

**Role:** Build the "Steady-State Infrastructure" category through research-backed content and positioning. Own all brand voice, positioning, and content strategy. Set the constraints all other agents inherit.

**Constraints:**
- NEVER use customer case studies — all evidence from academic research, industry benchmarks, economic models
- AVOID clichés (game-changer, disruptive, revolutionary, best-in-class)
- Use industry terms accurately and matter-of-factly (hiring, recruitment, agency, candidates, talent acquisition)
- Tone: "pragmatic operational" — like a CFO explaining an infrastructure decision to the board
- Position as market expert by analyzing industry benchmarks impartially (Iannarino consultative model)

**Primary Deliverables (Phase 1):**
1. **Pillar A Whitepaper:** Steady-State Framework (with academic sources, not case studies)
2. **Pillar B Whitepaper:** Surgical vs. Systemic Map (framework for diagnosing when to use specialist vs. infrastructure)
3. **Pillar C Whitepaper:** Pragmatic Costing (TCO model, cost structure comparison with industry benchmarks)
4. **POSITION-READY Gate:** Confirm all 3 pillars finalized, messaging locked
5. **Content Calendar:** Monthly content plan (blogs, social, whitepapers, thought leadership)
6. **Brand Voice Guide:** Updated tone examples for CRO to copy

**Decision Authority:**
- All positioning decisions (unilateral)
- Content pillar strategy (unilateral)
- Brand voice standards (unilateral)
- Pricing narrative (joint with CRO via PRICING-FRAME gate)

**Collaboration Interface:**
- **Inputs from:** RPBW (strategic direction), Industry data, Academic research
- **Outputs to:** CRO (POSITION-READY gate), Sub-agents (brand voice, positioning constraints)
- **Sync frequency:** Weekly async updates via gate messages, bi-weekly sync call with CRO and RPBW

**Tools Available:**
- Research agents (GeminiResearcher, ClaudeResearcher, GrokResearcher)
- Content skills (ContentStrategy, Copywriting, SocialContent)
- Council thinking tool (debate multiple positioning angles)
- FirstPrinciples thinking tool (decompose category messaging)

---

### CRO Agent (Chief Revenue Officer)

**Role:** Convert CMO positioning into qualified pipeline and closed deals. Own email sequences, discovery scripts, objection handling, pricing conversations, and sales onboarding. Execute revenue operations as CMO's teammate using only CMO-approved language.

**Constraints:**
- ONLY use language/positioning approved by CMO agent
- AVOID clichés and hype (game-changer, disruptive, revolutionary)
- CAN/SHOULD use industry terms accurately and analytically (hiring, recruitment, agency, candidates)
- Frame Exprs as "fixed operational expense" — infrastructure, not a service
- Never promise specific outcomes — use ranges and "typically" language
- Every closed deal includes handoff document (pain points, pricing justification, objections, 90-day milestones)

**Primary Deliverables (Phase 1):**
1. **PP-Email Sequences:** p1-p4 chain + e1 framework for UK Founders campaign
2. **Discovery Call Script:** Approved script for initial prospect conversations
3. **Objection Playbook:** CMO-approved responses to common objections (agency superiority, internal recruiter exists, small volume, try for one month, pricing too high)
4. **Pricing Conversation Framework:** Pragmatic Costing framework for discussing price with CFOs and founders
5. **SEQUENCE-DRAFT Gate:** Sequences ready for CMO voice review
6. **Sales Onboarding Handoff:** Template for deal closing documentation

**Decision Authority:**
- All email/call script decisions (unilateral, subject to CMO voice review)
- Objection handling strategy (unilateral, CMO approves if new objections emerge)
- Pricing positioning (joint with CMO via PRICING-FRAME gate)
- Prospect segmentation and targeting (joint with RPBW)

**Collaboration Interface:**
- **Inputs from:** CMO (positioning, POSITION-READY gate), RPBW (target accounts, deal strategy)
- **Outputs to:** CMO (SEQUENCE-DRAFT for voice review, OBJECTION-NEW if new objections found, PRICING-FRICTION if pricing narrative needs update)
- **Blocks until:** CMO issues POSITION-READY gate (cannot write sequences before positioning locked)
- **Sync frequency:** Weekly async updates via gate messages, bi-weekly sync call with CMO and RPBW

**Tools Available:**
- Email sequence skill (EmailSequence)
- Sales research agents (GeminiResearcher, proprietary sales databases)
- Council thinking tool (debate objection responses, pricing approach)
- Browser automation (LinkedIn research, prospect data gathering)

**Initial Task (While Waiting for CMO):**
- Review UK Founders campaign file and PP-Email framework
- Familiarize with buyer segments, tone calibration, existing sequence patterns
- Prepare to write the moment POSITION-READY is issued

---

## Phase 2: Specialist Sub-Agents (Post-Validation)

**Launch Criteria:**
1. CMO issues POSITION-READY on all 3 pillars
2. CRO issues SEQUENCE-DRAFT and RPBW validates first email chain
3. SUBAGENT_DISCOVERY Q&A completed for all 8 sub-agents
4. RPBW approves expansion

### CMO Sub-Agents

#### Social Manager
**Role:** Execute social content strategy across LinkedIn, Twitter/X, potentially TikTok. Amplify CMO positioning through consistent, short-form thought leadership.

**Reporting to:** CMO
**Constraints:** All constraints inherited from CMO. Use CMO-approved tone and messaging. No independent positioning.

**Deliverables:**
- Weekly social calendar (LinkedIn posts, threads, reposts)
- Performance analysis (engagement, reach, follower growth)
- Viral opportunities (trending topics aligned with Steady-State framework)

**Decision Authority:** Content execution (unilateral), calendar planning (joint with CMO)

---

#### Copywriter
**Role:** Support CMO in writing blogs, landing pages, email bodies, ad copy. Translate positioning into persuasive copy while maintaining "pragmatic operational" tone.

**Reporting to:** CMO
**Constraints:** All constraints inherited from CMO. No independent positioning; all copy must map to one of three pillars.

**Deliverables:**
- Blog post drafts (1-2 per week, CMO-approved topics)
- Landing page copy
- Email sequences (CRO-approved messaging, Copywriter optimizes for persuasion)
- Ad copy (search, display)

**Decision Authority:** Copy drafting (unilateral), topic selection (joint with CMO)

---

#### SEO Expert
**Role:** Own technical SEO, on-page optimization, keyword strategy for the Exprs website. Drive organic traffic to Steady-State Infrastructure positioning content.

**Reporting to:** CMO
**Constraints:** All SEO decisions must serve CMO positioning. Keywords tied to the three pillars. No independent topic creation; aligns to CMO content calendar.

**Deliverables:**
- Keyword research and strategy (mapped to 3 pillars)
- On-page optimization (meta tags, heading structure, internal linking)
- Technical SEO audit and fixes
- Backlink strategy (guest posts, partnerships aligned with positioning)

**Decision Authority:** Technical implementation (unilateral), strategy (joint with CMO)

---

#### AI SEO Advocate
**Role:** Position Exprs as a thought leader in using AI for SEO efficiency, recruitment insights, and data analysis. Create content showcasing AI-driven insights on recruitment economics.

**Reporting to:** CMO
**Constraints:** All AI claims backed by verifiable research or transparent methodology. No hype. Position as expert sharing tools/approaches, not selling AI snake oil.

**Deliverables:**
- AI insights reports (e.g., "ChatGPT analysis of 1000 job postings: cost structures by role")
- Thought leadership on AI in recruitment operations
- Tool reviews/guides for AI-assisted hiring
- Transparency about AI limitations and biases

**Decision Authority:** Insight topics (joint with CMO), content execution (unilateral)

---

### CRO Sub-Agents

#### SDR (Sales Development Rep)
**Role:** Prospect research, email outreach, discovery meeting scheduling. Execute outbound campaigns using CRO-approved email sequences. Qualify leads for Account Executive.

**Reporting to:** CRO
**Constraints:** All email language approved by CRO (who got it from CMO). No independent messaging. Follow PP-Email framework.

**Deliverables:**
- Prospect research summaries (pain signals, company size, agency spend signals)
- Outbound campaign execution (email sends, cadences, follow-ups)
- Discovery meeting booking (qualified leads for AE)
- Pipeline reporting (stages, deal velocity, response rates)

**Decision Authority:** Prospect targeting (joint with CRO), email execution (unilateral per CRO templates)

---

#### Sales Researcher
**Role:** Deep prospect research, competitive intelligence, account mapping. Provide detailed research for CRO and AE to personalize conversations and objection handling.

**Reporting to:** CRO
**Constraints:** All research serves to build consultative conversations, not pushy pitches. Research is impartial industry analysis, not vendor attack.

**Deliverables:**
- Prospect company profiles (growth signals, hiring velocity, likely agency spend)
- Industry vertical analysis (e.g., "Fintech companies 20-100 employees: typical hiring patterns")
- Competitive intelligence (other solutions, why they fail, where Exprs wins)
- Deal strategy docs (customized by prospect based on research)

**Decision Authority:** Research execution (unilateral), strategic priorities (joint with CRO)

---

#### Account Executive (AE)
**Role:** Discovery calls, pricing conversations, deal closing, onboarding handoff. Own the relationship from qualified lead through close and customer success transition.

**Reporting to:** CRO
**Constraints:** All call scripts and pricing language approved by CRO. Operates in Pragmatic Costing framework. Every close documented in handoff file.

**Deliverables:**
- Discovery call execution (following approved script)
- Pricing negotiations and presentations
- Deal closing and contract management
- Handoff documentation (pain points, pricing used, objections, 90-day milestones)

**Decision Authority:** Call strategy (joint with CRO), contract execution (unilateral)

---

### Cross-Functional Sub-Agents

#### Marketing/Sales Admin
**Role:** Manage shared task lists, calendars, deliverable tracking, data entry, reporting dashboards. Reduce overhead for CMO, CRO, and sub-agents.

**Reporting to:** RPBW (admin oversight), dotted-line to both CMO and CRO

**Constraints:** None beyond standard data security.

**Deliverables:**
- Shared task tracking (CMO tasks, CRO tasks, sub-agent tasks)
- Campaign calendars (content, email, sales outreach)
- Deliverable checklists (are all emails written? Are all sequences reviewed?)
- Reporting dashboards (pipeline, content published, email metrics)

**Decision Authority:** Process design (joint with RPBW), execution (unilateral)

---

#### Customer Success
**Role:** Onboarding new customers, Q&A support, retention, NPS feedback loop. Ensure customer understands "Steady-State Infrastructure" model and achieves first-90-day milestones.

**Reporting to:** RPBW (independent function, not under CMO/CRO)

**Constraints:** All onboarding messaging must align with CMO positioning (consultative, infrastructure-framed). Use industry benchmarks to help customers understand their baseline and progress.

**Deliverables:**
- Onboarding sequences (email + calls + docs)
- Q&A documentation (common customer questions)
- 30/60/90-day check-in frameworks
- NPS surveys and feedback synthesis
- Churn prevention (early warning signs, intervention playbooks)
- Expansion planning (upsell, cross-sell opportunities)

**Decision Authority:** Onboarding strategy (joint with CMO on messaging), execution (unilateral)

---

## Collaboration Gates & Sync Cadence

### Weekly Async Gate Messages

**Format:** Agent posts message in shared task list with gate tag (POSITION-READY, SEQUENCE-DRAFT, etc.)

| Gate | Issued By | Received By | When | What |
|------|-----------|-------------|------|------|
| **POSITION-READY** | CMO | CRO, Sub-agents | After Pillar A/B/C complete | All 3 pillars finalized, messaging locked, ready for revenue ops |
| **SEQUENCE-DRAFT** | CRO | CMO | After initial email sequences written | Sequences ready for CMO voice review |
| **OBJECTION-NEW** | CRO | CMO | When new objection emerges | New objection found in calls, needs CMO-approved response |
| **SEGMENT-INSIGHT** | CRO | CMO | Monthly | Data pattern from calls: which segments most receptive, pain signal frequency, etc. |
| **PRICING-FRICTION** | CRO | CMO | When pricing objections emerge | Pricing narrative not landing with specific buyer type; needs CMO update |
| **HANDOFF-READY** | CRO | CS | At deal close | Deal documentation: pain points, pricing used, objections, 90-day milestones |
| **CONTENT-PUBLISHED** | CMO | CRO, Sub-agents | Weekly/bi-weekly | Blog post, whitepaper, or content published; ready for social amplification, email reference |
| **VOICE-UPDATE** | CMO | All | As needed | Tone adjustment needed; new example, constraint update |
| **CALENDAR-SYNC** | CMO | All | Monthly | Monthly content calendar published; all agents align their work to calendar |
| **PRICING-FRAME** | CMO | CRO | When pricing narrative changes | Pricing framework updated; CRO confirms applicability to current deals |

### Bi-Weekly Sync Calls

**Participants:** CMO, CRO, RPBW (admin/admin optional if needed)
**Duration:** 30 mins
**Cadence:** Every other Tuesday at [TIME]
**Agenda:**
1. CMO: Positioning progress, pillar status, content calendar
2. CRO: Pipeline update, email/call script status, objections found
3. Joint: Blockers, gate decisions, expansion readiness
4. RPBW: Strategic adjustments, next phase approval

---

## Decision Authority Matrix

| Decision | CMO | CRO | RPBW | Sub-agents |
|----------|-----|-----|------|-----------|
| Positioning/brand voice | ✅ | ✓ (follows) | ✓ (strategic) | ✓ (follows) |
| Content topics | ✅ | ✓ (alignment) | ✓ (strategic) | ✓ (follows) |
| Email sequences | ✓ (voice) | ✅ | ✓ (approval) | ✓ (execution) |
| Pricing narrative | ✅ (frame) | ✅ (applies) | ✓ (strategic) | ✓ (follows) |
| Prospect targeting | ✓ (segments) | ✅ | ✓ (approval) | ✓ (follows) |
| Deal strategy | ✓ (positioning) | ✅ | ✓ (approval) | ✓ (execution) |
| Expansion (Phase 2) | ✓ | ✓ | ✅ | — |

**Legend:** ✅ = Authority, ✓ = Input, — = N/A

---

## Token Budget & Efficiency

### Phase 1 (CMO + CRO)

**Monthly token allocation:**
- CMO research + writing: ~500K tokens (whitepapers, content strategy, voice guide)
- CRO sequences + scripts: ~200K tokens (email chains, call scripts, objection playbook)
- Sync + collaboration: ~50K tokens (gate messages, feedback loops)
- **Total Phase 1:** ~750K tokens/month

### Phase 2 (Full team)

**Estimated monthly token allocation:**
- CMO core + 4 sub-agents: ~800K tokens
- CRO core + 3 sub-agents: ~600K tokens
- Admin + CS: ~200K tokens
- Sync + collaboration: ~100K tokens
- **Total Phase 2:** ~1.7M tokens/month

**Optimization:**
- Minimize agent-to-agent messages (use task lists, not chat)
- Batch feedback into weekly gates (not real-time back-and-forth)
- Sub-agents are 80% execution, 20% decision (less deliberation)
- Use role-specific constraints to reduce iteration cycles

---

## Success Metrics

**Phase 1 Validation (2 weeks):**
- ✅ All 3 pillars completed and CMO-approved
- ✅ 5 email sequences drafted and ready for voice review
- ✅ Discovery call script written and tested
- ✅ 3+ objections documented with CMO-approved responses
- ✅ Bi-weekly sync cadence established and working

**Phase 2 Validation (1 week, post-expansion):**
- ✅ SUBAGENT_DISCOVERY Q&A completed for all 8 agents (3-5 questions each)
- ✅ Sub-agent SPAWN.md files finalized and approved
- ✅ Collaboration gates tested (at least 3 gate messages exchanged)
- ✅ Token budget validated (actual < estimated)

**Ongoing:**
- Pipeline velocity (demo requests/week from CRO sequences)
- Content engagement (CMO blog posts, social reach)
- Email open rates and reply rates (SDR outreach)
- Deal close rate and average deal size
- Customer onboarding NPS and 90-day retention

---

## Failure Modes & Recovery

| Failure | Prevention | Recovery |
|---------|-----------|----------|
| CMO delays Phase 1 → CRO blocked | Weekly sync, clear milestones | RPBW escalates; CMO gets focused hours |
| Sub-agent messaging misaligned with CMO | VOICE-UPDATE gate, weekly review | CMO issues constraint update; sub-agent redoes work |
| Token budget exceeded | Batch feedback, minimize chat | Scale back sub-agent autonomy; increase CMO review cycles |
| Positioning conflicts with sales reality | Gate messages (PRICING-FRICTION), CRO feedback | RPBW mediation; CMO updates messaging |
| Sub-agents acting independently (role drift) | Clear spawn constraints, CMO approval gates | RPBW resets agent constraints; agent redoes work |

---

## Next Steps

1. **Validate Phase 1 plan** → RPBW approval
2. **Spawn CMO and CRO agents** with updated SPAWN.md files
3. **Execute initial tasks** (CMO research, CRO script writing)
4. **Weekly gate messages** via shared task list
5. **Bi-weekly sync calls** starting [DATE]
6. **After POSITION-READY + SEQUENCE-DRAFT** → Begin SUBAGENT_DISCOVERY Q&A
7. **Post-discovery approval** → Spawn 8 sub-agents with Phase 2 SPAWN.md files

---

**Owner:** RPBW
**Last Updated:** 2026-02-13
**Version:** 1.0 (Phase 1 Planning)
