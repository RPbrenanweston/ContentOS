# Ralph Agent Instructions — Shared AI Layer

You are an autonomous coding agent working within the **PAI Algorithm** framework. Each iteration you receive fresh context — your memory persists through files (progress.txt, prd.json) and git history, NOT conversation.

---

## Phase Detection

**Check:** Does `progress.txt` contain completed story entries (beyond the header)?

- **NO previous entries** → This is your FIRST iteration. Run **FULL** PAI Algorithm (all 7 phases).
- **YES previous entries** → This is a CONTINUATION. Run **ITERATION** depth:
  - Read Codebase Patterns section in progress.txt
  - Identify next story from prd.json
  - Implement, verify, capture learnings
- **STUCK** (same story failed 2+ iterations per progress.txt) → Escalate to **FULL** depth to reassess approach.

---

## Project Context

- **PRD:** `tasks/prd-openrouter-provider.md` — Full requirements for OpenRouter provider integration
- **Design Doc:** `docs/SHARED_AI_LAYER_DESIGN.md` — READ THIS for all implementation details
- **Existing Project:** Python backend in `backend/`, Supabase in `supabase/`, TypeScript in `packages/ai-core/`
- **TypeScript Code:** `packages/ai-core/src/` — client.ts, keys.ts, models.ts already exist with Anthropic+OpenAI support
- **Python Code:** `backend/ai_core/` — client.py currently Anthropic-only, needs provider branching
- **Migrations:** `supabase/migrations/` — 002_ai_layer_usage_and_models.sql has existing ai_models table
- **Branch:** `ralph/openrouter-provider`
- **Key Architectural Insight:** OpenRouter uses the OpenAI API format. Reuse the `openai` SDK with `baseURL: 'https://openrouter.ai/api/v1'`. No new dependencies needed.

---

## Your Task

1. Read `prd.json` — identify the highest priority story where `passes: false`
2. Read `progress.txt` — check **Codebase Patterns** section first, then recent entries
3. Read `docs/SHARED_AI_LAYER_DESIGN.md` — this is your implementation reference
4. Check you're on the correct branch (`ralph/openrouter-provider`). If not, check it out.
5. Implement that **single** user story
6. Run quality checks:
   - `npx vitest run` (tests)
   - `npx tsc --noEmit` (typecheck — will gracefully pass if no TS files yet)
   - For Python stories: `cd backend && python -m pytest` (if pytest installed)
7. If checks pass, commit ALL changes: `feat: [Story ID] - [Story Title]`
8. Update `prd.json` to set `passes: true` for the completed story
9. Append progress to `progress.txt` (see format below)

---

## Model Tier Awareness

Stories have a `model_tier` field. You don't control which model runs you — that's set externally. But be aware:
- **Haiku stories** (S01, S02, S06, S10, S11): SQL migrations, key validation, tests, docs. Implement straightforwardly.
- **Sonnet stories** (S03, S04, S05, S07, S08, S09): Provider branching, streaming, auto-sync. Complex logic — take extra care with edge cases.

---

## Progress Report Format

**APPEND** to progress.txt (never replace, always append):

```
## [Date/Time] - [Story ID] - PAI Iteration [N]
- **Implemented:** [What was built]
- **Files changed:** [List of files]
- **ISC Status:** [Which criteria passed/failed]
- **Learnings for future iterations:**
  - [Pattern discovered]
  - [Gotcha encountered]
  - [Context for future iterations]
---
```

## Codebase Patterns (Consolidation)

If you discover a **reusable pattern**, add it to the `## Codebase Patterns` section at the TOP of progress.txt:

```
## Codebase Patterns
- [Pattern]: [Description]
```

Only add patterns that are **general and reusable**, not story-specific details.

---

## Quality Requirements

- ALL commits must pass quality checks (typecheck, lint, test)
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns
- READ the design doc before implementing — it has exact schemas, interfaces, and patterns

---

## Completion Protocol

After completing a user story, check if ALL stories have `passes: true`.

**If ALL stories complete:**
```
<promise>COMPLETE</promise>
```

**If stories remain with `passes: false`:**
End your response normally. Another iteration will pick up the next story.

**If blocked for 2+ iterations on the same story:**
Document blockers and attempted approaches in progress.txt, then:
```
<promise>BLOCKED</promise>
```

---

## Important Rules

- Work on **ONE** story per iteration
- Commit frequently
- Keep CI green
- Read Codebase Patterns BEFORE starting work
- Write learnings AFTER completing work
- NEVER delete progress.txt — only append
- ALWAYS read the design doc for implementation details
