# Shared AI Layer

A reusable AI utility layer that provides LLM access, usage tracking, billing, and key management across multiple apps.

**Version:** 1.0.0
**Status:** Production-ready
**Languages:** TypeScript, Python

---

## Overview

This is **not** a platform or framework. It's a thin, battle-tested wrapper around AI provider APIs with shared infrastructure for the operational concerns every AI-powered app needs:

- **Multi-provider chat & streaming** (Anthropic, OpenAI, OpenRouter 100+ models)
- **Usage tracking** (every call logged for billing and debugging)
- **BYOK** (bring your own key) with AES-256-GCM encrypted storage
- **Credit-based billing** with Stripe integration and spending caps
- **Org-level shared credit pools** for team billing
- **Model registry** with auto-sync from OpenRouter
- **Retry logic** with exponential backoff and jitter
- **Unified error handling** across all providers

The hard work is done by the providers. We handle the plumbing.

---

## Supported Providers

| Provider | TypeScript | Python | Streaming | Tools | Models |
|----------|-----------|--------|-----------|-------|---------|
| **Anthropic** | Yes | Yes | Yes | Yes | Claude Sonnet, Haiku, Opus |
| **OpenAI** | Yes | Yes | Yes | Yes | GPT-4o, GPT-4 Turbo, GPT-3.5 |
| **OpenRouter** | Yes | Yes | Yes | Yes | 100+ models via unified API |

### OpenRouter Integration

OpenRouter provides access to 100+ LLM models through a single OpenAI-compatible API. This includes models from Anthropic, OpenAI, Google, Meta, Mistral, and more.

- **Unified Access:** One API key for 100+ models
- **Cost Flexibility:** Choose models by price tier
- **Auto-Sync:** Models automatically sync from OpenRouter's registry
- **OpenAI Compatible:** Uses the same SDK with custom `baseURL`

---

## Architecture

```
+-----------------------------------------------------------+
|                    Supabase (Shared)                       |
|                                                           |
|  +----------------+ +----------------+ +----------------+ |
|  | ai_usage_log   | | ai_api_keys    | | ai_credit_bal  | |
|  | (every call)   | | (BYOK, AES256) | | (billing)      | |
|  +----------------+ +----------------+ +----------------+ |
|  +----------------+ +----------------+ +----------------+ |
|  | ai_models      | | ai_spending_   | | stripe_payment | |
|  | (registry)     | | caps           | | _logs          | |
|  +----------------+ +----------------+ +----------------+ |
|  +----------------+                                       |
|  | org_members    |                                       |
|  | (team billing) |                                       |
|  +----------------+                                       |
+-----------------------------------------------------------+
          |                    |                |
          v                    v                v
   +------------+     +--------------+    +------------+
   |  Python    |     |  TypeScript  |    | TypeScript |
   |  ai_core   |     |  @org/ai-core|    | @org/ai-   |
   |  (module)  |     |  (package)   |    | core       |
   +------------+     +--------------+    +------------+
        |                   |                  |
        v                   v                  v
   ExpressRecruit      Scorecard          Sales Block
```

### What's Shared (Supabase)

| Table | Purpose |
|-------|---------|
| `ai_usage_log` | Every AI call across all apps, all users |
| `ai_api_keys` | BYOK encrypted keys (AES-256-GCM, per-user, per-provider) |
| `ai_credit_balances` | Managed credits per user or org |
| `ai_models` | Model registry with pricing and capabilities |
| `ai_spending_caps` | Per-user and admin-set spending limits |
| `stripe_payment_logs` | Idempotent Stripe webhook tracking |
| `org_members` | Organization membership for shared credit pools |

### What's Per-Language (Client Packages)

- LLM provider API client (retries, streaming, error handling)
- Usage logging helper (writes to shared table)
- Key resolution (check BYOK first, fall back to managed)
- Cost calculation (token counts to USD based on model pricing)
- Credit checks and spending cap enforcement
- Stripe checkout session creation

---

## Quick Start

### Installation

**TypeScript:**
```bash
cd packages/ai-core
npm install
```

**Python:**
```bash
cd backend
pip install -r requirements.txt
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
# Anthropic Claude API Key
ANTHROPIC_API_KEY=your_anthropic_api_key

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key

# OpenRouter API Key (access to 100+ models)
OPENROUTER_API_KEY=sk-or-your-key

# Supabase connection
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Encryption key for BYOK key storage (AES-256-GCM)
ENCRYPTION_KEY=your_encryption_key

# Stripe (for credit purchases)
STRIPE_SECRET_KEY=sk_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

---

## Usage Examples

### TypeScript: Basic Chat

```typescript
import { createAIClient } from '@org/ai-core';

