# Phase 1 — Code Quality Analysis Report

**Project:** shared-ai-layer
**Date:** 2026-02-28
**Scope:** Full codebase audit (TypeScript, Python, SQL, config, tests)
**Status:** AWAITING APPROVAL — no refactoring will occur until approved.

---

## Executive Summary

The shared-ai-layer is functionally sound but has **significant structural debt** that will cause refactoring loops if not addressed in the right order. The three highest-risk blockers are:

1. **~470 lines of duplicated provider logic** in `client.ts` (and ~400 lines in `client.py`) — every change to the API flow must be made in 6 places
2. **A critical bug** in `client.py:432` — wrong argument order in the streaming error handler will crash on any streaming error
3. **15 placeholder tests** (`expect(true).toBe(true)`) giving false confidence in retry logic and BYOK flows

---

## 1. Top DRY Violations

### 1.1 CRITICAL: Provider Branching Duplication (client.ts)

**Locations:** `client.ts` lines 190-301 (chat), lines 400-670 (chatStream)
**Impact:** ~470 lines of near-identical code repeated 3x per method (Anthropic, OpenAI, OpenRouter)

Each provider branch does the same thing with minor variations:
- Create SDK client
- Format messages
- Build request params
- Add tools if present
- Make API call with retry
- Extract token counts
- Extract content

**OpenAI and OpenRouter branches are 95% identical** — only the client constructor differs (`baseURL` + headers).

**Recommended abstraction:**
```typescript
interface ProviderAdapter {
  createClient(key: string): any;
  formatRequest(params: ChatParams, model: ModelInfo): ProviderRequest;
  parseResponse(response: any): { content: string; tokensIn: number; tokensOut: number };
  parseStreamChunk(chunk: any): ChatChunk | null;
}
```

**Effort:** Medium — extract 3 adapter classes, reduce client.ts by ~350 lines.

---

### 1.2 HIGH: Supabase Period Query Repeated 8+ Times (billing.ts)

**Locations:** `billing.ts` lines 68-75, 119-126, 187-194, 204-211, 279-286, 295-302, 517-526
**Pattern:** Every credit/spending/balance query repeats:
```typescript
supabase.from('ai_credit_balances').select('*')
  .eq('user_id', userId).is('org_id', null)
  .lte('period_start', now.toISOString())
  .gt('period_end', now.toISOString())
  .maybeSingle();
```

**Recommended abstraction:**
```typescript
function getActiveBalance(userId: string, orgId: string | null, supabase): Promise<BalanceRow | null>
```

**Effort:** Low — extract one helper, replace 8 call sites.

---

### 1.3 HIGH: Error Mapping Logic Duplicated (client.ts)

**Locations:** `client.ts` lines 339-377 (chat catch), lines 671-720 (chatStream catch)
**Pattern:** Identical status→errorCode mapping (`401→AUTHENTICATION_ERROR`, `429→RATE_LIMIT`, etc.) and identical logUsage+throw logic.

**Recommended abstraction:**
```typescript
function classifyError(error: unknown): { code: string; aiError: AIError }
```

**Effort:** Low — extract one function, use in both methods.

---

### 1.4 MEDIUM: Same Python Duplication (client.py)

**Locations:** `client.py` lines 57-170 (chat), lines 292-400 (streaming)
**Same problem** as TypeScript but also has:
- Inconsistent Supabase API: `models.py` uses `.table()`, `keys.py` uses `.from_()`
- No shared message formatting helpers (TypeScript has `formatOpenAIMessages`, `formatOpenAITools`)

**Effort:** Medium — mirrors TypeScript refactoring.

---

## 2. Architecture Issues

### 2.1 HIGH: Mixed Responsibilities in AIClientImpl

**File:** `client.ts`, `AIClientImpl` class
**Problem:** The `chat()` method (224 lines) handles 7 concerns:

