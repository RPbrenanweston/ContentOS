# Shared AI Layer — Design Document

**Created:** 2026-02-24
**Status:** Design / Pre-Implementation
**Approach:** Standalone shared component wrapping LLM provider APIs

---

## 1. What This Is

A reusable AI utility layer that provides LLM access, usage tracking, billing, and key management across multiple apps. This is **not** a platform or framework — it's a thin wrapper around AI provider APIs (Anthropic, OpenAI) with shared infrastructure for the operational concerns (metering, billing, keys).

**The hard work is done by the providers.** We handle:
- Consistent API client with retries, streaming, error handling
- Usage tracking (every call logged for billing and debugging)
- BYOK (bring your own key) support
- Managed credits and billing
- Shared prompt patterns (not a framework — just reusable utilities)

---

## 2. Apps That Consume This

| App | Language | Stage | AI Use Cases |
|-----|----------|-------|-------------|
| **ExpressRecruitment** | Python | Phase 1 complete | Signal classification, candidate scoring, outreach drafting |
| **Scorecard** | TypeScript | Product exists | Interview scoring, rubric generation, bias detection |
| **Sales Block** | TypeScript | Early-stage | Daily call plans, outreach rewriting, CRM summaries |

**Implication:** The shared layer must work across Python AND TypeScript. The truly shared infrastructure lives in Supabase (database). Language-specific client packages wrap it.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Supabase (Shared)                     │
│                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │ ai_usage_log │ │ ai_api_keys  │ │ ai_credit_bal  │  │
│  │              │ │ (BYOK)       │ │ (billing)      │  │
│  └──────────────┘ └──────────────┘ └────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Supabase Edge Functions (optional)        │   │
│  │    - Usage aggregation                            │   │
│  │    - Spending cap enforcement                     │   │
│  │    - Key rotation                                 │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
          │                    │                │
          ▼                    ▼                ▼
   ┌──────────┐      ┌──────────────┐    ┌──────────┐
   │ Python   │      │  TypeScript  │    │ TypeScript│
   │ ai-core  │      │  @org/ai-core│    │ @org/ai-  │
   │ (module) │      │  (package)   │    │ core      │
   └──────────┘      └──────────────┘    └──────────┘
        │                   │                  │
        ▼                   ▼                  ▼
   ExpressRecruit      Scorecard          Sales Block
```

### What's Shared (Supabase)
- **ai_usage_log** — Every AI call across all apps, all users
- **ai_api_keys** — BYOK encrypted keys (per-user, per-provider)
- **ai_credit_balances** — Managed credits per user/org
- **ai_spending_caps** — Per-user and admin-enforced limits
- Migration scripts, RLS policies, indexes

### What's Per-Language (Client Packages)
- LLM provider API client (retries, streaming, error handling)
- Usage logging helper (writes to shared table)
- Key resolution (check BYOK first, fall back to managed)
- Cost calculation (token counts → USD based on model pricing)

### Why Not a Shared API Service?
A centralized API gateway adds:
- Infrastructure to deploy and maintain
- Network latency on every AI call
- Single point of failure
- Deployment coordination

Instead, each app calls the LLM provider directly using the shared client library. The "shared" part is the database schema and the client package — not a running service. This is simpler, cheaper, and more resilient.

---

## 4. Database Schema

### 4.1 Usage Tracking

```sql
-- Core usage log: every AI call across all apps
CREATE TABLE ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  org_id UUID,                          -- for team/org billing (nullable for solo users)
  app_id TEXT NOT NULL,                  -- 'express_recruitment' | 'scorecard' | 'sales_block'
  feature_id TEXT NOT NULL,              -- 'generate-rubric' | 'classify-signal' | etc.

  -- LLM details
  provider TEXT NOT NULL,                -- 'anthropic' | 'openai'
  model TEXT NOT NULL,                   -- 'claude-sonnet-4-20250514' | 'gpt-4o'
  tokens_in INTEGER NOT NULL,
  tokens_out INTEGER NOT NULL,
  cost_usd NUMERIC(10,6) NOT NULL,

  -- Operational
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_code TEXT,                       -- null on success, error type on failure
  key_source TEXT NOT NULL DEFAULT 'managed', -- 'managed' | 'byok'

  -- Metadata
  metadata JSONB DEFAULT '{}',           -- app-specific context (never prompt content)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_user_date ON ai_usage_log(user_id, created_at DESC);