const ai = createAIClient({
  appId: 'my-app',
  supabaseClient: supabase,
});

const response = await ai.chat({
  userId: 'user-uuid',
  featureId: 'chat',
  model: 'claude-sonnet-4-20250514',
  messages: [
    { role: 'user', content: 'Hello, Claude!' }
  ]
});

console.log(response.content);
// response.usage: { tokensIn, tokensOut, costUsd }
// response.latencyMs: number
// Usage automatically logged to ai_usage_log
// Credits automatically deducted (managed keys)
```

### TypeScript: OpenRouter Chat

```typescript
// Use any OpenRouter model (100+ available)
const response = await ai.chat({
  userId: 'user-uuid',
  featureId: 'chat',
  model: 'google/gemini-2.0-flash-001',
  messages: [
    { role: 'user', content: 'Explain quantum computing' }
  ]
});
```

### TypeScript: Streaming

```typescript
const stream = ai.chatStream({
  userId: 'user-uuid',
  featureId: 'chat-stream',
  model: 'gpt-4o',
  messages: [
    { role: 'user', content: 'Write a story about AI' }
  ]
});

for await (const chunk of stream) {
  if (chunk.delta.type === 'text_delta') {
    process.stdout.write(chunk.delta.text);
  }
  // chunk.delta.type can be: 'start_stream', 'text_delta', 'stop_stream'
  // On 'stop_stream', chunk.partialTokens has final token counts
}
```

### TypeScript: Tool Use

```typescript
const response = await ai.chat({
  userId: 'user-uuid',
  featureId: 'chat-tools',
  model: 'claude-sonnet-4-20250514',
  messages: [{ role: 'user', content: 'What is the weather?' }],
  tools: [
    {
      name: 'get_weather',
      description: 'Get current weather for a location',
      input_schema: {
        type: 'object',
        properties: {
          location: { type: 'string' }
        },
        required: ['location']
      }
    }
  ]
});
```

### TypeScript: BYOK (Bring Your Own Key)

```typescript
import { saveKey, validateKey, deleteKey } from '@org/ai-core';

// Validate key before saving
await validateKey('openrouter', 'sk-or-user-key');

// Save encrypted key (AES-256-GCM)
await saveKey('user-uuid', 'openrouter', 'sk-or-user-key', supabase);

// Chat uses BYOK automatically (resolved from DB)
const response = await ai.chat({
  userId: 'user-uuid',
  featureId: 'chat',
  model: 'openai/gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }]
});
// Usage logged with key_source='byok'
// No credit deduction for BYOK calls

// Soft-delete key when done
await deleteKey('user-uuid', 'openrouter', supabase);
```

### Python: Basic Chat

```python
from ai_core.client import AIClient

client = AIClient(config)

response = await client.chat(ChatParams(
    user_id='user-uuid',
    feature_id='chat',
    model='claude-sonnet-4-20250514',
    messages=[
        Message(role='user', content='Hello, Claude!')
    ]
))

print(response.content)
```

### Python: Streaming

```python
stream = client.chat_stream(ChatParams(
    user_id='user-uuid',
    feature_id='chat-stream',
    model='gpt-4o',
    messages=[
        Message(role='user', content='Write a story about AI')
    ]
))

async for chunk in stream:
    if chunk.delta.type == 'text_delta':
        print(chunk.delta.text, end='', flush=True)
```

### Python: OpenRouter

```python
# Provider auto-detected from ai_models table
response = await client.chat(ChatParams(
    user_id='user-uuid',
    feature_id='chat',
    model='meta-llama/llama-3.3-70b-instruct',
    messages=[
        Message(role='user', content='Analyze this data...')
    ]
))
```

---

## API Reference

### Client Factory

```typescript
import { createAIClient } from '@org/ai-core';

