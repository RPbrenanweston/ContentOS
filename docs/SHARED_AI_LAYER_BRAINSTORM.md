# Shared AI Layer for Vibe-Coded Apps — Brainstorm & Design

**Created:** 2026-02-24
**Status:** Brainstorm / Pre-Architecture
**Origin:** High-level PRD analyzed through FirstPrinciples + Council + RedTeam

---

## 1. Executive Summary

The original PRD proposes a reusable AI platform spanning 3 apps (Job Tracker, Sales Block, Scorecard). After rigorous analysis through first principles decomposition, 5-agent architecture debate, and adversarial red-teaming, the recommendation is:

**Don't build a platform. Build a product with AI. Extract the platform later.**

The core insight: the genuinely shared parts of "AI across apps" are ~200 lines of code (API client + usage logging). Everything else — prompts, context assembly, skills, features — is app-specific. Premature abstraction will cost more than duplication.

**Strategy: Staged Extraction**
1. Build AI features directly in the most valuable app
2. Isolate AI code in a clean `/lib/ai/` boundary from day one
3. Extract the shared layer when the second app proves what's actually reusable
4. Only build infrastructure when you have 5+ consumers

---

## 2. What the PRD Gets Right

These ideas are preserved and sequenced into the staged plan:

| PRD Idea | Status | When |
|----------|--------|------|
| BYOK (bring your own key) | Deferred to Phase 2 | After managed-only launch proves demand |
| Managed AI credits/billing | Phase 1 (simple) | Usage logging from day 1, billing page when users pay |
| Reusable AI features | Validated per-app first | Extract after 2+ apps implement same pattern |
| Skills framework | Redesigned | Not a framework; each app's existing API is the "skill" |
| Per-app configuration | Eliminated (for now) | No config system needed for 1-3 apps, just code |
| Standard context contract | Eliminated | Each app assembles its own context; forced standardization adds friction |
| Usage ledger | Phase 1 (simple) | One Supabase table, no aggregation/export until needed |
| Model selection | Simplified | One default model, user override via env/settings |

---

## 3. What the PRD Gets Wrong (Critical Findings)

### 3.1 The "Skills Framework" Is Premature

The PRD proposes a framework where AI can read/write in each app with safety controls, schema validation, confirmation flows, and audit logging.

**Reality check:** A "skill" is just an API endpoint that the AI calls. Each app already needs auth, validation, and business logic. The "safety controls" are the app's existing permission system. Repackaging "app has an API" as a "skills framework" creates:
- Schema coupling across apps with different data models
- A permission explosion (Skills x Apps x Models x Users)
- Silent failures when one app updates its schema without updating the shared contract

**Recommendation:** Each app implements its own AI features inline. When 2+ apps share the exact same operation (not just the same verb like "summarize"), extract that specific operation.

### 3.2 BYOK + Managed Credits = Two Products

Supporting both simultaneously requires:
- Dual billing paths with different liability models
- Encrypted key storage (security-critical)
- Runtime model availability checks (BYOK keys may not have access to your default model)
- Error UX for "your key is invalid/rate-limited" vs. "our service is down"

**Recommendation:** Launch with managed-only. Add BYOK when users request it (they will tell you).

### 3.3 The "Standard Context Contract" Won't Survive Real Data

Job applications, sales leads, and performance scorecards have fundamentally different data shapes. A "standard format" will either be too generic (loses signal) or too specific (only works for one app).

**Recommendation:** Each app formats its own prompts and assembles its own context. The shared layer handles LLM API calls only.

### 3.4 Building for 3 Apps Before 1 App Ships

The PRD assumes all 3 apps will need AI simultaneously. But:
- None of the 3 apps has validated product-market fit at scale
- You don't know which app will succeed
- Building shared infra assumes all 3 survive

**Recommendation:** Pick the highest-value app. Ship AI in it. Learn. Then decide.

---

## 4. Open Decisions (Resolved)

### Decision 1: BYOK per-request vs per-account?
**Resolution: Per-account default (Phase 2).** Users set their access mode once in settings. Per-request switching adds UX complexity for zero demonstrated need. Revisit only if users explicitly request per-request control.

