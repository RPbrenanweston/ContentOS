# PRD: Add OpenRouter as LLM Provider

## Introduction

Add OpenRouter (openrouter.ai) as a third LLM provider to the Shared AI Layer, alongside Anthropic and OpenAI. OpenRouter provides a unified API gateway to 100+ models (Google Gemini, Meta Llama, Mistral, DeepSeek, Qwen, xAI Grok, etc.) through an OpenAI-compatible API — same SDK, same request/response format, just a different base URL (`https://openrouter.ai/api/v1`).

This also includes an auto-sync function that fetches available models from OpenRouter's `/api/v1/models` endpoint and upserts them into the `ai_models` registry, eliminating manual model maintenance.

**Key architectural insight:** OpenRouter uses the OpenAI API format. The existing `openai` npm/pip package works by setting `baseURL`. No new SDK dependencies needed.

## Goals

- Enable all 3 consuming apps (ExpressRecruitment, Scorecard, Sales Block) to use 100+ models via OpenRouter
- Maintain zero-maintenance model registry via auto-sync from OpenRouter's API
- Support full feature parity: chat, streaming, tools/function calling, BYOK keys
- Both TypeScript and Python clients updated
- No breaking changes to existing Anthropic/OpenAI functionality

## User Stories

### US-001: TypeScript — Add OpenRouter provider to chat()
**Description:** As a developer, I want to call OpenRouter models through the existing `chat()` method so that I can access 100+ models without new SDK dependencies.

**Acceptance Criteria:**
- [ ] `client.ts` chat() method handles `provider === 'openrouter'` from model registry
- [ ] OpenRouter branch creates an OpenAI client with `baseURL: 'https://openrouter.ai/api/v1'`
- [ ] Reuses existing OpenAI message formatting and tool transformation logic (extract shared helper if needed)
- [ ] Adds `HTTP-Referer` and `X-Title` headers per OpenRouter best practices
- [ ] Token counting and cost calculation work identically to existing providers
- [ ] Usage logging records `provider: 'openrouter'` correctly
- [ ] Credit pre-check and post-deduction work for managed keys
- [ ] Error mapping (401, 429, 5xx) works correctly for OpenRouter responses
- [ ] Provider type updated: `'anthropic' | 'openai' | 'openrouter'`
- [ ] Existing Anthropic and OpenAI tests still pass (no regressions)
- [ ] TypeScript compiles with zero errors

### US-002: TypeScript — Add OpenAI/OpenRouter streaming to chatStream()
**Description:** As a developer, I want streaming support for OpenAI and OpenRouter providers so that all three providers support real-time token streaming.

**Acceptance Criteria:**
- [ ] `chatStream()` no longer throws for non-Anthropic providers
- [ ] OpenAI streaming uses `client.chat.completions.create({ stream: true })` and maps to `ChatChunk` interface
- [ ] OpenRouter streaming uses same OpenAI streaming logic with custom `baseURL`
- [ ] `start_stream`, `text_delta`, and `stop_stream` chunk types emitted correctly
- [ ] Final token counts (`tokensIn`, `tokensOut`) captured from stream completion
- [ ] Usage logged on stream completion (fire-and-forget)
- [ ] Retry with backoff works for stream initialization
- [ ] Error handling maps OpenAI/OpenRouter errors to existing error types
- [ ] Existing Anthropic streaming tests still pass
- [ ] TypeScript compiles with zero errors

### US-003: TypeScript — OpenRouter key management
**Description:** As a developer, I want BYOK key support and key validation for OpenRouter so that users can bring their own OpenRouter API keys.

**Acceptance Criteria:**
- [ ] `resolveKey()` works with `provider: 'openrouter'` (no changes needed — already generic)
- [ ] `validateKey()` in `keys.ts` supports `'openrouter'` provider
- [ ] Validation makes a minimal API call to OpenRouter (e.g., list models endpoint or minimal chat)
- [ ] `OPENROUTER_API_KEY` environment variable used as managed fallback
- [ ] `.env.example` updated with `OPENROUTER_API_KEY=sk-or-your-key`
- [ ] BYOK save/delete/resolve cycle works end-to-end for openrouter
- [ ] TypeScript compiles with zero errors

### US-004: Python — Add provider branching for OpenAI and OpenRouter
**Description:** As a developer, I want the Python client to support all three providers (Anthropic, OpenAI, OpenRouter) so that Python apps have feature parity with TypeScript.