const ai = createAIClient({
  appId: string;           // App identifier for usage tracking
  supabaseClient: Supabase; // Supabase client instance
  defaultModel?: string;    // Default model (default: 'claude-sonnet-4-20250514')
});
```

**Methods:**

| Method | Description |
|--------|-------------|
| `ai.chat(params)` | Make a chat completion call. Returns `ChatResult` |
| `ai.chatStream(params)` | Make a streaming chat call. Returns `AsyncIterable<ChatChunk>` |

### Types

**`ChatParams`**
```typescript
{
  userId: string;
  featureId: string;
  messages: Message[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: Tool[];
}
```

**`ChatResult`**
```typescript
{
  content: string;
  usage: { tokensIn: number; tokensOut: number; costUsd: number };
  model: string;
  latencyMs: number;
}
```

**`ChatChunk`** (streaming)
```typescript
{
  delta: {
    type: 'start_stream' | 'text_delta' | 'stop_stream';
    text?: string;
  };
  partialTokens?: { tokensIn: number; tokensOut: number };
}
```

**`Message`**
```typescript
{ role: 'user' | 'assistant'; content: string }
```

**`Tool`**
```typescript
{ name: string; description: string; input_schema: Record<string, unknown> }
```

**`ModelInfo`**
```typescript
{
  id: string; provider: string; displayName: string;
  costPerInputToken: number; costPerOutputToken: number;
  maxContextTokens: number; maxOutputTokens: number;
  supportsStreaming: boolean; supportsTools: boolean;
  isDefault: boolean; isActive: boolean;
}
```

### Model Registry

```typescript
import { getModel, getDefaultModel, calculateCost } from '@org/ai-core';

const model = await getModel('claude-sonnet-4-20250514', supabase);
const defaultModel = await getDefaultModel(supabase);
const cost = calculateCost(model, tokensIn, tokensOut);
// cost = (tokensIn * costPerInputToken) + (tokensOut * costPerOutputToken)
```

### Key Management

```typescript
import { resolveKey, saveKey, deleteKey, validateKey } from '@org/ai-core';

// Validate a key by making a minimal API call
await validateKey('anthropic', 'sk-ant-...');  // true or throws InvalidKeyError

// Save encrypted BYOK key
await saveKey('user-id', 'anthropic', 'sk-ant-...', supabase);

// Resolve key (BYOK from DB -> managed env var fallback)
const { key, source } = await resolveKey('user-id', 'anthropic', supabase);
// source: 'byok' | 'managed'

// Soft-delete key (sets is_active=false)
await deleteKey('user-id', 'anthropic', supabase);
```

### Billing & Credits

```typescript
import {
  getRemainingCredits, checkCredits, checkSpendingCap,
  deductCredits, createCheckoutSession, handleStripeWebhook,
  getUserOrgId, getOrgBalance
} from '@org/ai-core';

// Check remaining credits (checks org pool first, then user-level)
const balance = await getRemainingCredits('user-id', supabase);
// Returns: CreditBalance { remainingUsd, usedUsd, periodStart, periodEnd, spendingCapUsd?, orgId? }

// Pre-call credit check (throws InsufficientCreditsError)
await checkCredits('user-id', estimatedCostUsd, supabase);

// Pre-call spending cap check (throws SpendingCapExceededError)
await checkSpendingCap('user-id', estimatedCostUsd, supabase);

// Post-call credit deduction
await deductCredits('user-id', actualCostUsd, supabase);

// Org-level billing
const orgId = await getUserOrgId('user-id', supabase);
const orgBalance = await getOrgBalance(orgId, supabase);

// Stripe checkout for credit top-up ($5, $10, $25, $50 presets)
const session = await createCheckoutSession({
  userId: 'user-id',
  amountUsd: 25,
  successUrl: 'https://app.com/success',
  cancelUrl: 'https://app.com/cancel',
  supabase,
  orgId: 'optional-org-id', // For org-level purchases
});
// Returns: CheckoutSession { sessionId, url, customerId? }

// Stripe webhook handler (idempotent via stripe_payment_logs)
await handleStripeWebhook(rawBody, signature, supabase);
```

### Usage Logging

```typescript
import { logUsage } from '@org/ai-core';

// Fire-and-forget (called automatically by chat/chatStream)
logUsage({
  userId: string;
  orgId?: string;
  appId: string;
  featureId: string;
  provider: string;       // 'anthropic' | 'openai' | 'openrouter'
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
  keySource: string;      // 'byok' | 'managed'
}, supabase);
```

### OpenRouter Sync

```typescript
import { syncOpenRouterModels } from '@org/ai-core';

const result = await syncOpenRouterModels(supabase);
// { inserted: 15, updated: 92, deactivated: 3 }
```

---

## Error Handling

The client maps provider-specific errors to a unified error hierarchy:

```
AIError (base)
  +-- InvalidKeyError            (code: 'INVALID_KEY')
  +-- InsufficientCreditsError   (code: 'INSUFFICIENT_CREDITS')
  +-- SpendingCapExceededError   (code: 'SPENDING_CAP_EXCEEDED')
  +-- ModelNotFoundError         (code: 'MODEL_NOT_FOUND')
  +-- ProviderError              (wraps provider SDK errors)
        +-- RateLimitError       (code: 'RATE_LIMIT', status: 429)
        +-- AuthenticationError  (code: 'AUTHENTICATION_ERROR', status: 401)
```

All errors extend `AIError` which has `code: string` and optional `statusCode: number`.

| HTTP Status | Error Type | Description |
|------------|------------|-------------|
| 401 | `AuthenticationError` | Invalid API key |
| 429 | `RateLimitError` | Too many requests |
| 5xx | `ProviderError` | Provider service issue |
| - | `InsufficientCreditsError` | Not enough credits |
| - | `SpendingCapExceededError` | Spending cap exceeded |
| - | `ModelNotFoundError` | Model not in registry |
| - | `InvalidKeyError` | Key decryption/validation failed |

```typescript
import { AIError, RateLimitError, InsufficientCreditsError } from '@org/ai-core';

try {
  const result = await ai.chat(params);
} catch (error) {
  if (error instanceof RateLimitError) {
    // Back off and retry
  } else if (error instanceof InsufficientCreditsError) {
    // Prompt user to add credits
  } else if (error instanceof AIError) {
    console.error(`AI error [${error.code}]:`, error.message);
  }
}
```

---

## Key Management & Encryption

### BYOK (Bring Your Own Key)

Users can store their own API keys for any supported provider. Keys are encrypted at rest using **AES-256-GCM**.

**Encryption format:** `IV (12 bytes) + Auth Tag (16 bytes) + Ciphertext`, base64-encoded.

The encryption key is derived from the `ENCRYPTION_KEY` environment variable via SHA-256 hash.

### Key Resolution Order

When making an API call, keys are resolved in this order:

1. **User's stored BYOK key** in `ai_api_keys` table (decrypted from DB)
2. **Environment variable** (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`)

