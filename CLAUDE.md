# Ralph Agent — Content Platform Feature Work

You are an autonomous coding agent. Each iteration you receive fresh context — your memory persists through files (progress.txt, prd.json, AGENTS.md) and git history, NOT conversation.

## Working Directory

You are in: `/Users/robertpeacock/Desktop/Claude code/content platform/.claude/worktrees/suspicious-mendel`

This is a git worktree of the shared-ai-layer repo. The content platform lives under:
- `apps/content-os/` — Next.js 15, React 19 content distribution app
- `apps/studio/` — Next.js 15, React 19 video console app
- `packages/ai-core/` — Shared AI layer (LLM providers, billing, BYOK)
- `supabase/migrations/` — PostgreSQL migrations
- `infra/` — Docker Compose for self-hosted Supabase + FreeFlow

## Phase Detection

Check: Does `progress.txt` contain completed story entries (beyond the header)?

- **NO previous entries** → FIRST iteration. Read the full codebase context below, then implement the highest priority incomplete story.
- **YES previous entries** → CONTINUATION. Read Codebase Patterns in progress.txt and AGENTS.md, identify next story, implement it.
- **STUCK** (same story failed 2+ iterations per progress.txt) → Re-assess approach. Try a different strategy or document blockers.

## Your Task

1. Read `prd.json` — identify the highest priority story where `passes: false`
2. Read `progress.txt` — check Codebase Patterns section, then recent entries
3. Read `AGENTS.md` — load operational patterns and safety rules
4. Verify you're on branch `claude/suspicious-mendel`. If not: `git checkout claude/suspicious-mendel`
5. Implement that **single** user story
6. Run quality check: `cd apps/content-os && npx tsc --noEmit`
7. If check passes, commit: `git add -A && git commit -m "feat: [Story ID] - [Story Title]"`
8. Update `prd.json` — set `passes: true` for the completed story
9. Append progress to `progress.txt` (format below)
10. Update `AGENTS.md` if you discover reusable patterns

## Codebase Context

### Key Files You'll Touch

| Story | Key Files |
|-------|-----------|
| FW-001 (AI client) | `apps/content-os/src/lib/ai.ts`, `packages/ai-core/src/client.ts`, `packages/ai-core/src/types.ts`, `packages/ai-core/src/index.ts` |
| FW-002 (Bluesky) | `apps/content-os/src/infrastructure/distribution/platforms/bluesky.adapter.ts` (new), `platforms/index.ts` |
| FW-003 (Threads) | `apps/content-os/src/infrastructure/distribution/platforms/threads.adapter.ts` (new), `platforms/index.ts` |
| FW-004 (Reddit) | `apps/content-os/src/infrastructure/distribution/platforms/reddit.adapter.ts` (new), `platforms/index.ts` |
| FW-005 (Analytics sync) | `apps/content-os/src/app/api/analytics/sync/route.ts`, `infrastructure/queue/workers.ts` |
| FW-006 (Regenerate) | `apps/content-os/src/services/asset-generator.service.ts`, `services/container.ts` |
| FW-007 (Clip worker) | `apps/content-os/src/infrastructure/queue/workers.ts` |
| FW-008 (Publish worker) | `apps/content-os/src/infrastructure/queue/workers.ts` |
| FW-009 (Queue UI) | `apps/content-os/src/app/queue/page.tsx` |
| FW-010 (Studio export) | `apps/studio/src/app/api/compilations/[id]/export/route.ts` (new), Studio compilation UI |

### Architecture Patterns

- **Platform adapters**: Implement `PlatformAdapter` interface from `infrastructure/distribution/platform-adapter.ts`. See `linkedin.adapter.ts` for reference implementation.
- **Queue workers**: Register in `registerWorkers()` in `infrastructure/queue/workers.ts`. Job types defined in `pg-boss.ts`.
- **API routes**: Use `withApiHandler()` wrapper from `lib/api-handler.ts`. All routes use auth middleware.
- **Repos**: Supabase repos in `infrastructure/supabase/repositories/`. Use `getServices(supabase)` from `services/container.ts`.
- **AI client**: `packages/ai-core` exports `createAIClient(config, supabase)` — see `packages/ai-core/src/client.ts` and `packages/ai-core/src/types.ts` for the real API.
- **Transactions**: Use `withTransaction()` from `infrastructure/supabase/transaction.ts` for multi-table ops.
- **Imports**: Both apps use `@/` path alias mapping to `src/`.

### ai-core Type Mapping (for FW-001)

ai-core exports from `packages/ai-core/src/types.ts`:
```typescript
interface AIClientConfig { appId: string; supabaseClient: SupabaseClient; defaultModel?: string; }
interface ChatParams { userId: string; featureId: string; messages: Message[]; model?: string; maxTokens?: number; temperature?: number; tools?: Tool[]; }
interface ChatResult { content: string; usage: { tokensIn: number; tokensOut: number; costUsd: number; }; model: string; latencyMs: number; }
interface Message { role: 'user' | 'assistant'; content: string; }
```

**The types are nearly 1:1!** Content OS ai.ts's local interfaces (AIChatParams, AIChatResult, AIMessage) match ai-core's (ChatParams, ChatResult, Message) field-for-field. The facade just needs to:
1. Import `createAIClient` from `@org/ai-core`
2. Import `createServiceClient` from supabase/client.ts for the SupabaseClient
3. Construct: `const coreClient = createAIClient({ appId: 'content-os', supabaseClient: createServiceClient(), defaultModel: 'claude-sonnet-4-20250514' })`
4. Delegate `chat()` calls directly — params and result shapes match

### Env Vars (for adapters)

Adapters read from process.env. Expected vars (already in .env.example):
- `BLUESKY_SERVICE_URL` (default: https://bsky.social)
- `THREADS_APP_ID`, `THREADS_APP_SECRET`, `THREADS_REDIRECT_URI`
- `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_REDIRECT_URI`, `REDDIT_USER_AGENT`

## Scope Boundaries

- **DO**: Edit files under apps/, packages/, supabase/, infra/
- **DO NOT**: Touch SalesBlock, JobTracker, or any repo outside this worktree
- **DO NOT**: Push to remote
- **DO NOT**: Run npm install (dependencies are already installed)
- **DO NOT**: Modify Supabase hosted instances — self-hosted only
- **DO NOT**: Delete existing @crumb breadcrumb metadata

## Quality Gates

Before committing, run:
```bash
cd apps/content-os && npx tsc --noEmit
```

If it fails, fix the errors before committing. Do NOT commit broken TypeScript.

## Progress Report Format

APPEND to progress.txt:

```
## [timestamp] - [Story ID] - [Story Title]
- **Implemented:** [What was built]
- **Files changed:** [List of files]
- **Quality:** tsc passed / failed
- **Learnings:**
  - [Pattern discovered]
  - [Gotcha encountered]
---
```

## Completion Protocol

After completing a story, check if ALL stories have `passes: true`.

**If ALL complete:**
```
<promise>COMPLETE</promise>
```

**If stories remain with `passes: false`:**
End normally. Next iteration picks up next story.

**If blocked 2+ iterations on same story:**
Document blockers, then:
```
<promise>BLOCKED</promise>
```
