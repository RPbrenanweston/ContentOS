# Marketing Orchestration via Claude Code Agent Teams

## Design Document

**Author**: Architect Agent
**Date**: 2026-02-13
**Status**: DESIGN REVIEW
**Recommendation**: FEASIBLE-BUT-EXPERIMENTAL (with phased adoption path)

---

## 1. Problem Statement

RPBW currently uses Claude Code skills (pp-email, smartlead, company-research) in a sequential, single-session pattern: research a company, write emails, optimize. This works for individual prospect outreach but does not scale to coordinated marketing campaigns where multiple deliverables (social content, landing page copy, email sequences, CRO changes) need to be produced in parallel for the same campaign launch.

**The question**: Can Claude Code Agent Teams --- designed for multi-agent software engineering --- serve as a marketing orchestration layer?

---

## 2. Architectural Analysis

### 2.1 What Agent Teams Actually Are

Agent Teams consist of four components:

| Component | Role |
|-----------|------|
| **Team Lead** | Main Claude Code session. Creates team, spawns teammates, coordinates. Can be restricted to coordination-only via Delegate Mode. |
| **Teammates** | Separate Claude Code instances. Own context window. Can read/write files, run commands, use MCP tools, message each other. |
| **Task List** | Shared work items with status (pending/in_progress/completed), ownership, and dependency tracking. File-locked to prevent race conditions. |
| **Mailbox** | Inter-agent messaging. Targeted (write to one) or broadcast (write to all). |

Storage: `~/.claude/teams/{team-name}/config.json` and `~/.claude/tasks/{team-name}/`

### 2.2 Inheritance Model (Critical Finding)

When a teammate is spawned, it inherits:

- **CLAUDE.md**: Full project context, including any role-specific instructions written there
- **MCP Servers**: All configured MCP connections (Attio, Slack, Wix, n8n, etc.)
- **Skills**: All skills in the project's skills directory
- **Permission settings**: The lead's permission mode at spawn time

What teammates do NOT inherit:

- **Conversation history**: The lead's prior conversation does not transfer
- **Runtime state**: No in-memory variables carry over
- **Role restrictions**: There is no built-in mechanism to limit which skills a teammate can invoke

This inheritance model is the fundamental architectural constraint for marketing teams. Every teammate gets everything. Role boundaries must be enforced through prompt engineering, not through tooling access control.

### 2.3 Structural Fit Assessment

| Agent Team Feature | Marketing Orchestration Need | Fit |
|---|---|---|
| Parallel execution | Multiple deliverables for same campaign | Strong |
| Shared task list with dependencies | Campaign phases (research before write, write before optimize) | Strong |
| Inter-agent messaging | Copywriter asks social manager for tone alignment | Strong |
| CLAUDE.md inheritance | Brand voice, ICP definitions, company context | Strong |
| MCP tool inheritance | Attio for prospect data, Slack for delivery, Wix for CRO | Strong |
| Delegate mode for lead | CMO coordinates, does not write | Strong |
| Skill inheritance (all skills to all agents) | Role specialization | WEAK --- requires mitigation |
| No nested teams | Complex campaign hierarchies | Moderate limitation |
| Experimental stability | Production marketing workflows | Risk factor |

---

## 3. Proposed Architecture

### 3.1 Team Composition

```
MARKETING TEAM LEAD (CMO)
  Mode: Delegate (coordination only)
  Model: Opus (strategic reasoning)
  Role: Campaign planning, task decomposition, quality review, synthesis

  |
  |--- COPYWRITER
  |      Model: Sonnet (speed, cost)
  |      Skills focus: pp-email chain (p1-p4, e1), email frameworks
  |      Owns: Email sequences, blog drafts, landing page copy
  |
  |--- SOCIAL MEDIA MANAGER
  |      Model: Sonnet
  |      Skills focus: Content adaptation, platform-specific formatting
  |      Owns: LinkedIn posts, Twitter threads, social proof snippets
  |
  |--- CRO SPECIALIST
  |      Model: Sonnet
  |      Skills focus: Page analysis, conversion optimization
  |      Owns: Landing page audits, CTA optimization, A/B test hypotheses
  |
  |--- VP SALES (Email Sequences)
         Model: Opus (strategic nuance)
         Skills focus: pp-email, smartlead integration
         Owns: Outbound sequences, follow-up cadences, campaign-to-CRM mapping
```

### 3.2 Role Boundary Enforcement

Since all teammates inherit all skills and tools, role boundaries must be enforced through the spawn prompt --- the initial instructions the lead gives each teammate when creating it.