BYOK calls are logged with `key_source='byok'` and do not deduct managed credits. Managed key calls deduct credits from the user's (or org's) balance.

### Key Validation

Before saving a BYOK key, validate it by making a minimal API call:

```typescript
await validateKey('anthropic', 'sk-ant-...');
// Makes a 1-token call to verify the key works
// Throws InvalidKeyError for 401 responses
// Supports: anthropic, openai, openrouter
```

---

## Billing & Credits

### How It Works

1. **Pre-call:** `checkCredits()` verifies the user has sufficient balance. `checkSpendingCap()` enforces spending limits.
2. **API call:** Provider-specific call made via chat/chatStream.
3. **Post-call:** `deductCredits()` updates the balance. `logUsage()` records the call.

### Credit Sources

- **Stripe checkout:** Users purchase credits in preset amounts ($5, $10, $25, $50)
- **Webhook processing:** Idempotent via `stripe_payment_logs` table (prevents double-credit on retry)

### Spending Caps

Three levels of spending caps, enforced in order:

| Cap Type | Set By | Scope |
|----------|--------|-------|
| **User cap** | User | Personal limit |
| **Admin cap** | Admin | Per-user override |
| **Org cap** | Admin | Org-wide limit |

For org members, only the admin cap applies. For individual users, the lower of user and admin cap applies.

### Org-Level Billing

Organizations share a credit pool. When a user belongs to an org (via `org_members` table):

- `getRemainingCredits()` returns the org balance
- `deductCredits()` deducts from the org pool
- `checkSpendingCap()` enforces org-level caps
- Credit purchases can target the org via `orgId` parameter

---

## Model Registry & Auto-Sync

### Model Table

The `ai_models` table stores all available models with:

| Column | Description |
|--------|-------------|
| `id` | Model ID (e.g., `google/gemini-2.0-flash-001`) |
| `provider` | `anthropic`, `openai`, or `openrouter` |
| `display_name` | Human-readable name |
| `cost_per_input_token` | USD cost per input token |
| `cost_per_output_token` | USD cost per output token |
| `max_context_tokens` | Maximum context window |
| `max_output_tokens` | Maximum output tokens |
| `supports_streaming` | Boolean |
| `supports_tools` | Boolean |
| `is_default` | Whether this is the default model |
| `is_active` | Whether the model is currently available |