### Decision 2: Can org admins force one mode?
**Resolution: Yes, but defer admin controls to Phase 3.** When you have org/team users, add a tenant-level setting: `ai_mode: "managed" | "byok" | "user_choice"`. For Phase 1-2, it's always user choice.

### Decision 3: Default retention rules?
**Resolution: Metadata-only by default.** Log: timestamp, model, token counts, cost, feature name, success/failure. Do NOT log prompt content or AI responses by default. Allow opt-in content logging per-app for debugging. This is the safest default and avoids compliance complexity.

### Decision 4: Which actions require confirmation?
**Resolution: Any action that changes user-visible data.** Concrete rule: if the AI operation results in a database write that the user would see in the UI, it requires a preview + confirm step. Read-only operations (summarize, extract, score, classify) never require confirmation.

---

## 5. Recommended Architecture: Staged Extraction

### Phase 0: AI-Ready Isolation (Week 1)
**Goal:** Structure AI code so extraction is trivial later.

In whichever app you build first, create a clean boundary:

```
app/
  lib/
    ai/
      client.ts          # LLM API wrapper (retry, streaming, error handling)
      usage.ts           # Log usage to Supabase table
      types.ts           # Request/Response types
      features/
        summarize.ts     # Takes domain data, returns summary
        extract.ts       # Takes text, returns structured fields
        score.ts         # Takes items, returns rankings
        draft.ts         # Takes context, returns drafted text
      templates/
        summarize.md     # Prompt templates (version controlled)
        extract.md
        score.md
        draft.md
```

**The discipline:** AI code lives in `lib/ai/`. App code calls into `lib/ai/`. Never mix AI logic with business logic. This makes extraction trivial — when the time comes, you literally copy the directory.

### Phase 1: AI in One App (Weeks 2-4)
**Goal:** Ship 3-5 AI features in the highest-value app.

**What to build:**
- Thin LLM client (one provider: Anthropic Claude Sonnet)
- 3-5 read-only features (summarize, extract, score, classify, draft)
- Usage logging (one Supabase table)
- Simple settings page (enable/disable AI, see usage)
- Streaming responses for chat/generation features

**What NOT to build:**
- No BYOK (managed-only)
- No skills framework (features call app APIs directly)
- No multi-model (one model, hardcoded)
- No billing (free tier or included in subscription)
- No context contract (each feature assembles its own prompt)

**Supabase table (all you need):**

```sql
CREATE TABLE ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  app_id TEXT NOT NULL,
  feature_id TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_in INTEGER NOT NULL,
  tokens_out INTEGER NOT NULL,
  cost_usd NUMERIC(10,6) NOT NULL,
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_user ON ai_usage_log(user_id, created_at);
CREATE INDEX idx_usage_app ON ai_usage_log(app_id, created_at);
```

### Phase 2: AI in Second App + Extract Shared (Weeks 5-8)
**Goal:** Build AI in the second app, extract what's truly shared.

When you build AI features in app #2, you will discover:
- `client.ts` is 100% reusable (copy it over)
- `usage.ts` is 100% reusable (same table, different app_id)
- `types.ts` is 80% reusable (base types shared, some app-specific)
- `features/` are 0% reusable (different domains entirely)
- `templates/` are 0% reusable (different prompts entirely)

**What to extract:**

```
@your-org/ai-core (npm package or shared directory)
  client.ts      # LLM API wrapper
  usage.ts       # Usage logging
  types.ts       # Shared types
  models.ts      # Model registry (what's available)
```

**What stays per-app:**
- All features (summarize-job-posting is not summarize-sales-lead)
- All templates (domain-specific prompts)
- All context assembly (each app knows its own data)
- All UI placement (where AI buttons appear)

**Add BYOK here** (if users are asking for it):
- `user_api_keys` table in Supabase
- Key encryption at rest (Supabase Vault or application-level)
- Settings UI: "Use my own key" toggle
- Client.ts updated to accept user-provided keys

### Phase 3: Managed Credits + Billing (Weeks 9-12)
**Goal:** Monetize AI usage.

