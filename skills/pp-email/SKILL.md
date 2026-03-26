---
name: pp-email
description: Problem-Prompt Email — generate insight-led outbound emails for executive prospects using a structured reasoning chain and proven email frameworks. Use when asked to "pp-email", "problem prompt email", "write outbound email", "outbound to [company]", "email the C-suite", "write BD emails", or when given a LinkedIn URL, prospect name + title, or company + role titles with intent to create personalised business development outreach. Accepts LinkedIn profile URLs as input to auto-extract prospect details. Supports multi-persona outreach (e.g., CTO + CPO + CRO at the same org) by forking the chain per role. Supports framework selection via flag (e.g., --mouse-trap, --neutral-insight) or auto-selection based on context. Requires a RESEARCH_PACK (from the company-research skill) or will prompt for one.
version: 1.0.0
---

# PP-Email (Problem Prompt Email)

Generate short, insight-led outbound emails to executives by running a structured reasoning chain that turns company intelligence into role-specific outreach using proven email frameworks.

## Framework Selection

Before running the chain, select an email framework. See `references/email-frameworks.md` for full details.

### Framework Quick Reference

| Framework | Best For | Structure |
|-----------|----------|-----------|
| **Mouse Trap** | High-intent signals, first touch | Observation → Binary question |
| **Neutral Insight** | Follow-ups, nurture, re-engagement | Third-party resource → Why relevant → Soft ask |
| **Vanilla Ice Cream** | Default first touch, balanced approach | Observation → Problem → Credibility → Solution → CTC |
| **BAB (Before-After-Bridge)** | Storytelling, transformation focus | Current state → Future state → Your bridge |
| **Toe Dip** | Conversation starter, light touch | Observation → Interest-based CTC |
| **Exec-to-Exec** | Late-stage, been ghosted | Why reaching out → Team aligned → Support offer |

### Selection Logic

**IMPORTANT:** Only use Mouse Trap when there is a CLEAR, EXPLICIT high-intent signal. Otherwise default to Vanilla Ice Cream.

1. **If user specifies framework** (e.g., `--mouse-trap`): Use that framework exactly
2. **If EXPLICIT high-intent signal**:
   - Job posting mentioned in user request → Mouse Trap
   - Funding announcement explicitly referenced → Mouse Trap
   - Major expansion/acquisition explicitly mentioned → Mouse Trap
3. **If follow-up or re-engagement context**: Neutral Insight
4. **If transformation story is obvious**: BAB
5. **Default (most common)**: Vanilla Ice Cream

**Framework selection should be automatic and silent** - do not ask user which framework to use. Analyze the context and select the most appropriate framework based on the signals present.

## Input Paths

### Path A: LinkedIn URL(s)

User pastes one or more LinkedIn profile URLs. For each URL:
1. Use `WebFetch` to retrieve profile page
2. Extract: **full name**, **current job title**, **company name**, **headline**
3. If restricted, ask user to fill gaps manually
4. Check for existing RESEARCH_PACK or prompt for company research

Multiple URLs at same company → single RESEARCH_PACK, forked chain per person.

### Path B: Manual entry

User provides:
- **Prospect name** (optional)
- **Role title** (required)
- **Company name** (required)

### RESEARCH_PACK requirement

Both paths need a RESEARCH_PACK. If one exists, use it. If not, ask: "I need the research pack for {COMPANY_NAME} first. Want me to run company research?"

## Chain Overview

4 analytical steps (p1→p4) then framework-adapted email composition (e1).

```
RESEARCH_PACK
    │
    ▼
   p1: STRATEGY_OBJECTIVES (once per company)
    │
    ├──▶ p2→p3→p4→e1 for Role/Person 1
    ├──▶ p2→p3→p4→e1 for Role/Person 2
    └──▶ p2→p3→p4→e1 for Role/Person 3
```

## Execution

Run each step sequentially. Each step's output feeds the next. Read `references/chain-prompts.md` for exact instructions per step.

### p1: Strategy Objectives
- **Input**: RESEARCH_PACK
- **Output**: STRATEGY_OBJECTIVES (2–4 objectives with evidence)
- **Runs**: Once per company

### p2: Role Execution Constraints
- **Input**: STRATEGY_OBJECTIVES + RESEARCH_PACK
- **Output**: ROLE_EXECUTION_CONSTRAINTS (5 ranked constraints)
- **Runs**: Per role title

### p3: Status Quo Behaviours
- **Input**: ROLE_EXECUTION_CONSTRAINTS + STRATEGY_OBJECTIVES
- **Output**: STATUS_QUO_BEHAVIOURS (5 default behaviours with trade-offs)
- **Runs**: Per role title

### p4: Reframes
- **Input**: STATUS_QUO_BEHAVIOURS + ROLE_EXECUTION_CONSTRAINTS
- **Output**: REFRAMES (3–5 "From → To" shifts)
- **Runs**: Per role title

### e1: Final Email
- **Input**: All four preceding outputs + selected framework
- **Output**: SUBJECT + EMAIL (framework-appropriate length) + TRACE
- **Runs**: Per role title
- **Framework**: Applies selected email framework structure

## Output

Save to current working directory as `{COMPANY_NAME}_pp_emails.md`:

```markdown
# PP-Emails — {COMPANY_NAME}
**Generated**: {date}
**Research pack**: {COMPANY_NAME}_research_pack.json
**Framework used**: {FRAMEWORK_NAME}

---

## {PROSPECT_NAME or ROLE_TITLE}
**Role**: {ROLE_TITLE} | **Company**: {COMPANY_NAME}

**FRAMEWORK**: {FRAMEWORK_NAME}

**SUBJECT**: ...

**EMAIL**:
...

<details><summary>TRACE (internal only — do not send)</summary>

- Framework: {FRAMEWORK_NAME}
- Objective referenced: # (p1)
- Constraint referenced: # (p2)
- Status quo behaviour referenced: # (p3)
- Reframe referenced: (exact From → To line) (p4)
- Source IDs supporting objective: [S#, S#]

</details>

---
```

## Guardrails

- **No invention**: Every factual claim traces to STRATEGY_OBJECTIVES (p1), which traces to RESEARCH_PACK sources.
- **No recruiting language**: Never use "hiring", "recruitment", "agency", "candidates", "talent acquisition" in any step or email.
- **Uncertainty framing**: Beyond p1, everything uses tension/pattern/uncertainty language.
- **Word count**: Varies by framework (Mouse Trap: 20-40 words, Vanilla Ice Cream: 60-80 words, etc.)
- **TRACE is internal**: Never include in outbound email.
- **LinkedIn privacy**: Extract only professional details.
- **High context, not deep detail**: Write as a recruitment expert speaking to business challenges, not as a technical specialist. Reference patterns and tensions broadly rather than specific technical implementations.
- **No greetings/closings**: Follow framework examples - no "Hi [Name]" or "Best, [Name]" unless framework specifies.

## Example Usage

```
User: "pp-email the CRO at Coralogix"
Assistant: [Runs p1→p2→p3→p4→e1 chain, selects appropriate framework, outputs email]

User: "pp-email --mouse-trap https://linkedin.com/in/example"
Assistant: [Fetches LinkedIn profile, extracts details, runs chain with Mouse Trap framework]

User: "write outbound emails to the CTO and CPO at Immuta"
Assistant: [Runs p1 once, then p2→p3→p4→e1 twice (once per role)]
```