### Provider Auto-Detection

The provider is detected from the `ai_models` table, not the model ID string:

```typescript
await ai.chat({ model: 'claude-sonnet-4-20250514' })   // -> anthropic
await ai.chat({ model: 'gpt-4o' })                      // -> openai
await ai.chat({ model: 'google/gemini-2.0-flash-001' }) // -> openrouter
```

### OpenRouter Auto-Sync

Keeps the model registry up to date with OpenRouter's 100+ models:

```typescript
const result = await syncOpenRouterModels(supabase);
// { inserted: 15, updated: 92, deactivated: 3 }
```

**What it does:**
1. Fetches latest model list from `https://openrouter.ai/api/v1/models`
2. Inserts new models with `is_active=true`
3. Updates existing models with latest pricing and token limits
4. Deactivates models no longer available (`is_active=false`)
5. Skips models with missing or zero pricing

**When to run:** On application startup, via scheduled job (daily/weekly), or manually.

---

## Retry Logic

The TypeScript client includes `retryWithBackoff()` for transient failures:

- **Retried:** HTTP 429 (rate limit) and 5xx (server errors)
- **Not retried:** 401 (auth), 400 (bad request), credit/cap errors
- **Strategy:** Exponential backoff with jitter
- **Defaults:** 3 max retries, 1000ms base delay

---

## Configuration

### OpenRouter Configuration

OpenRouter uses the OpenAI SDK with a custom `baseURL`:

```typescript
// TypeScript (handled internally by the client)
new OpenAI({
  apiKey: key,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://your-app.com',
    'X-Title': 'Your App Name'
  }
})
```

```python
# Python (handled internally by the client)
OpenAI(
    api_key=key,
    base_url='https://openrouter.ai/api/v1'
)
```

---

## Cost Tracking

Every AI call is logged with full metadata:

```sql
-- Total spend by provider (last 30 days)
SELECT provider, SUM(cost_usd) as total_cost
FROM ai_usage_log
WHERE user_id = 'your-user-uuid'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY provider;

-- OpenRouter spend breakdown by model
SELECT model, COUNT(*) as calls, SUM(cost_usd) as cost
FROM ai_usage_log
WHERE provider = 'openrouter'
  AND user_id = 'your-user-uuid'
GROUP BY model
ORDER BY cost DESC;

-- BYOK vs managed key usage
SELECT key_source, COUNT(*) as calls, SUM(cost_usd) as cost
FROM ai_usage_log
WHERE user_id = 'your-user-uuid'
GROUP BY key_source;

-- Error rates by provider
SELECT provider, error_code, COUNT(*) as errors
FROM ai_usage_log
WHERE success = false
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY provider, error_code;
```

---

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `ai_models` | Model registry with pricing and capabilities |
| `ai_usage_log` | Every AI call logged with tokens, cost, latency |
| `ai_api_keys` | BYOK encrypted keys (per-user, per-provider) |
| `ai_credit_balances` | Credit balances per user or org |
| `ai_spending_caps` | Spending limits (user-set and admin-set) |
| `stripe_payment_logs` | Idempotent Stripe webhook tracking |
| `org_members` | Organization membership for shared billing |

### Migrations

| Migration | Description |
|-----------|-------------|
| `001_initial_schema.sql` | Base tables |
| `002_ai_layer_usage_and_models.sql` | Usage log and model registry |
| `003_ai_api_keys.sql` | BYOK key storage |
| `004_ai_credit_balances.sql` | Credit balance tracking |
| `005_stripe_payment_logs.sql` | Stripe idempotency |
| `006_org_level_billing.sql` | Org members and shared pools |
| `007_openrouter_models.sql` | OpenRouter model seed data |

Run migrations in order against your Supabase project.

---

## Testing

### TypeScript Tests

```bash
cd packages/ai-core
npx vitest run
```

**15 test files** covering:

