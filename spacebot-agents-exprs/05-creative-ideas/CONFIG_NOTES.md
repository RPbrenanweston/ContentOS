# Configuration Notes — Exprs Creative Ideas Agent

## Model Routing

- **Primary model:** GPT-5 Nano
- **Rationale:** Eric Nowoslawski's framework specifically recommends Nano for this use case — best blend of cost to quality for constrained creative generation. The heavy lifting is done by the examples and constraints, not the model's reasoning ability.
- **Cached inputs:** The system prompt (SOUL + IDENTITY with all 10 examples) stays constant across all prospects. Only the company description changes in the main prompt. This triggers OpenAI's cached input discount — roughly 50% cost reduction on the static portion.
- **Fallback:** If output quality degrades on highly technical or niche companies (e.g., quantum computing, defense), consider GPT-4o-mini for those specific runs.

## Tuning

- **Temperature:** 0.3
  - Higher than the Scorer (0.1) because ideas need natural variation
  - Lower than a freeform writer (0.7) because each idea is pillar-constrained
  - The examples do more to control tone than temperature does
- **Max tokens:** 600 (Format A — three bullets), 200 (Format B — one-liner), 400 (Format C — raw ideas)
- **Top-p:** 0.9
- **Frequency penalty:** 0.4 — Prevent repetitive phrasing across the three ideas and across batches. Each idea should feel independently written.

## Prompt Architecture

### System Prompt (Cached — Stays Constant)
Contains:
1. Role definition (recruitment economics analyst)
2. Exprs context (what it is, pricing, three pillars)
3. The three constrained idea slots with thinking instructions
4. All 10 hand-written examples
5. Quality checklist
6. Output format instructions
7. Voice rules and banned language

**Estimated system prompt tokens:** ~4,000-5,000
**Cached input discount applies:** Yes — same system prompt for every prospect

### Main Prompt (Variable — Changes Per Prospect)
Contains only:
```
Company: {{company_name}}
Description: {{company_description}}
Market: {{UK or US}}
Format: {{A, B, or C}}
```

**Estimated main prompt tokens:** ~100-300
**This is the only part that changes per prospect.**

### Total Cost Per Prospect (Estimated)
- System prompt (cached): ~2,500 tokens at 50% discount = ~1,250 effective tokens
- Main prompt: ~200 tokens
- Output: ~400 tokens
- **Total: ~1,850 effective tokens per prospect**
- At Nano pricing, roughly USD 0.001-0.002 per prospect
- 1,000 prospects = ~USD 1-2

## Compaction

- **Aggressive.** Each prospect is independent. No need to remember the previous company when generating ideas for the next one.
- **Exception:** If Brenan gives feedback within a batch ("make the costing more specific"), retain that feedback for the remainder of the batch, then discard.

## Cortex

- **Load:** The IDENTITY.md (which contains Exprs context, pillar definitions, idea constraints, and all 10 examples)
- **Do not load:** Discovery call scripts, objection playbooks, research pack schemas (out of scope for this agent)
- **The examples ARE the cortex.** This agent's quality comes from the examples more than any external knowledge base.

## Memory Persistence

- **Session-level only.** Each batch of prospects is a fresh session.
- **Within-session memory:** Remember Brenan's feedback and apply it forward through the batch.
- **No cross-session persistence needed.**

## Browser

- **Optional but recommended.** If Brenan provides only a company name (no description), the agent should be able to fetch the company's website or LinkedIn to extract a description.
- **Allowed domains:** Company websites, LinkedIn company pages, Crunchbase
- **Purpose:** Extract company description only. Do NOT conduct full research (that's the Research Intel agent's job).
- **If browser is disabled:** Agent will ask Brenan to provide the company description.

## Sandbox

- **Minimal.** No code execution. Pure text generation within constrained templates.

## Channel Configuration

- **Primary:** Slack or direct chat
- **Batch mode:** When Brenan sends multiple companies, process sequentially, deliver all results in one response
- **Format:** Clean text, no excessive markdown. Ideas should be copy-pasteable into an email tool.
- **Character limit:** Format A should fit in a standard email (under 800 characters for the ideas portion). Format B should be under 200 characters.

## Testing Protocol

Before deploying, test with these 5 company types:

1. **B2B SaaS (UK, 40 employees)** — Should produce engineering + commercial role ideas
2. **Consumer marketplace (US, 60 employees)** — Should produce two-sided marketplace ideas
3. **Fintech/payments (UK, 80 employees)** — Should produce compliance + engineering ideas
4. **Agency/consultancy (UK, 25 employees)** — Should produce consultant + delivery ideas
5. **Pre-seed startup (10 employees)** — Should honestly flag as below ICP threshold

**Pass criteria:** Each output hits its assigned pillar, references something company-specific, stays within word limits, uses no banned language, and the costing estimates are plausible for the industry.

## Scaling Notes

This agent is designed for Eric Nowoslawski's "Creative Ideas Campaign" framework:
- At 100 prospects/day, cost is ~USD 0.10-0.20/day
- At 1,000 prospects/day, cost is ~USD 1-2/day
- The system prompt caching means cost scales linearly with prospects only, not with prompt size
- Quality is controlled by examples, not model size — if output degrades, add more examples before upgrading the model