Only build this when you have paying users on at least one app:
- Pricing rules (per-token, per-feature, or bundled)
- Usage dashboard (period usage, remaining credits)
- Spending caps (user-configurable + admin-enforced)
- Stripe integration for AI credit purchases

### Phase 4: Multi-App Dashboard (When 3+ Apps Active)
**Goal:** Unified view across apps.

Only build this when 3+ apps are independently working with AI:
- Cross-app usage analytics
- Shared API key management
- Org-level controls (admin mode enforcement, spending limits)
- Feature catalog (which features are enabled per app)

---

## 6. Which App Goes First?

| App | Existing State | AI Value-Add | Recommendation |
|-----|---------------|--------------|----------------|
| **ExpressRecruitment** | Phase 1 complete (Supabase schema, RSS, CSV). Python backend. | HIGH — signal classification, candidate scoring, outreach drafting. Phase 2 agents already planned. | **Already in progress.** AI is the core of Phase 2. But it's Python, and the SaaS apps are likely TypeScript. |
| **Sales Block** | Early-stage, finding PMF | MEDIUM — daily call plans, outreach rewriting, CRM summaries. But PMF unvalidated. | Don't add AI until the core product works without it. |
| **Scorecard** | Early-stage, product exists | HIGH — interview scoring, rubric generation, bias detection. Clear AI use cases. | **Strong candidate for first TypeScript AI implementation.** |

**Recommendation:**
- **ExpressRecruitment** continues independently with its Python AI agents (Phase 2). This is domain-specific agent architecture, not a "shared AI layer" consumer.
- **Scorecard** becomes the first TypeScript app to get the shared AI pattern (Phase 1 above). Clear AI use cases, product already exists.
- **Sales Block** gets AI features after Scorecard validates the pattern.

---

## 7. What "Skills" Actually Look Like (No Framework Needed)

Instead of a "skills framework," each app simply exposes functions that AI features can call:

```typescript
// In Scorecard app - NOT a shared framework
// scorecard/lib/ai/features/generate-rubric.ts

import { callAI } from '../client';
import { logUsage } from '../usage';
import { getRoleDetails, saveRubric } from '../../api/roles';

export async function generateRubric(roleId: string, userId: string) {
  // 1. Gather context (app-specific)
  const role = await getRoleDetails(roleId);

  // 2. Call AI (shared client)
  const result = await callAI({
    model: 'claude-sonnet-4-20250514',
    messages: [{
      role: 'user',
      content: `Generate an interview rubric for: ${role.title}
        Skills required: ${role.skills.join(', ')}
        Level: ${role.level}

        Return JSON with criteria, questions, and scoring guidelines.`
    }],
  });

  // 3. Log usage (shared)
  await logUsage({ userId, appId: 'scorecard', featureId: 'generate-rubric', ...result.usage });

  // 4. Write result (app-specific, with user confirmation in UI)
  return result.content; // UI shows preview, user confirms before save
}
```

The "skill" is just a function. The "safety control" is the UI showing a preview before saving. The "audit trail" is the usage log. No framework required.

---

## 8. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **LLM Provider** | Anthropic (Claude Sonnet) | Best quality/cost for structured output, tool use support |
| **Backend** | TypeScript (for SaaS apps), Python (for recruitment platform) | Match existing codebases |
| **Database** | Supabase (Postgres) | Already in use, free tier covers MVP, RLS for multi-tenant |
| **AI Client** | Anthropic SDK (`@anthropic-ai/sdk`) | Direct SDK, no aggregator needed for single provider |
| **Streaming** | Server-Sent Events (SSE) | Native browser support, simpler than WebSockets |
| **Key Storage** | Supabase Vault (Phase 2 BYOK) | Encrypted at rest, no additional service |
| **Billing** | Stripe (Phase 3) | Industry standard, usage-based billing support |

---

## 9. Cost Model

### Per-Request Estimates (Claude Sonnet)