| Test File | Coverage |
|-----------|----------|
| `billing.test.ts` | Credit checks, deductions, balance queries |
| `client.test.ts` | Chat and streaming with all providers |
| `encryption.test.ts` | AES-256-GCM encrypt/decrypt |
| `integration.test.ts` | End-to-end client flows |
| `key-management.test.ts` | Save, delete, validate key flows |
| `keys.test.ts` | Key resolution (BYOK vs managed) |
| `models.test.ts` | Model registry lookups, cost calculation |
| `openai-provider.test.ts` | OpenAI-specific provider tests |
| `openrouter-provider.test.ts` | OpenRouter provider and routing |
| `org-billing.test.ts` | Org-level credit pools and caps |
| `phase3-integration.test.ts` | Full billing integration flows |
| `spending-caps.test.ts` | User, admin, and org spending caps |
| `stripe.test.ts` | Checkout session creation |
| `usage.test.ts` | Usage logging |
| `webhook.test.ts` | Stripe webhook handling, idempotency |

### Python Tests

```bash
cd backend
python -m pytest ai_core/
```

**5 test files** covering:

| Test File | Coverage |
|-----------|----------|
| `test_client.py` | Chat and streaming with all providers |
| `test_encryption.py` | Key encryption/decryption |
| `test_openrouter.py` | OpenRouter provider detection and routing |
| `test_byok_integration.py` | BYOK key resolution and validation |
| `test_package.py` | Module imports and package structure |

---

## Project Structure

```
shared-ai-layer/
+-- packages/
|   +-- ai-core/                    # TypeScript package
|       +-- src/
|       |   +-- client.ts           # Core AI client (chat, streaming, retry)
|       |   +-- types.ts            # All TypeScript interfaces
|       |   +-- errors.ts           # Error class hierarchy
|       |   +-- billing.ts          # Credits, spending caps, Stripe
|       |   +-- keys.ts             # BYOK key management, AES-256-GCM
|       |   +-- models.ts           # Model registry, cost calculation
|       |   +-- usage.ts            # Fire-and-forget usage logging
|       |   +-- sync.ts             # OpenRouter model auto-sync
|       |   +-- index.ts            # Public API exports
|       |   +-- __tests__/          # 15 test files
|       +-- package.json
|       +-- tsconfig.json
+-- backend/
|   +-- ai_core/                    # Python package
|   |   +-- client.py               # Core AI client
|   |   +-- types.py                # Python dataclasses
|   |   +-- models.py               # Model registry
|   |   +-- keys.py                 # Key management
|   |   +-- billing.py              # Credit billing
|   |   +-- usage.py                # Usage logging
|   |   +-- sync.py                 # OpenRouter sync
|   |   +-- tests/                  # 5 test files
|   +-- requirements.txt
+-- supabase/
|   +-- migrations/                 # 7 migration files (001-007)
+-- docs/
|   +-- SHARED_AI_LAYER_DESIGN.md   # Full design document
+-- tasks/
|   +-- prd-openrouter-provider.md  # OpenRouter PRD
+-- README.md
```

---

## Dependencies

### TypeScript

| Package | Version | Purpose |
|---------|---------|---------|
| `@anthropic-ai/sdk` | ^0.27.0 | Anthropic Claude API |
| `openai` | ^4.80.0 | OpenAI + OpenRouter APIs |
| `@supabase/supabase-js` | ^2.43.3 | Supabase client |
| `stripe` | ^20.3.1 | Stripe billing |

### Python

Key dependencies from `requirements.txt`:

| Package | Version | Purpose |
|---------|---------|---------|
| `anthropic` | >=0.18.0 | Anthropic Claude API |
| `openai` | >=1.0.0 | OpenAI + OpenRouter APIs |
| `supabase` | >=2.0.0 | Supabase client |
| `cryptography` | >=41.0.0 | AES-256-GCM encryption |
| `pydantic` | >=2.0.0 | Data validation |

---

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and add tests
3. Run quality checks:
   ```bash
   # TypeScript
   cd packages/ai-core
   npx tsc --noEmit       # Typecheck
   npx vitest run         # Tests

   # Python
   cd backend
   python -m pytest ai_core/  # Tests
   ```
4. Commit: `git commit -m "feat: your feature"`
5. Push and create PR

---

## License

MIT

---

## Support

For issues or questions, see:
- Design doc: `docs/SHARED_AI_LAYER_DESIGN.md`
- PRD: `tasks/prd-openrouter-provider.md`

**OpenRouter Resources:**
- Docs: https://openrouter.ai/docs
- Model list: https://openrouter.ai/models
- API: https://openrouter.ai/api/v1/models
