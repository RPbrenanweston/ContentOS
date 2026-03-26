# Configuration Notes — Candidate Sourcing & Eval

## Model Routing
- **Primary model**: GPT-5 Nano (cost-optimised)
- **Rationale**: Role prep packs and sourcing filters are structured template generation against defined formats. Candidate evaluation is pattern-matching against scorecard criteria. Both are well within Nano's capabilities with explicit templates.
- **Escalation trigger**: Complex candidate evaluations against highly technical roles (e.g., Principal AI Security Engineer) where nuanced technical assessment is needed. Consider mid-tier for these.

## Tuning
- **Temperature**: 0.2 — Slightly above zero to allow natural variation in screening questions and X-Ray queries, but still heavily constrained by templates
- **Max tokens**: 2500 (full Role Prep Pack), 1500 (Candidate Evaluation), 800 (Sourcing Filters only)
- **Top-p**: 0.9
- **System prompt adherence**: Maximum — must follow template structures exactly

## Compaction
- **Moderate compaction**: Retain the current role's prep pack within session. If evaluating multiple candidates against the same role, keep the scorecard criteria and weights in context.
- **Compress between roles**: When user moves to a different role at a different company, compress the previous role's context.
- **Never compress scorecards mid-evaluation**: If evaluating candidates 2 and 3 for the same role, the scorecard from candidate 1's evaluation must remain in context for consistency.

## Cortex
- **Knowledge base**: Load the Role Prep Pack template, Candidate Evaluation template, Sourcing Filters template, AI security context reference (key domains, target companies, adjacent skills)
- **Priority**: Templates > AI security context > sourcing guidance
- **Do not load**: Email frameworks, ICP scoring criteria, company research methodology (out of scope)

## Coalesce
- **Sequential processing for evaluations**: Process one candidate at a time to ensure consistent scorecard application
- **Parallel OK for prep packs**: If user requests prep packs for multiple roles, these are independent and can be processed in any order

## Memory Persistence
- **Session-level**: Retain the current role's prep pack and all candidate evaluations against that role. Critical for comparative evaluation workflows.
- **Cross-session**: Store completed Role Prep Packs as reference. If user asks "use the prep pack from [role]" in a future session, it should be retrievable.
- **Scorecard lock**: Once a scorecard is established for a role, it should not change mid-evaluation cycle. If user wants to adjust weights, explicitly acknowledge the change and offer to re-score previous candidates.

## Browser
- **Limited**: Enable for LinkedIn profile extraction when user pastes a candidate URL. Do NOT conduct general company research (that's the Research Intel agent's job).
- **Allowed domains**: linkedin.com only
- **Purpose**: Extract candidate name, title, company, skills from LinkedIn profiles for evaluation input

## Sandbox
- **Minimal**: No code execution needed. Pure structured text generation and template population.

## Channel Configuration
- **Primary output**: Inline text (Slack or chat) for quick evaluations, saved files for full Role Prep Packs
- **Slack format**: Plain text with emoji headers, under 4000 characters per message. Split long prep packs into 2 messages.
- **File naming**: `{COMPANY_NAME}_{ROLE_TITLE}_prep_pack.md` for role packs, `{CANDIDATE_NAME}_evaluation.md` for candidate evals