| Feature | Avg Input Tokens | Avg Output Tokens | Cost per Call |
|---------|-----------------|-------------------|---------------|
| Summarize | 2,000 | 500 | $0.009 |
| Extract fields | 3,000 | 300 | $0.011 |
| Score/classify | 1,500 | 200 | $0.006 |
| Draft text | 1,000 | 1,000 | $0.009 |
| Generate rubric | 2,000 | 2,000 | $0.018 |

### Monthly Estimates (per app, 100 active users)

| Usage Pattern | Calls/User/Day | Monthly Cost |
|--------------|----------------|--------------|
| Light (5 calls/day) | 500/day | ~$135/month |
| Medium (15 calls/day) | 1,500/day | ~$405/month |
| Heavy (30 calls/day) | 3,000/day | ~$810/month |

At $10-20/user/month pricing, margins are healthy even at heavy usage.

---

## 10. What's Different From the Original PRD

| Original PRD | This Design |
|-------------|-------------|
| Build shared platform first, then apps consume it | Build AI in one app first, extract what's shared after |
| Skills framework with schema validation, permissions, safety classification | Functions that call app APIs. Safety = UI preview before write. |
| Standard context contract across apps | Each app assembles its own prompts and context |
| BYOK + managed credits from day 1 | Managed-only for launch, BYOK in Phase 2 |
| Per-app configuration system | Code-level feature toggles, no config system |
| Centralized model selection | One model, hardcoded. User override in Phase 2. |
| Usage ledger with billing reconciliation | One Supabase table. Billing when there's revenue. |
| Shared AI features library | Features are per-app. Only the API client is shared. |
| 5-phase rollout building foundation first | Ship AI features in one app within 2 weeks |

---

## 11. PRD Gaps Identified

These were missing from the original PRD and should be addressed:

1. **Prompt Engineering Strategy** — Where do prompts live? How are they versioned, tested, evaluated? This is the core IP.
2. **Evaluation Framework** — How do you know AI output is good? Need quality metrics per feature.
3. **Latency Budget** — AI calls take 1-30s. UX must handle streaming, progress, cancellation.
4. **Token Cost Modeling** — Unit economics per feature per user. Are margins viable?
5. **Migration Path** — How does the existing Python recruitment platform integrate? (Answer: it doesn't share; it's a separate AI implementation.)
6. **User Experience Design** — Where do AI features appear in the UI? Inline, sidebar, modal? Interaction patterns for review/accept/reject.

---

## 12. Next Steps

1. **Choose the first app** — Scorecard is recommended (clear AI use cases, product exists)
2. **Create the `lib/ai/` directory** in that app with the Phase 0 structure
3. **Implement 3 read-only features** (summarize, extract, score)
4. **Ship to users** and measure usage, quality, and willingness to pay
5. **Iterate** based on real user feedback, not speculative architecture

---

## Appendix: Architecture Decision Record

| # | Decision | Options Considered | Chosen | Rationale |
|---|----------|--------------------|--------|-----------|
| 1 | Build shared layer vs. build per-app | Shared platform, NPM package, API gateway, Supabase-native, per-app first | Per-app first, extract later | All 3 analyses (FirstPrinciples, Council, RedTeam) independently recommended this. Premature abstraction is the biggest risk. |
| 2 | BYOK timing | Day 1, Phase 2, Never | Phase 2 | Dual billing paths double complexity. Ship managed-only, add BYOK when users ask. |
| 3 | Skills framework | Full framework, per-app functions, no skills | Per-app functions | "Skills" is just "the app's API." No framework needed for 1-3 apps. |
| 4 | Context standardization | Standard contract, per-app context, hybrid | Per-app context | Different apps have fundamentally different data shapes. Forced standardization loses signal. |
| 5 | Model strategy | Multi-model with fallback, single model | Single model (Claude Sonnet) | No users yet. One model simplifies everything. Add alternatives when demand proves it. |
| 6 | First app | ExpressRecruitment, Sales Block, Scorecard | Scorecard | Clear AI use cases, product exists, TypeScript (matches SaaS stack). Recruitment platform continues independently with Python agents. |

---

*Created: 2026-02-24 | Analyzed via PAI Algorithm: FirstPrinciples + Council (5 agents) + RedTeam*
