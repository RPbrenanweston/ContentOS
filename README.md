# Shared AI Layer

A reusable AI utility layer that provides LLM access, usage tracking, billing, and key management across multiple apps.

**Version:** 2.0.0
**Status:** Production-ready

---

## Overview

This is **not** a platform or framework — it's a thin wrapper around AI provider APIs with shared infrastructure for operational concerns:

- ✅ Consistent API client with retries, streaming, error handling
- ✅ Usage tracking (every call logged for billing and debugging)
- ✅ BYOK (bring your own key) support with encrypted storage
- ✅ Managed credits and billing
- ✅ Multi-language support (TypeScript and Python)

**The hard work is done by the providers.** We handle the plumbing.

---

## Supported Providers

| Provider | TypeScript | Python | Streaming | Tools | Models |
|----------|-----------|--------|-----------|-------|---------|
| **Anthropic** | ✅ | ✅ | ✅ | ✅ | Claude Sonnet, Haiku, Opus |
| **OpenAI** | ✅ | ✅ | ✅ | ✅ | GPT-4o, GPT-4 Turbo, GPT-3.5 |
| **OpenRouter** | ✅ | ✅ | ✅ | ✅ | 100+ models via unified API |

### OpenRouter Integration

OpenRouter provides access to 100+ LLM models through a single OpenAI-compatible API. This includes models from Anthropic, OpenAI, Google, Meta, Mistral, and more.

**Key Benefits:**
- **Unified Access:** One API key for 100+ models
- **Cost Flexibility:** Choose models by price tier (budget/mid/premium)
- **Auto-Sync:** Models automatically sync from OpenRouter's registry
- **OpenAI Compatible:** Uses the same SDK with custom baseURL

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Supabase (Shared)                     │
│                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │ ai_usage_log │ │ ai_api_keys  │ │ ai_credit_bal  │  │
│  │              │ │ (BYOK)       │ │ (billing)      │  │
│  │ ai_models    │ │              │ │                │  │
│  └──────────────┘ └──────────────┘ └────────────────┘  │
└─────────────────────────────────────────────────────────┘
          │                    │                │
          ▼                    ▼                ▼
   ┌──────────┐      ┌──────────────┐    ┌──────────┐
   │ Python   │      │  TypeScript  │    │ TypeScript│
   │ ai_core  │      │  @org/ai-core│    │ @org/ai-  │
   │ (module) │      │  (package)   │    │ core      │
   └──────────┘      └──────────────┘    └──────────┘
        │                   │                  │
        ▼                   ▼                  ▼
   ExpressRecruit      Scorecard          Sales Block
```

**What's Shared (Supabase):**
- `ai_usage_log` — Every AI call across all apps, all users
- `ai_api_keys` — BYOK encrypted keys (per-user, per-provider)
- `ai_credit_balances` — Managed credits per user/org
- `ai_models` — Model registry with pricing and capabilities

**What's Per-Language (Client Packages):**
- LLM provider API client (retries, streaming, error handling)
- Usage logging helper (writes to shared table)
- Key resolution (check BYOK first, fall back to managed)
- Cost calculation (token counts → USD based on model pricing)

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

Copy `.env.example` to `.env` and configure your API keys:

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
```

---

## Usage Examples

### TypeScript: Basic Chat

```typescript
import { chat } from '@org/ai-core';

const response = await chat({
  userId: 'user-uuid',
  appId: 'my-app',
  featureId: 'chat',
  model: 'claude-sonnet-4-20250514',
  messages: [
    { role: 'user', content: 'Hello, Claude!' }
  ]
});

console.log(response.content);
// Usage automatically logged to ai_usage_log
```

### TypeScript: OpenRouter Chat

```typescript
import { chat } from '@org/ai-core';

// Use any OpenRouter model (100+ available)
const response = await chat({
  userId: 'user-uuid',
  appId: 'my-app',
  featureId: 'chat',
  model: 'google/gemini-2.0-flash-001', // OpenRouter model
  messages: [
    { role: 'user', content: 'Explain quantum computing' }
  ]
});

console.log(response.content);
```

### TypeScript: Streaming

```typescript
import { chatStream } from '@org/ai-core';

const stream = chatStream({
  userId: 'user-uuid',
  appId: 'my-app',
  featureId: 'chat-stream',
  model: 'gpt-4o', // OpenAI model
  messages: [
    { role: 'user', content: 'Write a story about AI' }
  ]
});

for await (const chunk of stream) {
  if (chunk.delta.type === 'text_delta') {
    process.stdout.write(chunk.delta.text);
  }
}
```