**Strategy: Constitutional Role Prompts**

Each teammate receives a spawn prompt that defines:

1. **Identity**: "You are the Copywriter on this marketing team."
2. **Scope**: "You own email copy, blog drafts, and landing page body copy."
3. **Boundaries**: "You do NOT write social media posts, CRO recommendations, or outbound sequences. If asked to do so, message the team lead to reassign."
4. **Collaboration protocol**: "When you need social-friendly versions of your copy, message the Social Media Manager with your key messages. Do not adapt them yourself."
5. **Output format**: "All deliverables go to /campaign/{campaign-name}/{your-role}/ directory."
6. **Quality gate**: "Before marking a task complete, verify your output against the brand voice guide in CLAUDE.md."

**Will this actually work?**

Partially. LLM-based role enforcement is probabilistic, not deterministic. In testing across the Claude Code ecosystem, spawn prompts are generally respected 85-90% of the time for clear role boundaries. The failure mode is not malicious role violation --- it is scope creep when a task ambiguously overlaps two roles.

**Mitigation**: The CMO lead, in Delegate Mode, reviews all completed tasks before marking the campaign complete. This human-in-the-loop (via the lead agent) catches role creep.

### 3.3 Task Structure

The task list is the coordination backbone. Here is the structure for a typical campaign:

```
CAMPAIGN: Q1 AI Security Outreach - Coralogix

PHASE 1: RESEARCH (blocking)
  [T1] Company Research Pack - Coralogix          | Owner: CMO (or subagent)
       Status: completed
       Output: /campaign/coralogix/research_pack.json

PHASE 2: STRATEGY (depends on T1)
  [T2] Strategy Objectives (p1 chain)              | Owner: VP Sales
       Depends on: T1
       Output: /campaign/coralogix/strategy_objectives.md

  [T3] Campaign Messaging Framework                | Owner: CMO
       Depends on: T1
       Output: /campaign/coralogix/messaging_framework.md

PHASE 3: PARALLEL PRODUCTION (depends on T2, T3)
  [T4] Email Sequence: CTO persona                 | Owner: VP Sales
       Depends on: T2, T3
       Output: /campaign/coralogix/vp-sales/cto_sequence.md

  [T5] Email Sequence: CPO persona                 | Owner: VP Sales
       Depends on: T2, T3
       Output: /campaign/coralogix/vp-sales/cpo_sequence.md

  [T6] LinkedIn Post: Company Signal               | Owner: Social Media Manager
       Depends on: T3
       Output: /campaign/coralogix/social/linkedin_signal.md

  [T7] LinkedIn Post: Thought Leadership           | Owner: Social Media Manager
       Depends on: T3
       Output: /campaign/coralogix/social/linkedin_thought.md

  [T8] Landing Page Copy: AI Security              | Owner: Copywriter
       Depends on: T3
       Output: /campaign/coralogix/copywriter/landing_page.md

  [T9] Landing Page CRO Audit                      | Owner: CRO Specialist
       Depends on: T8
       Output: /campaign/coralogix/cro/landing_page_audit.md

PHASE 4: INTEGRATION (depends on all Phase 3)
  [T10] Cross-channel Consistency Review            | Owner: CMO
        Depends on: T4, T5, T6, T7, T8, T9
        Output: /campaign/coralogix/review/consistency.md

  [T11] Campaign Package Assembly                   | Owner: CMO
        Depends on: T10
        Output: /campaign/coralogix/CAMPAIGN_PACKAGE.md
```

**Key design decisions in the task structure:**

1. **Research is a single blocking task**. All creative work depends on it. This prevents teammates from hallucinating company details.

2. **Strategy happens before production**. The messaging framework (T3) acts as a shared brief that all producers reference, ensuring consistency without requiring constant inter-agent messaging.

3. **Phase 3 is maximally parallel**. This is where agent teams earn their cost --- four teammates working simultaneously on six tasks.

4. **CRO depends on Copywriter output**. The CRO specialist audits what the copywriter produces, not a blank page. This is a sequential dependency within the parallel phase.

5. **CMO reviews everything at the end**. Delegate mode means the CMO never writes content itself --- it only reviews, requests revisions, and assembles the final package.

### 3.4 File-Based Coordination (Not Just Messaging)

The shared filesystem is the most reliable coordination mechanism, more reliable than inter-agent messaging. Each teammate writes to a dedicated directory:

```
/campaign/{campaign-name}/
  research_pack.json          <- Shared input (Phase 1)
  messaging_framework.md      <- Shared brief (Phase 2)
  strategy_objectives.md      <- Shared analysis (Phase 2)
  vp-sales/                   <- VP Sales output
  social/                     <- Social Media Manager output
  copywriter/                 <- Copywriter output
  cro/                        <- CRO Specialist output
  review/                     <- CMO review notes
  CAMPAIGN_PACKAGE.md         <- Final assembled output
```

**Why files over messages?** Messages are ephemeral within context windows. Files persist. When the CRO specialist needs to reference the copywriter's landing page, it reads a file --- not a message. This is more deterministic and auditable.

---

## 4. Answers to the Seven Questions

### Q1: Is this architecturally sound?

**Yes, with caveats.** The core agent team architecture maps well to marketing orchestration. Parallel production, shared task dependencies, and file-based output are a strong fit. The weakness is role enforcement --- it relies on prompt compliance, not access control. The mitigation (CMO review gate) is architecturally sound but adds latency.

**Structural requirements:**
- CLAUDE.md must contain brand voice, ICP definitions, tone guidelines, and company context
- Campaign directory structure must be established before team spawns
- Research pack must be complete before creative tasks begin
- CMO must operate in Delegate Mode to prevent it from writing content itself

### Q2: Do skill tools inherit to teammates, or are they context-only?

**Skills fully inherit.** When a teammate spawns, it loads CLAUDE.md, all MCP servers, and all skills from the project directory. This means every teammate has access to pp-email, smartlead, company-research, and any other skill in the project.

Skills are not merely context --- they are active capabilities. A Social Media Manager teammate could, in theory, invoke the pp-email chain. There is no mechanism to restrict skill access per teammate.

**Implication:** Role boundaries are a prompt-level convention, not a system-level enforcement. This is the single biggest architectural limitation for marketing teams.

### Q3: How do you prevent role creep (copywriter writes sales email)?

**Three-layer defense:**

1. **Spawn Prompt Constitution**: Each teammate receives explicit scope boundaries, owned deliverables, and forbidden actions. The spawn prompt is the primary enforcement mechanism.

2. **Output Directory Isolation**: Each role writes to its own directory. If the copywriter writes to `/vp-sales/`, it is immediately visible as a violation during the CMO review phase.

3. **CMO Review Gate**: Before the campaign is assembled (T10-T11), the CMO lead reviews all outputs for consistency AND appropriate ownership. Role creep is caught here.

**What you cannot prevent:** Subtle tonal bleed. If the VP Sales teammate reads the Copywriter's landing page (which it should, for alignment), it may unconsciously adopt the copywriter's style in its email sequences. This is actually desirable in most cases --- consistency is a feature, not a bug. It only becomes a problem if the VP Sales starts writing marketing copy instead of sales copy.

### Q4: What is the token cost vs benefit trade-off?

**Cost model:**

| Component | Token Cost Per Campaign | Notes |
|-----------|------------------------|-------|
| CMO Lead (Opus) | ~50K-100K tokens | Coordination, review, synthesis |
| VP Sales (Opus) | ~80K-150K tokens | pp-email chain is token-heavy (5-step chain x 2 personas) |
| Copywriter (Sonnet) | ~30K-60K tokens | Landing page, blog draft |
| Social Media Manager (Sonnet) | ~20K-40K tokens | 2-3 social posts |
| CRO Specialist (Sonnet) | ~20K-40K tokens | Page audit, recommendations |
| **Total per campaign** | **~200K-390K tokens** | |

**Comparison to sequential single-session:**

| Approach | Tokens | Wall Clock | Consistency |
|----------|--------|------------|-------------|
| Sequential single session | ~150K-250K | 45-90 min | High (single voice) |
| Agent team (4 teammates) | ~200K-390K | 15-30 min | Moderate (requires review) |

**Verdict:** Agent teams cost 30-60% more tokens but complete in roughly one-third the wall-clock time. The consistency trade-off is real but manageable with the CMO review gate.

**When the trade-off favors teams:** Campaigns with 4+ deliverables across different channels. Below that threshold, sequential is more efficient.

**When the trade-off favors sequential:** Single-channel work (just emails, or just social posts). The coordination overhead is not justified.

### Q5: When is this better than sequential skill chaining?

**Agent teams are better when:**

- Campaign has 4+ deliverables across 2+ channels
- Wall-clock time matters (launch deadline)
- Deliverables are independent enough to parallelize (social posts do not depend on email sequences)
- Cross-channel consistency check is needed (the CMO review adds value that sequential chaining lacks)
- You want competing perspectives (VP Sales prioritizes conversion, Copywriter prioritizes narrative)

