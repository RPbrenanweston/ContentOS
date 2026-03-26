# Chain Prompt Instructions

Exact analytical instructions for each step. Follow output formats precisely.

---

## p1: Strategy Objectives

**Input**: RESEARCH_PACK only.
**Rule**: Use only the provided RESEARCH_PACK. Do not invent.

**Task**: Identify the stated strategic objectives for {COMPANY_NAME} this year, and how they are measuring success.

- Use official communications first.
- 2–4 objectives max.
- For each: objective, success measures, evidence (source IDs + ≤25-word quote from source_index where available).
- If measurement not stated, write "Not stated" and cite what was checked.

**Output format**:

```
STRATEGY_OBJECTIVES:
1) Objective:
   Success measures:
   Evidence (source ids + quote):
2) Objective:
   Success measures:
   Evidence (source ids + quote):
```

2–4 total.

---

## p2: Role Execution Constraints

**Input**: STRATEGY_OBJECTIVES + RESEARCH_PACK.
**Rule**: Use only these inputs. Do not invent. No solutions. Never use: hiring, recruitment, agency, candidates.

**Task**: Analyse execution risk from the perspective of a {ROLE_TITLE} at {COMPANY_NAME}. What would make it difficult for THIS role to achieve the company's objectives right now? Focus on people, capability, leadership bandwidth, and team structure constraints this role owns or feels.

- 5 bullets, ranked most difficult → least.
- Written in the language the {ROLE_TITLE} would recognise.
- Link each to an objective number from p1.

**Output format**:

```
ROLE_EXECUTION_CONSTRAINTS (ranked):
1) ...
   Links to objective: #
2) ...
   Links to objective: #
3) ...
   Links to objective: #
4) ...
   Links to objective: #
5) ...
   Links to objective: #
```

---

## p3: Status Quo Behaviours

**Input**: ROLE_EXECUTION_CONSTRAINTS + STRATEGY_OBJECTIVES.
**Rule**: Use only these inputs. Do not invent. Descriptive, not prescriptive. No recruiting language.

**Task**: Describe the people-, team-, and capability-driven behaviours companies like {COMPANY_NAME} typically default to under pressure — what they do, not what they claim — when execution risk shows up.

- 5 approaches, most common → least.
- For each: Behaviour, believed benefit, trade-off.

**Output format**:

```
STATUS_QUO_BEHAVIOURS (most common → least):
1) Behaviour:
   Believed benefit:
   Trade-off:
2) Behaviour:
   Believed benefit:
   Trade-off:
3) Behaviour:
   Believed benefit:
   Trade-off:
4) Behaviour:
   Believed benefit:
   Trade-off:
5) Behaviour:
   Believed benefit:
   Trade-off:
```

---

## p4: Reframes

**Input**: STATUS_QUO_BEHAVIOURS + ROLE_EXECUTION_CONSTRAINTS.
**Rule**: Use only these inputs. Do not invent. No tools/vendors/process language.

**Task**: Reframe how leaders at {COMPANY_NAME} could think differently about solving execution constraints via how they engage with external talent/market signal — insight, role shaping, de-risking decisions.

- 3–5 bullets.
- Each phrased "From X → to Y".
- Each must anchor in market/talent signal and show what changes in decision confidence.

**Output format**:

```
REFRAMES (From → To):
- From ... → to ...
- From ... → to ...
- From ... → to ...
```

3–5 total.

---

## e1: Final Email

**Input**: STRATEGY_OBJECTIVES (p1) + ROLE_EXECUTION_CONSTRAINTS (p2) + STATUS_QUO_BEHAVIOURS (p3) + REFRAMES (p4) + SELECTED_FRAMEWORK.

**Rule**: Do not invent facts.

### Factual claim boundary

The ONLY factual claim permitted about {COMPANY_NAME} is from STRATEGY_OBJECTIVES (p1) and its cited sources. Everything else uses uncertainty, tension, or general pattern language ("not sure if…", "often…", "some teams…").

### Purpose

Short, insight-led outbound email to a {ROLE_TITLE} at {COMPANY_NAME}. Not pitching services. Goal: a thoughtful reply about team design / capability risk tied to their objectives.

### Framework Application

Apply the selected framework structure. See `references/email-frameworks.md` for details.

**Framework-specific word counts**:
- Mouse Trap: 20-40 words
- Neutral Insight: 50-70 words
- Vanilla Ice Cream: 60-80 words
- BAB: 60-80 words
- Toe Dip: 30-50 words
- Exec-to-Exec: 40-60 words
- Thoughtful Bump: 25-40 words
- The Clarification: 50-70 words

### Writing rules (all frameworks)

- About them, not me.
- One idea only.
- No mention of recruiting firms, candidates, or processes.
- Neutral, peer-level tone.
- No buzzwords/hype, no calendar links.
- Never use "quick chat", "value prop", "circle back".
- Assume 7–9 seconds of attention.
- **High context, broad strokes**: Reference business patterns and tensions, not technical implementations. Speak as a recruitment expert observing market dynamics, not as a domain specialist.
- **No greetings/closings**: Follow framework examples - no "Hi [Name]" or "Best, [Name]"

### Subject line

3–5 words, internal-looking, tied to an objective number (p1). Framework-agnostic.

### Email body

Structure varies by framework. Always include:
- Reference to objective (p1) in plain language
- Uncertainty framing for constraints (p2)
- Pattern language for status quo (p3)
- Reframe territory (p4)
- Low-friction CTC (no scheduling)

### TRACE (internal QA only — never in outbound)

```
TRACE:
- Framework used: {FRAMEWORK_NAME}
- Objective referenced: # (p1)
- Constraint referenced: # (p2)
- Status quo behaviour referenced: # (p3)
- Reframe referenced: exact From → To line (p4)
- Source IDs supporting objective: [S#, S#]
```

### Output

```
FRAMEWORK: {FRAMEWORK_NAME}
SUBJECT:
EMAIL:
TRACE:
```