| Concern | Lines | Should Be |
|---------|-------|-----------|
| Model resolution | 162-163 | Stays in client |
| Key resolution | 169 | Stays in client |
| Credit pre-check | 172-183 | Billing middleware |
| Provider dispatch | 190-301 | Provider adapters |
| Result assembly | 303-338 | Stays in client |
| Usage logging | 307-320 | Stays (fire-and-forget) |
| Credit deduction | 323-327 | Billing middleware |

Extracting provider adapters and a billing coordinator would reduce `chat()` to ~50 lines of orchestration.

---

### 2.2 HIGH: Fire-and-Forget Credit Deduction

**File:** `client.ts` line 323-327
```typescript
void Promise.resolve(deductCredits(params.userId, costUsd, this.supabase))
  .then(() => {})
  .catch((err) => console.warn('Failed to deduct credits:', err));
```

**Risk:** If deductCredits fails (DB error), the user was charged by the provider but their balance wasn't decremented. This is a **data consistency bug** — credits leak silently. The TypeScript retry utility exists but is not used here.

---

### 2.3 HIGH: Tight Coupling to Supabase Client

Every function signature requires `supabase: SupabaseClient` as a parameter. This makes:
- Unit testing require complex mock chains (60+ lines per test)
- Swapping the data layer impossible
- Every function aware of persistence concerns

**Recommendation:** Create a `DataLayer` interface with methods like `getModel()`, `getBalance()`, `logUsage()`. Pass interface instead of raw Supabase.

---

### 2.4 MEDIUM: Python Billing Entirely Stubbed

**File:** `billing.py` — both functions raise `NotImplementedError`
**Impact:** Python client operates without credit checks. Users on the Python path can exceed spending caps. This is acceptable if Python consumers are all internal, but it's an architectural gap that must be tracked.

---

## 3. Error Handling Gaps

### 3.1 CRITICAL BUG: Wrong Argument Order in Python chat_stream()

**File:** `client.py` line 432
```python
key_result = resolve_key(self.supabase, params.user_id, provider)  # WRONG ORDER
```

**Correct signature** (keys.py line 220): `resolve_key(user_id, provider, supabase)`
**Also missing:** `await` keyword (function is async).

**Impact:** Any streaming error triggers a secondary crash in the error handler, masking the original error. This is a **blocker for refactoring** — must fix first.

---

### 3.2 HIGH: Silent Failures Swallowing Critical Data

| Location | What's Swallowed | Risk |
|----------|-----------------|------|
| `client.ts:323-327` | Credit deduction failure | Credits leak |
| `client.ts:307-320` | Usage logging failure | Billing data lost |
| `billing.ts:382-389` | Stripe customer ID storage | Duplicate Stripe customers |
| `billing.ts:52-55` | getUserOrgId DB error | Org users treated as solo |
| `usage.ts:57-59` | Usage insert failure | Usage not tracked |

All use `console.warn()` — no metrics, no alerting, no retry.

---

### 3.3 MEDIUM: Bare Except Clauses in Python

**File:** `client.py` lines 238, 427, 434
```python
except:
    provider = 'unknown'
```

Catches `KeyboardInterrupt`, `SystemExit`, and all other exceptions. Should use `except Exception:` at minimum.

---

### 3.4 MEDIUM: Inconsistent UTC Handling in Python

- `usage.py:66` uses `datetime.utcnow()`
- `keys.py:143` uses `datetime.now()`

These produce different timestamps. Should standardize on `datetime.now(timezone.utc)`.

---

## 4. Testing Gaps

### 4.1 CRITICAL: 15 Placeholder Tests

**Files and lines:**
- `client.test.ts` lines 165-209: 7 retry logic tests that all do `expect(true).toBe(true)`
- `byok.test.ts` (integration) lines 40-95: 5 placeholders
- `test_byok_integration.py` lines 47-157: 3 placeholders

**Risk:** These give green checkmarks while testing nothing. Retry logic — one of the most important reliability features — has **zero actual test coverage**.

---

### 4.2 HIGH: Supabase Mock Duplicated 12+ Times