### TypeScript: OpenRouter Streaming

```typescript
import { chatStream } from '@org/ai-core';

// Streaming works identically with OpenRouter models
const stream = chatStream({
  userId: 'user-uuid',
  appId: 'my-app',
  featureId: 'chat-stream',
  model: 'anthropic/claude-sonnet-4-20250514', // via OpenRouter
  messages: [
    { role: 'user', content: 'Analyze this data...' }
  ]
});

for await (const chunk of stream) {
  if (chunk.delta.type === 'text_delta') {
    process.stdout.write(chunk.delta.text);
  }
}
```

### TypeScript: BYOK (Bring Your Own Key)

```typescript
import { chat } from '@org/ai-core';

// User provides their own OpenRouter key
const response = await chat({
  userId: 'user-uuid',
  appId: 'my-app',
  featureId: 'chat',
  model: 'openai/gpt-4o',
  apiKey: 'sk-or-user-provided-key', // BYOK
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
});

// Usage logged with key_source='byok'
```

### Python: Basic Chat

```python
from ai_core.client import AIClient

client = AIClient()

response = client.chat(
    user_id='user-uuid',
    app_id='my-app',
    feature_id='chat',
    model_id='claude-sonnet-4-20250514',
    messages=[
        {'role': 'user', 'content': 'Hello, Claude!'}
    ]
)

print(response['content'])
# Usage automatically logged to ai_usage_log
```

### Python: OpenRouter Chat

```python
from ai_core.client import AIClient

client = AIClient()

# Use any OpenRouter model
response = client.chat(
    user_id='user-uuid',
    app_id='my-app',
    feature_id='chat',
    model_id='google/gemini-2.0-flash-001',  # OpenRouter model
    messages=[
        {'role': 'user', 'content': 'Explain quantum computing'}
    ]
)

print(response['content'])
```

### Python: Streaming

```python
from ai_core.client import AIClient

client = AIClient()

stream = client.chat_stream(
    user_id='user-uuid',
    app_id='my-app',
    feature_id='chat-stream',
    model_id='gpt-4o',  # OpenAI model
    messages=[
        {'role': 'user', 'content': 'Write a story about AI'}
    ]
)

for chunk in stream:
    if chunk['delta']['type'] == 'text_delta':
        print(chunk['delta']['text'], end='', flush=True)
```

### Python: OpenRouter Streaming

```python
from ai_core.client import AIClient

client = AIClient()

# Streaming works identically with OpenRouter models
stream = client.chat_stream(
    user_id='user-uuid',
    app_id='my-app',
    feature_id='chat-stream',
    model_id='meta-llama/llama-3.3-70b-instruct',  # via OpenRouter
    messages=[
        {'role': 'user', 'content': 'Analyze this data...'}
    ]
)

for chunk in stream:
    if chunk['delta']['type'] == 'text_delta':
        print(chunk['delta']['text'], end='', flush=True)
```

### Python: BYOK (Bring Your Own Key)

```python
from ai_core.client import AIClient

client = AIClient()

# User provides their own OpenRouter key
response = client.chat(
    user_id='user-uuid',
    app_id='my-app',
    feature_id='chat',
    model_id='openai/gpt-4o',
    api_key='sk-or-user-provided-key',  # BYOK
    messages=[
        {'role': 'user', 'content': 'Hello!'}
    ]
)

# Usage logged with key_source='byok'
```

---

## Model Registry & Auto-Sync

The system maintains a registry of available models in the `ai_models` table. This registry includes:

- Model ID (e.g., `google/gemini-2.0-flash-001`)
- Provider (anthropic, openai, openrouter)
- Display name
- Pricing (cost per input/output token)
- Capabilities (streaming, tools)
- Token limits (context, output)

### OpenRouter Auto-Sync

OpenRouter provides 100+ models, and new models are added frequently. The auto-sync function keeps your model registry up-to-date.

**TypeScript:**
```typescript
import { syncOpenRouterModels } from '@org/ai-core';

const result = await syncOpenRouterModels();
console.log(result);
// { inserted: 15, updated: 92, deactivated: 3 }
```