**Acceptance Criteria:**
- [ ] `openai` Python package added to dependencies (requirements.txt or pyproject.toml)
- [ ] `client.py` detects provider from model registry (currently hardcoded to 'anthropic')
- [ ] Anthropic branch preserved exactly as-is (no regressions)
- [ ] OpenAI branch creates `OpenAI(api_key=key)` client with standard message/tool formatting
- [ ] OpenRouter branch creates `OpenAI(api_key=key, base_url='https://openrouter.ai/api/v1')` client
- [ ] Tool/function calling format transformation works for OpenAI/OpenRouter
- [ ] Token counting extracts from OpenAI response format (`response.choices[0]`, `response.usage`)
- [ ] Cost calculation uses existing `calculate_cost()` function
- [ ] Usage logging records correct provider string
- [ ] Key resolution uses provider from model registry (not hardcoded 'anthropic')
- [ ] `OPENROUTER_API_KEY` environment variable used as managed fallback for openrouter
- [ ] All existing Python tests pass (no regressions)

### US-005: Python — Add streaming for OpenAI/OpenRouter
**Description:** As a developer, I want Python streaming support for OpenAI and OpenRouter providers so Python apps have full streaming parity.

**Acceptance Criteria:**
- [ ] `chat_stream()` in Python handles `openai` and `openrouter` providers
- [ ] Uses `openai` package streaming: `client.chat.completions.create(stream=True)`
- [ ] OpenRouter uses same logic with custom `base_url`
- [ ] Maps OpenAI stream chunks to existing `ChatChunk`/`ChatChunkDelta` types
- [ ] `start_stream`, `text_delta`, `stop_stream` emitted correctly
- [ ] Final token counts captured
- [ ] Usage logged on completion
- [ ] Existing Anthropic streaming preserved (no regressions)
- [ ] Key resolution uses provider from model registry (not hardcoded)

### US-006: SQL — Initial OpenRouter model seeding
**Description:** As a developer, I need seed data for popular OpenRouter models so that the system works immediately after migration.

**Acceptance Criteria:**
- [ ] New migration file: `007_openrouter_models.sql`
- [ ] Seeds 8-12 popular models spanning different providers and price tiers:
  - Budget: `google/gemini-2.0-flash-001`, `deepseek/deepseek-chat`
  - Mid-tier: `google/gemini-2.5-pro-preview`, `mistralai/mistral-large-latest`
  - Premium: `meta-llama/llama-3.1-405b-instruct`, `qwen/qwen-2.5-72b-instruct`
- [ ] Each model row includes: id, provider='openrouter', display_name, cost_per_input_token, cost_per_output_token, max_context_tokens, max_output_tokens, supports_streaming, supports_tools, is_default=false, is_active=true
- [ ] Pricing reflects OpenRouter's actual rates (from their /api/v1/models endpoint)
- [ ] Migration runs without errors on existing schema
- [ ] No existing model rows modified

### US-007: OpenRouter model auto-sync function (TypeScript)
**Description:** As a platform operator, I want a sync function that fetches all available models from OpenRouter's API and upserts them into the model registry so that new models appear automatically without manual maintenance.

**Acceptance Criteria:**
- [ ] New file: `sync.ts` (or added to `models.ts`)
- [ ] `syncOpenRouterModels(supabase: SupabaseClient)` function exported
- [ ] Fetches `GET https://openrouter.ai/api/v1/models` (no auth required for this endpoint)
- [ ] Maps OpenRouter response fields to `ai_models` table columns:
  - `id` -> model id (e.g., `google/gemini-2.0-flash-001`)
  - `pricing.prompt` -> `cost_per_input_token`
  - `pricing.completion` -> `cost_per_output_token`
  - `context_length` -> `max_context_tokens`
  - `top_provider.max_completion_tokens` -> `max_output_tokens`
  - `name` -> `display_name`
  - Provider is always `'openrouter'`
- [ ] Upserts: new models inserted, existing models updated (pricing, context length)
- [ ] Models removed from OpenRouter API get `is_active = false` (soft delete)
- [ ] Models with `pricing.prompt = "0"` or missing pricing are skipped or marked inactive
- [ ] Function returns summary: `{ inserted: number, updated: number, deactivated: number }`
- [ ] Handles API errors gracefully (network failure, rate limit)
- [ ] TypeScript compiles with zero errors

### US-008: OpenRouter model auto-sync function (Python)
**Description:** As a platform operator, I want the same model sync capability in Python so that Python-based admin tools can refresh the model registry.

**Acceptance Criteria:**
- [ ] New file: `sync.py` in `backend/ai_core/`
- [ ] `sync_openrouter_models(supabase)` function
- [ ] Same logic as TypeScript sync: fetch, map, upsert, deactivate
- [ ] Uses `httpx` or `requests` for the API call (add to dependencies)
- [ ] Returns summary dict: `{"inserted": N, "updated": N, "deactivated": N}`
- [ ] Handles API errors gracefully
- [ ] All existing Python tests pass

### US-009: TypeScript tests for OpenRouter
**Description:** As a developer, I need comprehensive tests for all OpenRouter functionality to ensure correctness and prevent regressions.