Every test file builds its own 30-90 line mock chain. No shared fixture exists.

**Files with near-identical mocks:**
`client.test.ts`, `integration.test.ts`, `openai-provider.test.ts`, `openrouter-provider.test.ts`, `org-billing.test.ts`, `phase3-integration.test.ts`, `spending-caps.test.ts`, `webhook.test.ts`, `stripe.test.ts`, `keys.test.ts`, `billing.test.ts`, `key-management.test.ts`

**Impact:** Adding a new Supabase table or column requires updating 12+ mock setups. This is a **major refactoring blocker** — any structural change to queries will break all test mocks.

---

### 4.3 HIGH: No Streaming Tests That Consume Streams

`integration.test.ts` lines 240-275 creates a stream mock but doesn't verify:
- Incremental delivery of chunks
- Token accumulation
- Error mid-stream
- Stream cancellation

---

### 4.4 MEDIUM: 2 Skipped Tests Never Fixed

`openrouter-provider.test.ts` lines 498, 533: Tests marked `.skip` for key validation. Should be fixed or removed.

---

## 5. Complexity Hotspots

| File | Function/Class | Lines | Cyclomatic Complexity | Issue |
|------|---------------|-------|-----------------------|-------|
| `client.ts` | `chat()` | 224 | High (3 provider branches + error paths) | Extract provider adapters |
| `client.ts` | `chatStream()` | 337 | High (same pattern) | Extract provider adapters |
| `billing.ts` | `checkSpendingCap()` | 83 | High (org/user + cap combinations) | Extract balance query |
| `billing.ts` | `handleStripeWebhook()` | 95 | Medium (insert/update + org/user) | Extract balance upsert |
| `client.py` | `chat()` | 231 | High (same as TS) | Same fix needed |
| `client.py` | `chat_stream()` | 195 | High (same as TS) | Same fix needed |

---

## 6. Database Migration Issues

### 6.1 HIGH: Missing Indexes for Common Queries

`ai_usage_log` (migration 002) is missing compound indexes for the queries the billing and analytics code actually runs:
- `(model, created_at)` — usage by model
- `(provider, created_at)` — usage by provider
- `(app_id, feature_id, created_at)` — per-feature analytics

`ai_credit_balances` (migration 004) has no CHECK constraints:
- `credits_remaining_usd` can go negative (no `CHECK >= 0`)
- `spending_cap_usd` can be negative
- `period_end > period_start` not enforced

### 6.2 MEDIUM: Duplicated Trigger Functions

The `updated_at` trigger function is copy-pasted across 3 migrations (001, 003, 004) with different names but identical logic. Should be a single shared function in migration 001.

### 6.3 LOW: Hardcoded Count Validation

Migration 007 line 156: `IF openrouter_count != 8` — breaks idempotency if run after any model insertions.

---

## 7. Tooling & Infrastructure Gaps

### 7.1 Missing Automation

| Tool | Status | Impact |
|------|--------|--------|
| Linting (ESLint/Biome) | Not configured | No code style enforcement |
| Formatting (Prettier) | Not configured | Inconsistent formatting |
| Pre-commit hooks (Husky) | Not configured | Bad code can be committed |
| `lint` script | Broken in root package.json (just runs tsc) | Can't run in CI |
| `format` script | Missing from package.json | Can't autoformat |
| Python linting (ruff) | Not configured | No Python style enforcement |
| Python formatting (black) | Not configured | Inconsistent Python formatting |
| CI/CD config | Not present | No automated checks on PR |
| Test coverage thresholds | Not configured | Coverage can silently drop |

### 7.2 Dependency Version Mismatches

- Root vitest `^3.0.0` vs ai-core vitest `^1.6.0` — **major version conflict**
- Root `@types/node ^25.3.0` vs ai-core `@types/node ^22.0.0`
- Root TypeScript `^5.7.0` vs ai-core TypeScript `^5.5.0`

### 7.3 tsconfig Flags