**Python:**
```python
from ai_core.sync import sync_openrouter_models

result = sync_openrouter_models(supabase_client)
print(result)
# {'inserted': 15, 'updated': 92, 'deactivated': 3}
```

**What it does:**
1. Fetches latest model list from `https://openrouter.ai/api/v1/models`
2. **Inserts** new models with `is_active=true`
3. **Updates** existing models with latest pricing and token limits
4. **Deactivates** models no longer available (`is_active=false`)
5. Returns summary of changes

**When to run:**
- On application startup (optional)
- Via scheduled job (daily/weekly)
- Manually when you want to refresh the model catalog

**Note:** Models with missing or zero pricing are skipped automatically.

---

## Testing

### TypeScript Tests

```bash
cd packages/ai-core
npx vitest run
```

Test coverage includes:
- ✅ Chat with all providers (Anthropic, OpenAI, OpenRouter)
- ✅ Streaming with all providers
- ✅ Key validation (BYOK)
- ✅ OpenRouter auto-sync
- ✅ Error mapping (401, 429, 5xx)
- ✅ Usage logging
- ✅ Cost calculation

### Python Tests

```bash
cd backend
python -m pytest ai_core/
```

Test coverage includes:
- ✅ Chat with all providers (Anthropic, OpenAI, OpenRouter)
- ✅ Streaming with all providers
- ✅ Provider detection from model registry
- ✅ OpenRouter auto-sync
- ✅ Usage logging with correct provider

---

## Database Schema

See full schema in `docs/SHARED_AI_LAYER_DESIGN.md`.

**Key tables:**
- `ai_models` — Model registry with pricing
- `ai_usage_log` — Every AI call logged
- `ai_api_keys` — BYOK encrypted keys
- `ai_credit_balances` — Managed credits per user

**Migrations:**
- `002_ai_layer_usage_and_models.sql` — Initial schema
- `007_openrouter_models.sql` — OpenRouter model seed data

---

## Configuration

### Provider Selection

The system automatically detects the provider from the model ID:

```typescript
// Provider detected from ai_models table
await chat({ model: 'claude-sonnet-4-20250514' }) // → anthropic
await chat({ model: 'gpt-4o' })                   // → openai
await chat({ model: 'google/gemini-2.0-flash-001' }) // → openrouter
```

### Key Resolution

Keys are resolved in this order:

1. **Explicit `apiKey` parameter** (BYOK)
2. **User's stored key** in `ai_api_keys` table (BYOK)
3. **Environment variable** (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`)

### OpenRouter Configuration

OpenRouter uses the OpenAI SDK with a custom `baseURL`:

```typescript
// TypeScript
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
# Python
OpenAI(
    api_key=key,
    base_url='https://openrouter.ai/api/v1'
)
```

---

## Cost Tracking

Every AI call is logged with:
- Tokens in/out
- Cost in USD
- Provider (anthropic, openai, openrouter)
- Model ID
- Key source (managed vs BYOK)

Query your costs:

```sql
-- Total spend by provider
SELECT provider, SUM(cost_usd) as total_cost
FROM ai_usage_log
WHERE user_id = 'your-user-uuid'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY provider;

-- OpenRouter spend breakdown
SELECT model, COUNT(*) as calls, SUM(cost_usd) as cost
FROM ai_usage_log
WHERE provider = 'openrouter'
  AND user_id = 'your-user-uuid'
GROUP BY model
ORDER BY cost DESC;
```

---

## Error Handling

The client maps provider-specific errors to standard error types:

| HTTP Status | Error Type | Description |
|------------|------------|-------------|
| 401 | `AUTHENTICATION_ERROR` | Invalid API key |
| 429 | `RATE_LIMIT_ERROR` | Too many requests |
| 5xx | `PROVIDER_ERROR` | Provider service issue |
| Network | `NETWORK_ERROR` | Connection failure |

All providers (Anthropic, OpenAI, OpenRouter) use this unified error mapping.

---

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and add tests
3. Run quality checks:
   ```bash
   cd packages/ai-core
   npx tsc --noEmit  # TypeScript typecheck
   npx vitest run    # Tests

   cd backend
   python -m pytest ai_core/  # Python tests
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
- Progress log: `progress.txt`

**OpenRouter Resources:**
- Docs: https://openrouter.ai/docs
- Model list: https://openrouter.ai/models
- API: https://openrouter.ai/api/v1/models