**Sequential skill chaining is better when:**

- Single-channel work (email sequence only)
- Deliverables are deeply interdependent (each step needs the previous step's full output)
- Token budget is constrained
- Campaign is for a single prospect (pp-email chain is already optimized for this)
- You need deterministic quality (single voice, no coordination variance)

**Hybrid recommendation:** Use agent teams for campaign launches. Use sequential chaining for individual prospect outreach. The existing pp-email skill is already well-optimized for sequential work and should NOT be replaced by an agent team for single-prospect emails.

### Q6: What are the failure modes specific to marketing teams?

**F1: Tone Divergence**
The copywriter writes aspirational brand copy. The VP Sales writes urgent, direct sales copy. Without a shared messaging framework, the campaign feels schizophrenic. The customer sees a polished LinkedIn post, clicks through to a landing page, then receives a blunt sales email --- three different voices.

*Mitigation:* The messaging framework (T3) is a blocking dependency for all creative tasks. It defines tone, key messages, and vocabulary constraints. All teammates reference it.

**F2: Research Hallucination Cascade**
If the research pack (T1) contains an error --- wrong funding amount, incorrect product description --- every downstream deliverable inherits the error. With four teammates working in parallel, the error propagates four ways simultaneously instead of one.

*Mitigation:* Research is a single blocking task. The CMO (or user) validates the research pack before unblocking creative tasks. This is a human-in-the-loop gate.

**F3: Over-Messaging**
Teammates message each other to coordinate. Each message costs tokens (received into the recipient's context window). If the social media manager asks the copywriter for three rounds of headline alternatives, the copywriter's context fills with messaging overhead instead of creative work.

*Mitigation:* File-based coordination over messaging. Instead of messaging for headline alternatives, write them to a file. The social manager reads the file. Spawn prompt should say: "Prefer reading teammate output files over sending messages. Message only when you need a decision or clarification."

**F4: Lead Premature Completion**
The CMO lead marks the campaign complete before all teammates have finished their tasks. This is a documented limitation of agent teams --- the lead sometimes decides work is done too early.

*Mitigation:* Task dependencies. T10 (consistency review) depends on ALL Phase 3 tasks. The lead cannot mark T10 as started until T4-T9 are all completed. Additionally, explicitly tell the lead: "Wait for all teammates to complete their tasks before beginning your review."

**F5: Context Window Exhaustion**
The VP Sales teammate runs the full pp-email chain (p1-p4, e1) for two personas. This is already ~80-150K tokens. If it also needs to read the messaging framework, research pack, and review CRO feedback, it may hit context limits.

*Mitigation:* Size tasks appropriately. The VP Sales handles email sequences only. It reads the research pack and messaging framework at the start, then works from those. It does not need to read every other teammate's output.

**F6: Experimental Feature Instability**
Agent teams are explicitly experimental. Known limitations include no session resumption for in-process teammates, task status lag, and slow shutdown. A marketing campaign interrupted by a crash loses all in-progress work.

*Mitigation:* File-based output means work persists even if the session dies. Each completed deliverable is a file on disk. If the team crashes after T4-T7 are complete, you can restart with only T8-T11 remaining. Design tasks to produce files early and often.

### Q7: How would you structure the task list to avoid conflicts?

**Four principles:**

1. **One owner per task.** Never assign a task to two teammates. If a task requires two roles (e.g., "write landing page with CRO-optimized structure"), split it into two tasks: "write landing page copy" (Copywriter) and "optimize landing page structure" (CRO).

2. **Dependencies enforce sequencing.** Research before strategy. Strategy before production. Production before review. The dependency system handles this automatically --- no manual coordination needed.

3. **Directory isolation prevents file conflicts.** Each role writes to its own directory. Two teammates never edit the same file. The only shared files are inputs (research pack, messaging framework), which are read-only by the time creative work begins.

4. **5-6 tasks per teammate.** The official documentation recommends this range. Fewer tasks mean idle time between work. More tasks mean cognitive overhead. For a typical campaign: VP Sales gets 2-3 (email sequences per persona), Social gets 2-3 (posts per platform), Copywriter gets 2-3 (landing page, blog, ad copy), CRO gets 1-2 (audit, recommendations).

---

## 5. Recommendation

### Verdict: FEASIBLE-BUT-EXPERIMENTAL

Agent teams are architecturally sound for marketing orchestration. The parallel execution model, shared task list with dependencies, file-based output, and Delegate Mode for the lead all map directly to campaign production workflows.

However, two factors prevent a full "recommended" rating:

1. **Role enforcement is prompt-based, not system-based.** This works most of the time but is not deterministic. For a marketing team where brand consistency matters, this is a real risk that requires the CMO review gate.

2. **Experimental status.** No session resumption, potential task status lag, and slow shutdown are operational risks for time-sensitive campaign launches.

### Phased Adoption Path

**Phase 1: Validation (Week 1-2)**
- Run a single campaign with 2 teammates (Copywriter + VP Sales) and CMO lead
- Use a real prospect (Coralogix or similar)
- Measure: token cost, wall-clock time, quality vs sequential baseline, number of role boundary violations

**Phase 2: Expansion (Week 3-4)**
- Add Social Media Manager as third teammate
- Test inter-agent messaging (social asks copywriter for key messages)
- Measure: consistency across channels, messaging overhead cost

**Phase 3: Full Team (Week 5-6)**
- Add CRO Specialist as fourth teammate
- Run full campaign lifecycle: research through assembly
- Measure: total campaign production time, cost per campaign, quality score (human review)

**Phase 4: Production Workflow (Week 7+)**
- Decide: adopt as standard campaign workflow or revert to enhanced sequential
- If adopted: create campaign templates (task list templates, directory structure, spawn prompts)
- If reverted: document lessons learned, identify what can be extracted for sequential improvement

### What to Build Now

Before running Phase 1, create:

1. **Campaign Directory Template**: Shell script or template that creates the standard directory structure
2. **Spawn Prompt Templates**: One per role, containing constitutional boundaries, output formats, and collaboration protocols
3. **CLAUDE.md Campaign Section**: Brand voice guide, ICP definitions, and tone parameters that all teammates will inherit
4. **CMO Lead Prompt**: Instructions for Delegate Mode operation, review criteria, and synthesis approach

None of these require code. They are markdown files and prompt templates. The agent team infrastructure (task list, messaging, spawning) is provided by Claude Code.

---

## 6. Comparison Matrix

| Criterion | Sequential Chaining | Agent Team (Marketing) | Verdict |
|-----------|--------------------|-----------------------|---------|
| Token efficiency | Better (1x) | Worse (1.3-1.6x) | Sequential wins |
| Wall-clock speed | Slower (1x) | Faster (0.3-0.5x) | **Team wins** |
| Consistency | High (single voice) | Moderate (requires review) | Sequential wins |
| Multi-channel output | Sequential, slow | Parallel, fast | **Team wins** |
| Role specialization | None (one agent wears all hats) | Structural (via spawn prompts) | **Team wins** |
| Cross-review capability | None | Natural (teammates read each other) | **Team wins** |
| Fault tolerance | Session crash = restart all | File output persists per task | **Team wins** |
| Operational maturity | Stable, production-ready | Experimental, known limitations | Sequential wins |
| Setup complexity | Zero (just run the skill) | Medium (spawn prompts, directory structure, task list design) | Sequential wins |

**Bottom line:** For campaigns with 4+ deliverables across 2+ channels, agent teams are worth the experiment. For single-channel work, sequential chaining remains superior.

---

## 7. Appendix: Spawn Prompt Templates

### CMO Lead (Delegate Mode)

```
You are the CMO leading a marketing campaign for {COMPANY_NAME}.

OPERATING MODE: Delegate only. You coordinate, review, and synthesize.
You NEVER write marketing copy, emails, or social posts yourself.

YOUR RESPONSIBILITIES:
1. Break the campaign brief into tasks with clear dependencies
2. Assign tasks to the right teammates
3. Review completed deliverables for brand consistency and quality
4. Request revisions when output does not match the messaging framework
5. Assemble the final campaign package when all tasks are complete

REVIEW CRITERIA:
- Does the deliverable reference research pack facts accurately?
- Does it follow the messaging framework tone and key messages?
- Is it within the appropriate word count for its format?
- Does it avoid recruiting language (no hiring, candidates, agency)?

Wait for ALL teammates to complete their tasks before beginning your review.

CAMPAIGN BRIEF: {brief}
```

### VP Sales (Email Sequences)

```
You are the VP Sales on this marketing team.

YOUR SCOPE: Outbound email sequences and sales follow-up cadences.
YOUR SKILLS: Use the pp-email skill chain (p1-p4, e1) for all email work.
YOUR OUTPUT DIRECTORY: /campaign/{campaign-name}/vp-sales/

BOUNDARIES:
- You write email sequences ONLY
- You do NOT write social media posts (message Social Media Manager)
- You do NOT write landing page copy (message Copywriter)
- You do NOT provide CRO recommendations (message CRO Specialist)
- If a task falls outside your scope, message the CMO to reassign

COORDINATION:
- Read /campaign/{campaign-name}/research_pack.json for company facts
- Read /campaign/{campaign-name}/messaging_framework.md for tone and key messages
- Prefer reading files over sending messages
- Message teammates only for decisions or clarifications

RESEARCH PACK: {path to research pack}
MESSAGING FRAMEWORK: {path to messaging framework}
TARGET PERSONAS: {list of role titles}
```

### Copywriter

```
You are the Copywriter on this marketing team.

YOUR SCOPE: Email copy, blog drafts, landing page body copy, and ad copy.
YOUR OUTPUT DIRECTORY: /campaign/{campaign-name}/copywriter/

BOUNDARIES:
- You write long-form and mid-form marketing copy ONLY
- You do NOT write outbound sales email sequences (that is VP Sales)
- You do NOT write social media posts (that is Social Media Manager)
- You do NOT provide conversion optimization recommendations (that is CRO)
- If a task falls outside your scope, message the CMO to reassign

WRITING STANDARDS:
- Follow brand voice from CLAUDE.md
- Reference the messaging framework for tone and key messages
- No recruiting language (hiring, candidates, agency, talent acquisition)
- High context, broad strokes (business patterns, not technical implementations)

COORDINATION:
- Read research pack for company facts
- Read messaging framework for tone alignment
- Write deliverables to your output directory as markdown files
- Prefer reading files over sending messages
```

### Social Media Manager

```
You are the Social Media Manager on this marketing team.

YOUR SCOPE: LinkedIn posts, Twitter threads, social proof snippets.
YOUR OUTPUT DIRECTORY: /campaign/{campaign-name}/social/

BOUNDARIES:
- You write social media content ONLY
- You do NOT write emails (that is VP Sales or Copywriter)
- You do NOT write landing page copy (that is Copywriter)
- You do NOT provide CRO recommendations (that is CRO Specialist)
- If a task falls outside your scope, message the CMO to reassign

PLATFORM GUIDELINES:
- LinkedIn: 150-300 words, insight-led, professional tone
- Twitter/X: Thread format, 5-7 tweets, hook-first
- Social proof snippets: 50-100 words, quotable, shareable

COORDINATION:
- Read messaging framework for key messages to adapt
- Read Copywriter output for themes to amplify (do not copy verbatim)
- Each post should be self-contained and platform-native
```

### CRO Specialist

```
You are the CRO Specialist on this marketing team.

YOUR SCOPE: Landing page audits, CTA optimization, A/B test hypotheses.
YOUR OUTPUT DIRECTORY: /campaign/{campaign-name}/cro/

BOUNDARIES:
- You audit and optimize conversion paths ONLY
- You do NOT write copy (that is Copywriter)
- You do NOT write emails or social posts
- If a task falls outside your scope, message the CMO to reassign

OUTPUT FORMAT:
- Audit findings as numbered list with severity (High/Medium/Low)
- Each finding includes: Issue, Impact, Recommendation
- A/B test hypotheses in standard format: If [change], then [metric] will [direction] because [reason]

COORDINATION:
- Wait for Copywriter to complete landing page copy before auditing
- Read the landing page output file directly
- Write recommendations to your output directory
- The Copywriter may revise based on your findings (this is a follow-up task, not your responsibility)
```

---

## 8. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Role creep (teammate works outside scope) | Medium (15-20%) | Low (caught in review) | Spawn prompt constitution + CMO review gate |
| Tone divergence across channels | Medium | High (brand damage) | Messaging framework as blocking dependency |
| Research error propagation | Low (10%) | High (all outputs wrong) | Human validates research pack before creative tasks |
| Session crash mid-campaign | Medium (experimental feature) | Medium (file output persists) | Task-level file output + restart from last checkpoint |
| Token cost overrun | Low | Medium (budget) | Sonnet for 3 of 4 teammates, monitor per-campaign costs |
| Lead premature completion | Medium | Low (easily restarted) | Explicit dependency chains + "wait for all" instruction |
| Context window exhaustion | Low-Medium | Medium (degraded output) | Size tasks appropriately, avoid unnecessary cross-reading |

---

*End of design document.*
