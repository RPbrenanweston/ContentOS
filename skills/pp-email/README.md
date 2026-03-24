# PP-Email Skill

Generate insight-led outbound emails for executive prospects using a structured reasoning chain and proven email frameworks.

## Quick Start

### Natural Invocation
```
"pp-email the CRO at Coralogix"
"Write outbound emails to the CTO and CPO at Immuta"
"Problem prompt email for VP of Engineering at Fortanix"
```

### Slash Command
```bash
/pp-email Immuta "VP People"
/pp-email --mouse-trap Coralogix CRO
/pp-email https://linkedin.com/in/example
```

## What This Skill Does

Transforms company research into role-specific outreach emails by:

1. **Analyzing company strategy** (p1: Strategy Objectives)
2. **Identifying role constraints** (p2: Role Execution Constraints)
3. **Mapping default behaviors** (p3: Status Quo Behaviours)
4. **Creating reframes** (p4: From → To shifts)
5. **Composing framework-adapted email** (e1: Final Email)

## Chain Structure

```
RESEARCH_PACK
    │
    ▼
   p1: What's the company trying to achieve? (2-4 objectives with evidence)
    │
    ├──▶ p2: What makes this hard for [ROLE]? (5 ranked constraints)
    │    │
    │    ▼
    │    p3: What do most teams do? (5 status quo behaviors with trade-offs)
    │    │
    │    ▼
    │    p4: What could they do instead? (3-5 "From → To" reframes)
    │    │
    │    ▼
    │    e1: Email using selected framework
    │
    └──▶ [Repeat for additional roles]
```

## Framework Selection

The skill auto-selects the best framework based on context:

| Signal | Framework | Word Count |
|--------|-----------|-----------|
| Hiring surge visible | Mouse Trap | 20-40 |
| Funding announced | Mouse Trap | 20-40 |
| Expansion/new market | Mouse Trap | 20-40 |
| No specific signal | Vanilla Ice Cream | 60-80 |
| Follow-up needed | Neutral Insight | 50-70 |
| Storytelling opportunity | BAB | 60-80 |

Or manually select: `/pp-email --mouse-trap Company Role`

## Example Output

**Input:**
```
/pp-email --mouse-trap Immuta "People + Talent"
```

**Output:**
```markdown
## Krissy Salerno White — People + Talent
**Company**: Immuta

**FRAMEWORK**: Mouse Trap
**SUBJECT**: Enterprise AE search — technical sellers

**EMAIL**:

Krissy, looks like Immuta is scaling Enterprise AEs in NYC for data governance sales (Snowflake/Databricks ecosystems).

Would it be helpful to get a clearer picture of how sourcing technical sellers with platform credibility typically plays out in competitive markets?

<details><summary>TRACE</summary>
- Framework: Mouse Trap
- Objective: #1 (scale enterprise sales team)
- Constraint: #1 (finding dual-capability talent)
- Status quo: #1 (job board posting)
- Reframe: From generic screening → ecosystem sourcing
</details>
```

## File Structure

```
skills/pp-email/
├── SKILL.md                  # Main skill definition
├── README.md                 # This file
└── references/
    ├── email-frameworks.md   # 8 proven frameworks
    └── chain-prompts.md      # Step-by-step instructions
```

## Requirements

- **RESEARCH_PACK**: Company intelligence (from company-research skill)
- **Target role**: Job title or LinkedIn URL
- **Framework selection**: Auto or manual via flag

## Key Guardrails

### ✅ Always:
- Ground factual claims in RESEARCH_PACK (p1)
- Use uncertainty framing beyond p1 ("not sure if...", "often...")
- Follow framework word counts
- Omit greetings/closings
- High context, broad strokes (recruitment expert, not technical specialist)

### ❌ Never:
- Use recruiting language ("hiring", "recruitment", "candidates")
- Invent facts not in sources
- Add "Hi [Name]" or "Best, [Name]"
- Include TRACE in sent email (internal only)
- Use buzzwords ("synergy", "value prop", "quick chat")

## All 8 Frameworks

1. **Mouse Trap** (20-40 words) - High-intent signals, impulsive reply driver
2. **Neutral Insight** (50-70 words) - Share third-party resource, build trust
3. **Vanilla Ice Cream** (60-80 words) - Balanced default, logic + clarity
4. **BAB** (60-80 words) - Before-After-Bridge storytelling
5. **Toe Dip** (30-50 words) - Light conversation starter
6. **Exec-to-Exec** (40-60 words) - Peer-level, late-stage
7. **Thoughtful Bump** (25-40 words) - Follow-up when no response
8. **The Clarification** (50-70 words) - Rephrase/clarify original

See `references/email-frameworks.md` for full details.

## Typical Workflow

1. **Research company**: Generate RESEARCH_PACK
2. **Identify target**: Role title or LinkedIn URL
3. **Invoke skill**: Natural language or `/pp-email` command
4. **Review output**: Check framework compliance, word count
5. **Send email**: Copy SUBJECT + EMAIL (exclude TRACE)

## Multi-Persona Support

Send to multiple roles at same company:
```bash
/pp-email Coralogix "CRO, CTO, CPO"
```

Runs p1 once, then forks p2→p3→p4→e1 for each role.

## Related

- `/pp-email` command - Explicit invocation with framework flags
- `company-research` skill - Generate required RESEARCH_PACK
- `email-frameworks.md` - Full framework reference
- `chain-prompts.md` - Step-by-step execution instructions

## Philosophy

**Why this approach works:**

1. **Research-grounded**: Every claim traces to sources
2. **Role-specific**: Constraints/behaviors tailored to their job
3. **Pattern language**: "Some teams..." vs. "You should..."
4. **Framework-adapted**: Right structure for right signal
5. **No pitch**: Conversation starter, not sales pitch

**Goal:** Thoughtful reply about team design / capability risk, not meeting booking.