**Acceptance Criteria:**
- [ ] New test file: `openrouter-provider.test.ts`
- [ ] Tests for chat() with OpenRouter provider (mocked API responses)
- [ ] Tests verify OpenAI client created with correct `baseURL`
- [ ] Tests for streaming with OpenRouter provider
- [ ] Tests for key validation with OpenRouter
- [ ] Tests for model sync function (mocked API response)
- [ ] Tests for error mapping (401, 429, 5xx from OpenRouter)
- [ ] Tests verify BYOK key resolution works for 'openrouter' provider
- [ ] Tests verify usage logging records 'openrouter' as provider
- [ ] All tests pass with `vitest`
- [ ] Existing tests unaffected

### US-010: Python tests for OpenRouter
**Description:** As a developer, I need Python tests for all new OpenRouter functionality.

**Acceptance Criteria:**
- [ ] Tests for chat() with OpenAI provider (mocked)
- [ ] Tests for chat() with OpenRouter provider (mocked)
- [ ] Tests for streaming with OpenAI/OpenRouter (mocked)
- [ ] Tests for model sync function (mocked API response)
- [ ] Tests verify correct base_url used for OpenRouter
- [ ] Tests verify provider detection from model registry
- [ ] All tests pass with `pytest`
- [ ] Existing tests unaffected

### US-011: Documentation and config updates
**Description:** As a developer reading the README, I want to see OpenRouter documented alongside Anthropic and OpenAI so I know how to use it.

**Acceptance Criteria:**
- [ ] README.md updated: OpenRouter listed as third provider
- [ ] Architecture diagram updated to show 3 providers
- [ ] Usage examples added for OpenRouter (chat, streaming, BYOK)
- [ ] Auto-sync function documented with usage instructions
- [ ] `.env.example` includes `OPENROUTER_API_KEY`
- [ ] Model registry section mentions auto-sync capability
- [ ] No broken links or formatting issues

## Functional Requirements

- FR-1: OpenRouter API calls use the OpenAI SDK with `baseURL: 'https://openrouter.ai/api/v1'`
- FR-2: No new npm/pip SDK dependencies for OpenRouter (reuses `openai` package)
- FR-3: Provider is detected from `ai_models.provider` column — value `'openrouter'`
- FR-4: BYOK keys for OpenRouter stored/encrypted/resolved identically to Anthropic/OpenAI
- FR-5: Managed fallback key read from `OPENROUTER_API_KEY` environment variable
- FR-6: Model auto-sync fetches from `GET https://openrouter.ai/api/v1/models` (public endpoint, no auth needed)
- FR-7: Auto-sync upserts models and soft-deletes removed models (`is_active = false`)
- FR-8: All usage logging, credit checks, spending caps work identically for OpenRouter
- FR-9: Streaming uses OpenAI-compatible SSE format for both `openai` and `openrouter` providers
- FR-10: Tool/function calling transforms to OpenAI format for OpenRouter (same as existing OpenAI path)

## Non-Goals

- No OpenRouter-specific UI (model selection UI is app-level, not in the shared layer)
- No scheduled/cron auto-sync — sync function is callable on-demand only
- No OpenRouter OAuth or account management
- No Supabase Edge Function for sync (apps can call sync function directly)
- No changes to Stripe billing flow
- No changes to existing Anthropic or OpenAI behavior

## Technical Considerations

- **Base URL pattern:** `new OpenAI({ apiKey: key, baseURL: 'https://openrouter.ai/api/v1' })` — this is the entire integration trick
- **Shared helper extraction:** The OpenAI and OpenRouter branches share identical message/tool formatting. Extract a helper function to avoid duplication (DRY)
- **OpenRouter headers:** Best practice is to include `HTTP-Referer` (your app URL) and `X-Title` (app name) headers. These are optional but help OpenRouter track usage
- **Pricing format:** OpenRouter returns pricing as string per-token (e.g., `"0.000003"`). Parse carefully with the existing `safeParseFloat` pattern from `models.ts`
- **Free models:** Some OpenRouter models have `pricing.prompt = "0"`. Include them but with zero cost — users on BYOK keys get them free
- **Python `openai` package:** Already available as a pip package. Same base_url pattern: `OpenAI(api_key=key, base_url='https://openrouter.ai/api/v1')`
- **No new dependencies:** TypeScript already has `openai` in package.json. Python needs `openai` added and `httpx` or `requests` for the sync function

## Success Metrics

- All 3 providers (Anthropic, OpenAI, OpenRouter) work through `chat()` and `chatStream()`
- Auto-sync populates 50+ models from OpenRouter in one call
- Zero regressions on existing Anthropic/OpenAI tests
- TypeScript: zero compile errors
- Python: all tests pass
- BYOK flow works end-to-end for OpenRouter keys

## Open Questions

- Should we filter OpenRouter models during sync (e.g., skip models with no pricing, or models below a quality threshold)?
- Should we add a `provider_model_id` column to distinguish the OpenRouter wrapper ID from the underlying model ID?
- Do we want rate limiting on the sync function to prevent accidental rapid re-syncs?