CREATE INDEX idx_usage_app_date ON ai_usage_log(app_id, created_at DESC);
CREATE INDEX idx_usage_org_date ON ai_usage_log(org_id, created_at DESC) WHERE org_id IS NOT NULL;
CREATE INDEX idx_usage_billing ON ai_usage_log(user_id, key_source, created_at DESC);
```

### 4.2 BYOK Key Storage

```sql
-- User-provided API keys (encrypted at rest)
CREATE TABLE ai_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  provider TEXT NOT NULL,                -- 'anthropic' | 'openai'
  encrypted_key TEXT NOT NULL,           -- encrypted via Supabase Vault or app-level
  key_hint TEXT NOT NULL,                -- last 4 chars for UI display: '...xK7m'
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  last_validated_at TIMESTAMPTZ,         -- last successful API call with this key
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, provider)              -- one key per provider per user
);

CREATE INDEX idx_api_keys_user ON ai_api_keys(user_id, is_active);
```

### 4.3 Credit Balances & Billing

```sql
-- Managed credit balances (prepaid or subscription-allocated)
CREATE TABLE ai_credit_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  org_id UUID,
  credits_remaining_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
  credits_used_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
  spending_cap_usd NUMERIC(10,4),        -- user-configured monthly cap (null = no cap)
  admin_cap_usd NUMERIC(10,4),           -- admin-enforced cap (null = no cap)
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, period_start)
);
```

### 4.4 Model Registry

```sql
-- Available models and their pricing
CREATE TABLE ai_models (
  id TEXT PRIMARY KEY,                   -- 'claude-sonnet-4-20250514'
  provider TEXT NOT NULL,                -- 'anthropic'
  display_name TEXT NOT NULL,            -- 'Claude Sonnet 4'
  cost_per_input_token NUMERIC(12,10) NOT NULL,
  cost_per_output_token NUMERIC(12,10) NOT NULL,
  max_context_tokens INTEGER NOT NULL,
  max_output_tokens INTEGER NOT NULL,
  supports_streaming BOOLEAN DEFAULT true,
  supports_tools BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,      -- one default model
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with initial models
INSERT INTO ai_models (id, provider, display_name, cost_per_input_token, cost_per_output_token, max_context_tokens, max_output_tokens, is_default) VALUES
  ('claude-sonnet-4-20250514', 'anthropic', 'Claude Sonnet 4', 0.000003, 0.000015, 200000, 8192, true),
  ('claude-haiku-4-5-20251001', 'anthropic', 'Claude Haiku 4.5', 0.0000008, 0.000004, 200000, 8192, false);
```

---

## 5. TypeScript Package: `@org/ai-core`

### 5.1 Package Structure

```
packages/ai-core/
  src/
    client.ts           # LLM API client (retry, streaming, error handling)
    usage.ts            # Usage logging to Supabase
    keys.ts             # Key resolution (BYOK vs managed)
    billing.ts          # Credit check, cost calculation, balance update
    models.ts           # Model registry and pricing
    types.ts            # Shared types
    errors.ts           # AI-specific error types
    index.ts            # Public API
  package.json
  tsconfig.json
  README.md
```

### 5.2 Core API Surface

```typescript
// --- Public API ---

// Initialize the AI client for an app
export function createAIClient(config: AIClientConfig): AIClient;

interface AIClientConfig {
  appId: string;                    // 'scorecard' | 'sales_block'
  supabaseClient: SupabaseClient;   // app's existing Supabase instance
  defaultModel?: string;            // override default model
}

interface AIClient {
  // Core: call an LLM
  chat(params: ChatParams): Promise<ChatResult>;
  chatStream(params: ChatParams): AsyncIterable<ChatChunk>;

  // Structured output
  generate<T>(params: GenerateParams<T>): Promise<T>;

  // Usage & billing
  getUsage(period?: DateRange): Promise<UsageSummary>;
  getRemainingCredits(): Promise<CreditBalance>;
}

interface ChatParams {
  userId: string;
  featureId: string;                // 'generate-rubric', 'classify-signal'
  messages: Message[];
  model?: string;                   // override per-call
  maxTokens?: number;
  temperature?: number;
  tools?: Tool[];                   // for tool use / function calling
}

interface ChatResult {
  content: string;
  usage: { tokensIn: number; tokensOut: number; costUsd: number };
  model: string;
  latencyMs: number;
}
```

### 5.3 Key Resolution Flow

```typescript
// Internal: resolve which API key to use
async function resolveKey(userId: string, provider: string, supabase: SupabaseClient): Promise<{
  key: string;
  source: 'byok' | 'managed';
}> {
  // 1. Check for active BYOK key
  const { data: userKey } = await supabase
    .from('ai_api_keys')
    .select('encrypted_key')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_active', true)
    .single();

  if (userKey) {
    return { key: decrypt(userKey.encrypted_key), source: 'byok' };
  }

  // 2. Fall back to managed key (from environment)
  return { key: process.env.ANTHROPIC_API_KEY!, source: 'managed' };
}
```

### 5.4 Usage Logging

```typescript
// Internal: log every AI call
async function logUsage(params: {
  userId: string;
  orgId?: string;
  appId: string;
  featureId: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
  keySource: 'managed' | 'byok';
  supabase: SupabaseClient;
}): Promise<void> {
  await params.supabase.from('ai_usage_log').insert({
    user_id: params.userId,
    org_id: params.orgId,
    app_id: params.appId,
    feature_id: params.featureId,
    provider: params.provider,
    model: params.model,
    tokens_in: params.tokensIn,
    tokens_out: params.tokensOut,
    cost_usd: params.costUsd,
    latency_ms: params.latencyMs,
    success: params.success,
    error_code: params.errorCode,
    key_source: params.keySource,
    created_at: new Date().toISOString(),
  });
}
```

---

## 6. Python Module: `ai_core`

Equivalent functionality for ExpressRecruitment, same Supabase tables.

```
backend/
  ai_core/
    __init__.py
    client.py           # LLM API client (anthropic SDK)
    usage.py            # Usage logging to Supabase
    keys.py             # Key resolution
    billing.py          # Credit checks
    models.py           # Model registry
    types.py            # Shared types (dataclasses/Pydantic)
```

Same patterns, same database, different language. The Python module talks to the same `ai_usage_log`, `ai_api_keys`, and `ai_credit_balances` tables.

---

## 7. How Apps Use It

### Scorecard (TypeScript)

```typescript
// scorecard/lib/ai.ts — app-level AI setup
import { createAIClient } from '@org/ai-core';
import { supabase } from './supabase';

export const ai = createAIClient({
  appId: 'scorecard',
  supabaseClient: supabase,
});

// scorecard/features/generate-rubric.ts — a feature
import { ai } from '../lib/ai';

export async function generateRubric(roleId: string, userId: string) {
  const role = await getRoleDetails(roleId);

  const result = await ai.chat({
    userId,
    featureId: 'generate-rubric',
    messages: [{
      role: 'user',
      content: `Generate an interview rubric for: ${role.title}
        Skills required: ${role.skills.join(', ')}
        Level: ${role.level}
        Return JSON with criteria, questions, and scoring guidelines.`
    }],
  });

  // Usage logging happened automatically inside ai.chat()
  return JSON.parse(result.content);
}
```

### ExpressRecruitment (Python)

```python
# backend/services/signal_enrichment.py
from ai_core import create_ai_client
from backend.database import get_supabase

ai = create_ai_client(app_id="express_recruitment", supabase=get_supabase())

async def classify_signal(signal_text: str, user_id: str) -> dict:
    result = await ai.chat(
        user_id=user_id,
        feature_id="classify-signal",
        messages=[{
            "role": "user",
            "content": f"Classify this hiring signal: {signal_text}\n"
                       f"Categories: HIRING, COMPANY, INDIVIDUAL\n"
                       f"Return JSON with category, confidence, and tags."
        }],
    )
    # Usage logged automatically
    return json.loads(result.content)
```

### The Pattern

Every app follows the same flow:
1. Initialize `ai` client with app ID and Supabase connection
2. Call `ai.chat()` or `ai.chatStream()` with user ID and feature ID
3. Usage is logged automatically — app never thinks about metering
4. Key resolution is automatic — BYOK if configured, managed otherwise
5. Credit checks happen before the call — fails fast if over limit

---

## 8. What's NOT in the Shared Layer

Each app owns:
- **Prompts** — Domain-specific, versioned per-app
- **Context assembly** — Each app knows its own data shape
- **Feature definitions** — What AI features exist and how they are invoked
- **Result handling** — Parse, validate, present AI output
- **Confirmation flows** — Write operations show preview, user confirms

The shared layer is **plumbing**, not **product**. It answers: "How do I call an LLM, track usage, and handle billing?" It does NOT answer: "What should I ask the LLM?" or "How should I show the result?"

---

## 9. Phased Delivery

### Phase 1: Core Client + Usage (Week 1-2)
**Ship:** Working AI calls with usage tracking across one app.

Build:
- [ ] Supabase migration: `ai_usage_log` and `ai_models` tables
- [ ] TypeScript `@org/ai-core` package: `client.ts`, `usage.ts`, `types.ts`, `models.ts`
- [ ] Single provider (Anthropic Claude Sonnet)
- [ ] Automatic retry with exponential backoff
- [ ] Streaming support (SSE)
- [ ] Cost calculation from model registry
- [ ] Integrate into Scorecard: 2-3 read-only features (summarize, score, generate)

Not yet:
- No BYOK (managed keys only)
- No billing/credits (free or included)
- No Python module (TS first)

### Phase 2: BYOK + Python (Week 3-4)
**Ship:** Users can bring their own keys. Python apps can use the shared layer.

Build:
- [ ] Supabase migration: `ai_api_keys` table
- [ ] Key encryption (Supabase Vault or app-level AES-256)
- [ ] Key resolution in client (BYOK → managed fallback)
- [ ] Key validation endpoint (test key before saving)
- [ ] Key management API: save/delete/validate BYOK keys
- [ ] Python `ai_core` module (same patterns, same tables)
- [ ] Integrate into ExpressRecruitment: signal classification, candidate scoring

### Phase 3: Billing + Credits (Week 5-6)
**Ship:** Managed credits with spending controls.

Build:
- [ ] Supabase migration: `ai_credit_balances` table
- [ ] Pre-call credit check (fail fast if insufficient)
- [ ] Post-call balance deduction
- [ ] Spending caps (user-configured + admin-enforced)
- [ ] Usage query API (period usage, remaining credits, cost breakdown by feature)
- [ ] Stripe integration for credit purchases

### Phase 4: Multi-Provider + Admin (Week 7-8)
**Ship:** OpenAI support, org-level controls.

Build:
- [ ] OpenAI provider support in client
- [ ] Model selection per-call and per-user preference
- [ ] Org/team billing (shared credit pools)
- [ ] Admin controls: force managed/BYOK mode, org-level spending caps
- [ ] Cross-app usage analytics queries

---

## 10. Open Decisions

### 10.1 BYOK Key Encryption
**Options:**
- **Supabase Vault** — Built-in, no extra service, but Vault API is newer
- **App-level AES-256** — You control the encryption, key stored in env var
- **External KMS** (AWS KMS, etc.) — Most secure, adds cloud dependency

**Recommendation:** Start with app-level AES-256 (simple, no dependencies). Migrate to Supabase Vault when it's battle-tested. External KMS only if you get enterprise customers requiring it.

### 10.2 Credit Model
**Options:**
- **Prepaid credits** — User buys $10 of AI credits, draws down
- **Subscription-included** — Each plan tier includes X credits/month
- **Pay-as-you-go** — Bill actual usage via Stripe metered billing

**Recommendation:** Start with subscription-included (simplest UX). Add prepaid top-ups for heavy users. Pay-as-you-go is the most flexible but hardest to predict costs.

### 10.3 Where Does the TS Package Live?
**Options:**
- **NPM package** (`@org/ai-core`) — Clean separation, versioned, but publish/install cycle
- **Monorepo shared directory** — Zero publish friction, but couples deployment
- **Git submodule** — Don't do this

**Recommendation:** Monorepo shared directory for now (fastest iteration). Extract to NPM when you have 3+ consuming apps or need independent versioning.

### 10.4 Prompt Content Logging
**Options:**
- **Never log prompts** — Maximum privacy, hardest to debug
- **Opt-in per feature** — Developer flag, off by default
- **Always log, auto-expire** — Full debugging, 7-day retention, then delete

**Recommendation:** Opt-in per feature with 7-day auto-expiry. Off by default for privacy. Developers enable for specific features during debugging.

---

## 11. Cost Model

### Per-Request Estimates (Claude Sonnet 4)

| Feature Type | Avg Input | Avg Output | Cost/Call |
|-------------|-----------|------------|-----------|
| Summarize | 2,000 tokens | 500 tokens | ~$0.014 |
| Extract/classify | 3,000 tokens | 300 tokens | ~$0.014 |
| Score/rank | 1,500 tokens | 200 tokens | ~$0.008 |
| Draft text | 1,000 tokens | 1,000 tokens | ~$0.018 |
| Generate rubric | 2,000 tokens | 2,000 tokens | ~$0.036 |

### Monthly Estimates Per App (100 active users)

| Usage Pattern | Calls/User/Day | Monthly Cost |
|--------------|----------------|-------------|
| Light (5/day) | 500 total/day | ~$210/month |
| Medium (15/day) | 1,500 total/day | ~$630/month |
| Heavy (30/day) | 3,000 total/day | ~$1,260/month |

At $10-20/user/month pricing, margins remain healthy even at heavy usage. BYOK users have zero AI cost to you.

---

## 12. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| LLM Provider (default) | Anthropic Claude Sonnet 4 | Best structured output, tool use support |
| LLM Provider (Phase 4) | OpenAI GPT-4o | User choice, some features may work better |
| TypeScript SDK | `@anthropic-ai/sdk` | Direct SDK, no aggregator |
| Python SDK | `anthropic` | Official Python package |
| Database | Supabase (Postgres) | Already in use, shared across all apps |
| Streaming | Server-Sent Events (SSE) | Native browser support, simpler than WebSockets |
| Key Encryption | AES-256-GCM (app-level) | Simple, no external dependencies |
| Billing | Stripe | Industry standard, usage-based billing support |
| Package | Monorepo shared dir → NPM later | Fast iteration now, clean separation later |

---

## 13. Security Considerations

| Concern | Approach |
|---------|----------|
| API key exposure | BYOK keys encrypted at rest, never logged, never sent to client |
| Prompt injection | Each app responsible for input sanitization; shared layer doesn't modify prompts |
| Cost attacks | Spending caps enforced pre-call; rate limiting per-user |
| Data retention | Metadata-only logging by default; prompt logging opt-in with auto-expiry |
| Multi-tenant isolation | Supabase RLS: users only see their own usage, keys, and balances |
| Key rotation | BYOK keys can be updated anytime; old key invalidated on update |

---

## 14. Relationship to Existing Projects

| Project | Relationship to Shared AI Layer |
|---------|-------------------------------|
| **ExpressRecruitment** | Consumer via Python `ai_core` module. Currently has its own signal classification — will migrate to use shared client + usage tracking. Phase 2 agents (Researcher, Resourcer, Copywriter) will all route through shared layer. |
| **Scorecard** | Consumer via TypeScript `@org/ai-core`. First TypeScript app to integrate. Features: rubric generation, interview scoring, bias detection. |
| **Sales Block** | Consumer via TypeScript `@org/ai-core`. Gets AI features after Scorecard validates the pattern. Features: call plans, outreach rewriting, CRM summaries. |

The shared AI layer is **infrastructure** that enables AI features across the portfolio. It doesn't replace any app-specific AI logic — it handles the operational plumbing so each app can focus on its domain.

---

## 15. Success Criteria

| Criterion | Measurement |
|-----------|------------|
| Single source of truth for AI usage | All apps log to same `ai_usage_log` table |
| BYOK works end-to-end | User sets key → AI calls use it → usage logged correctly |
| Zero-effort usage tracking for app devs | App calls `ai.chat()`, logging is automatic |
| Credit system prevents overuse | Pre-call check rejects when balance is zero |
| Cross-app usage visibility | Usage data queryable across all apps, filterable by app |
| New app integration under 1 hour | Import package, set app ID, start calling |

---

*Created: 2026-02-24 | Design for standalone shared AI component*