- `noUnusedLocals: false` and `noUnusedParameters: false` allow dead code to accumulate
- Missing `noUncheckedIndexedAccess` — risky for object property access

### 7.4 Type Safety

13+ instances of `any` in `client.ts` alone. `requestParams: any` on every provider call means type checking is effectively disabled for API requests.

---

## 8. Refactoring Effort Estimate

### Refactoring Order (Dependency-Aware)

**The key insight: test infrastructure must be fixed BEFORE production code**, otherwise every refactoring step breaks 12+ mock setups causing refactoring loops.

| # | Task | Effort | Blocks | Risk if Skipped |
|---|------|--------|--------|-----------------|
| 1 | Fix Python `client.py:432` bug + bare excepts + UTC | Low | Nothing | Crashes mask errors |
| 2 | Create shared test fixtures (`test-utils.ts`) | Low | Steps 4-8 | Every refactor breaks 12+ test files |
| 3 | Fix/remove 15 placeholder tests | Low | Steps 4-8 | False confidence in retry & BYOK |
| 4 | Extract provider adapter pattern (TS) | Medium | Steps 5-6 | 470 lines of duplication block all changes |
| 5 | Extract billing query helper (`getActiveBalance`) | Low | Step 6 | 8 duplicate call sites |
| 6 | Extract error classification function | Low | Nothing | Inconsistent error mapping |
| 7 | Add ESLint + Prettier + scripts + fix dep versions | Low | Nothing | Style drift, version conflicts |
| 8 | Eliminate `any` types in client.ts | Medium | Nothing | Type safety holes |
| 9 | Python: mirror provider adapters + add retry logic | Medium | Nothing | Reliability & parity gap |
| 10 | Python: standardize Supabase API (`.table()` vs `.from_()`) | Low | Nothing | Inconsistent queries |

### Potential Refactoring Loops (Blockers)

**Loop 1: Provider Refactoring → Test Breakage → Mock Rebuilding**
If we refactor `client.ts` provider logic before extracting shared test mocks, every test file's 60-line mock setup breaks. We'd spend more time fixing tests than refactoring code.
**Prevention:** Do Step 2 (shared test fixtures) BEFORE Step 4 (provider adapters).

**Loop 2: Billing Query Changes → 8 Call Sites → Inconsistency**
Changing the Supabase query pattern in one place but forgetting the other 7 creates subtle bugs.
**Prevention:** Do Step 5 (extract helper) as a single atomic change.

**Loop 3: Error Handling Changes → Placeholder Tests Pass → Real Bugs Hidden**
Placeholder tests always pass, so we'd think error handling refactoring worked when it hasn't been tested.
**Prevention:** Do Step 3 (fix placeholders) BEFORE any error handling work.

**Loop 4: Type Elimination → Provider Refactoring Undone**
If we try to eliminate `any` types before the provider adapter extraction, we'd be typing the duplicated code. Then when we extract adapters, we'd redo all the type work.
**Prevention:** Do Step 4 (provider adapters) BEFORE Step 8 (eliminate `any`).

---

## Summary: Issue Count by Severity

| Severity | Count | Key Items |
|----------|-------|-----------|
| CRITICAL | 4 | Python bug (client.py:432), provider duplication, placeholder tests, fire-and-forget credit deduction |
| HIGH | 10 | Silent failures (5 locations), Supabase query duplication (8x), mock duplication (12 files), missing streaming tests, dependency version conflicts |
| MEDIUM | 8 | Bare excepts, UTC inconsistency, skipped tests, missing indexes, duplicated SQL triggers, `any` types |
| LOW | 4 | Hardcoded migration count, tsconfig flags, missing test coverage thresholds |

---

## Approval Checkpoint

**No refactoring will begin until you approve this analysis.**

The recommended execution order is specifically designed to prevent loops:

```
Fix bugs → Test infrastructure → Provider extraction → Billing helpers → Error handling → Tooling → Types → Python parity
```

Each step is safe to commit independently. No step depends on a later step. The total refactoring touches ~15 files across 10 incremental commits.
