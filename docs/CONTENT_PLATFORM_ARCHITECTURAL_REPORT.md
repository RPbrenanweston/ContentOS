# Content Platform — Architectural Report & Security Assessment

**Date:** 2026-03-24
**Scope:** Full codebase audit via breadcrumb metadata analysis (125 files)
**Method:** Schema C breadcrumb embedding + Opus-level architectural audit
**Status:** Pre-production — no live deployment

---

## 1. Executive Summary

This report synthesizes findings from a comprehensive breadcrumb-based architectural audit of the content platform. 125 eligible source files were instrumented with Schema C metadata documenting intent, I/O contracts, hazards, and dependency edges. Two independent Opus-level audits then evaluated every breadcrumb for quality, completeness, and architectural implications.

**Key findings:**

- **Critical security gap:** Zero authentication on all 24 API routes across both applications. Any HTTP client can read, write, and delete all data.
- **3 root causes** explain the majority of the 30+ individual findings: no middleware layer, no transactional boundaries, no observability infrastructure.
- **28 stories** organized into 5 workstreams resolve all identified issues.
- **The codebase is architecturally sound** in its domain modeling, service abstractions, and platform adapter patterns. The gaps are in cross-cutting infrastructure that hasn't been built yet.

**Recommendation:** Address authentication (Workstream 1) before any feature development. Every other improvement is meaningless if the API surface is unprotected.

---

## 2. System Architecture Overview

### 2.1 Application Structure

| App | Location | Framework | Port | Purpose |
|-----|----------|-----------|------|---------|
| Content OS | `apps/content-os/` | Next.js 15 + React 19 | 3000 | Longform writing, AI decomposition, multi-platform distribution |
| Studio | `apps/studio/` | Next.js 15 + React 19 | 3100 | Video console, annotation logbook, clip assembly |
| Shared AI Layer | `packages/ai-core/` | TypeScript | — | Multi-provider LLM, billing, BYOK key management |
| Backend | `backend/` | Python (FastAPI) | — | Social media scheduling, AI core mirror |

### 2.2 Infrastructure

| Component | Status | Location |
|-----------|--------|----------|
| Supabase (self-hosted) | Docker Compose configured | `infra/supabase/` |
| FreeFlow (voice transcription) | Docker Compose configured | `infra/freeflow/` |
| PostgreSQL | 13 migrations (001-013) | `supabase/migrations/` |
| CI/CD | GitHub Actions (TS + Python) | `.github/workflows/ci.yml` |

### 2.3 Data Model

```
content_nodes (blog/video/audio)
  └── content_segments (hooks, quotes, stories, stats, CTAs)
       └── derived_assets (social_post, clip, carousel, thread)
            └── distribution_jobs (pending → published)
                 └── performance_metrics (engagement data)

distribution_accounts (LinkedIn, X — OAuth credentials)
publishing_queues → queue_slots (recurring cadence)
profiles (multi-brand identity)

studio_videos → studio_breadcrumbs → studio_compilations
organizations → org_members (team billing)
ai_usage_log, ai_api_keys, ai_credit_balances, ai_models
```

---

## 3. Security Assessment

### 3.1 CRITICAL: Authentication Void

**Severity:** CRITICAL
**Scope:** All 24 API routes across both applications
**Evidence:** Every API route breadcrumb documents "no auth check" as a hazard. Multiple routes use hardcoded `userId = '00000000-0000-0000-0000-000000000000'`.

**Affected routes (Content OS — 13 routes):**

| Route | Risk |
|-------|------|
| `POST /api/content` | Anyone can create content |
| `GET/PATCH/DELETE /api/content/[id]` | Anyone can read/modify/delete any content |
| `POST /api/content/[id]/process` | Anyone can trigger AI decomposition (costs money) |
| `GET /api/content/[id]/segments` | Anyone can read decomposed segments |
| `GET/POST /api/assets` | Anyone can generate AI assets (costs money) |
| `GET/PATCH/DELETE /api/assets/[id]` | Anyone can access any asset |
| `GET/POST /api/distribution/accounts` | Anyone can read OAuth credentials |
| `GET /api/distribution/jobs` | Anyone can read publishing history |
| `POST /api/distribution/publish` | Anyone can publish to connected accounts |
| `GET /api/analytics` | Anyone can read engagement data |
| `POST /api/analytics/sync` | Anyone can trigger analytics sync |
| `POST /api/media/upload` | Anyone can upload files to storage |
| `POST /api/media/clip` | Anyone can trigger FFmpeg processing (resource exhaustion) |

**Affected routes (Studio — 11 routes):**

| Route | Risk |
|-------|------|
| `GET/POST /api/videos` | Anyone can list/create videos |
| `GET/PATCH/DELETE /api/videos/[videoId]` | Anyone can access any video |
| `GET/POST /api/videos/[videoId]/breadcrumbs` | Anyone can annotate any video |
| `PATCH/DELETE /api/videos/[videoId]/breadcrumbs/[id]` | Anyone can modify annotations |
| `GET/POST /api/videos/[videoId]/compilations` | Anyone can create compilations |
| `GET/PATCH/DELETE /api/videos/[videoId]/compilations/[id]` | Anyone can access compilations |
| `POST /api/upload` | Anyone can upload video files |
| `GET /api/jobs/[jobId]` | Anyone can read job status |
| `GET/POST /api/outputs` | Anyone can access rendered outputs |

**Impact:** Without authentication, a malicious actor could:
1. Read all content, videos, and analytics data
2. Delete all content and assets
3. Publish arbitrary content to connected social accounts
4. Trigger unlimited AI processing (billing impact)
5. Upload malicious files to storage
6. Exhaust server resources via FFmpeg/media processing

**Remediation:** See Workstream 1 (stories 1-6).

---

### 3.2 HIGH: Information Leakage in Error Responses

**Severity:** HIGH
**Scope:** 7+ API routes
**Evidence:** Breadcrumbs on API routes document that error responses expose internal implementation details.

**Examples found:**
- Zod validation errors expose schema structure
- FFmpeg errors expose file system paths
- Supabase errors expose table names and column structures
- Service errors expose internal class names and stack traces

**Impact:** An attacker can map internal architecture by intentionally triggering errors. This reduces the cost of discovering exploitable paths.

**Remediation:** Story 2 (API wrapper with sanitized error responses).

---

### 3.3 HIGH: SSRF via Media Processing

**Severity:** HIGH
**Scope:** `apps/content-os/src/app/api/media/clip/route.ts`
**Evidence:** Breadcrumb hazard documents that the clip extraction endpoint accepts user-supplied URLs passed to FFmpeg without validation.

**Attack vector:** An attacker could supply `source_url=http://169.254.169.254/latest/meta-data/` to read cloud metadata endpoints via FFmpeg, or use internal network URLs to scan infrastructure.

**Remediation:** Validate `source_url` against an allowlist of domains. Reject private IP ranges and metadata endpoints. Apply URL scheme validation (https only).

---

### 3.4 HIGH: OAuth Token Storage

**Severity:** HIGH
**Scope:** `apps/content-os/src/infrastructure/supabase/repositories/distribution-account.repo.ts`
**Evidence:** Breadcrumb hazard documents "unencrypted tokens" — OAuth access/refresh tokens stored in Supabase without encryption at rest.

**Impact:** A database breach exposes all users' social media OAuth tokens, allowing unauthorized posting to their LinkedIn and X accounts.

**Remediation:** Encrypt OAuth tokens before storage using the same AES-256-GCM pattern already used for BYOK API keys in `packages/ai-core/`.

---

### 3.5 HIGH: Service Key Exposure in Browser

**Severity:** HIGH
**Scope:** `apps/content-os/src/infrastructure/supabase/client.ts`
**Evidence:** Breadcrumb hazard documents that `createServiceClient()` uses the Supabase service role key, which bypasses Row Level Security. If this function is accidentally called from client-side code, the key is exposed in browser network requests.

**Impact:** Service role key in the browser gives full database access bypassing all RLS policies.

**Remediation:** Move `createServiceClient()` to a server-only module (enforce via Next.js `server-only` package). Add runtime check that throws if called from browser context.

---

### 3.6 MEDIUM: Kong API Gateway Key Exposure

**Severity:** MEDIUM
**Scope:** `infra/supabase/volumes/api/kong.yml`
**Evidence:** Breadcrumb hazard documents `hide_credentials: false` — API keys passed in headers are logged and visible in network tools.

**Remediation:** Set `hide_credentials: true` on all Kong key-auth plugins. Move consumer keys to environment variables.

---

### 3.7 MEDIUM: No Rate Limiting

**Severity:** MEDIUM
**Scope:** All API routes
**Evidence:** Environment variables for rate limiting exist in `.env.example` but no middleware implements them.

**Impact:** Resource exhaustion via repeated AI processing requests, media uploads, or FFmpeg operations. Financial impact via unbounded AI API calls billed per token.

**Remediation:** Story 3 (rate limiting middleware).

---

### 3.8 MEDIUM: Weak Randomness in File Paths

**Severity:** MEDIUM
**Scope:** `apps/content-os/src/app/api/media/upload/route.ts`
**Evidence:** Breadcrumb hazard documents `Math.random()` used for upload path generation. This is cryptographically predictable.

**Remediation:** Replace `Math.random()` with `crypto.randomUUID()` for upload path generation.

---

### 3.9 MEDIUM: RLS Policies Overly Permissive

**Severity:** MEDIUM
**Scope:** Supabase migrations 001-009
**Evidence:** Content OS audit documents that RLS policies use generic `auth.role() = 'authenticated'` — any authenticated user can access any other user's data.

**Remediation:** Story 28 — tighten RLS to `auth.uid() = user_id` per-row.

---

### 3.10 LOW: Script Credential Exposure

**Severity:** LOW
**Scope:** `infra/scripts/generate-keys.sh`, `infra/scripts/run-migrations.sh`
**Evidence:** Breadcrumb hazards document that generated keys appear in shell history, and database URLs with passwords are passed as command arguments visible in process lists.

**Remediation:** Redirect sensitive output to files with `chmod 600`. Use environment variables instead of command arguments for credentials.

---

## 4. Architectural Gap Analysis

### 4.1 Gaps Surfaced by Breadcrumbs

| Gap | Evidence Source | Severity | Impact |
|-----|---------------|----------|--------|
| **No auth middleware** | All 24 API route crumbs | CRITICAL | All data exposed |
| **No error boundaries** | 4 layout file crumbs | HIGH | Single component crash takes down entire view |
| **No state persistence** | 5 component crumbs | HIGH | Browser crash loses all in-progress work |
| **No pagination** | 6 list endpoint crumbs | HIGH | Memory exhaustion on large datasets |
| **Non-atomic operations** | workers.ts, segment repo, publish crumbs | HIGH | Partial failures leave corrupted data |
| **Unbounded retries** | pg-boss, distribution job crumbs | MEDIUM | Failed jobs retry indefinitely |
| **DST/timezone fragility** | queue entity + service crumbs | MEDIUM | Scheduled posts fire at wrong times across DST |
| **No monitoring** | No crumbs cover observability | MEDIUM | Silent failures invisible in production |
| **Queue API missing** | queue/page.tsx edges to nonexistent routes | MEDIUM | Queue UI has no backend |
| **OAuth callbacks missing** | LinkedIn + X adapter crumbs reference incomplete flow | MEDIUM | Can't complete OAuth connection |
| **No env validation** | supabase/client.ts uses `process.env.X!` | LOW | App crashes with cryptic error on missing config |
| **Stale media URLs** | asset repo + storage interface crumbs | LOW | Broken images/videos after CDN expiration |

### 4.2 Cross-App Architectural Gaps

| Gap | Impact |
|-----|--------|
| **Zero edges between Studio and Content OS** | The relationship between video editing (Studio) and content distribution (Content OS) is entirely undocumented. The pipeline for video → transcript → decomposition → shortform is the core product value but has no architectural documentation. |
| **Shared Supabase undocumented** | Both apps connect to the same Supabase instance but no breadcrumb captures this shared dependency. Schema changes in one app can break the other. |
| **FreeFlow not integrated** | FreeFlow voice transcription infrastructure exists but no pipeline connects it to Content OS transcript service. |
| **Backend Python not linked** | Python AI core and social media scheduler have no documented relationship to the frontend apps. |

---

## 5. Roadmap

### 5.1 Workstream Summary

| # | Workstream | Stories | Priority | Resolves |
|---|-----------|---------|----------|----------|
| 1 | **API Middleware & Security** | 1-6 | P0 | Auth void, error leakage, rate limiting, SSRF, token encryption |
| 2 | **Data Integrity** | 7-12 | P1 | Transactions, bounded retry, pagination, validation, cleanup |
| 3 | **Observability & Resilience** | 13-18 | P1 | Logging, health checks, error boundaries, state persistence |
| 4 | **Breadcrumb Quality** | 19-24 | P0 | Orphaned edges, duplicates, format consistency |
| 5 | **Missing Components** | 25-28 | P2 | Queue backend, OAuth callbacks, lineage service, RLS |

### 5.2 Detailed Stories

#### Workstream 1: API Middleware & Security (P0)

| # | Story | Description | Security Finding |
|---|-------|-------------|-----------------|
| 1 | Auth middleware | Next.js `middleware.ts` validating Supabase JWT on all `/api/*` routes. Inject `userId` from token into request context. Apply to both Content OS and Studio. | Fixes 3.1 (auth void) |
| 2 | API route wrapper | `withApiHandler()` wrapper providing: sanitized error responses (no internal details), Zod request validation, structured response format, request correlation ID logging | Fixes 3.2 (info leakage) |
| 3 | Rate limiting | Token bucket middleware per user per endpoint. AI processing routes get stricter limits. Configurable via env vars. | Fixes 3.7 (no rate limiting) |
| 4 | SSRF prevention | URL validation on media clip endpoint — allowlist domains, reject private IP ranges, enforce HTTPS scheme. Replace `Math.random()` with `crypto.randomUUID()` for upload paths. | Fixes 3.3 (SSRF), 3.8 (weak random) |
| 5 | Token encryption | Encrypt OAuth tokens before storage using AES-256-GCM (same pattern as ai-core BYOK). Add `server-only` enforcement on service client. Fix Kong `hide_credentials`. | Fixes 3.4 (token storage), 3.5 (service key), 3.6 (Kong keys) |
| 6 | Route migration | Apply `withApiHandler()` + auth context to all 24 API routes. Remove hardcoded userId. Add proper error sanitization. | Applies fixes across all routes |

#### Workstream 2: Data Integrity (P1)

| # | Story | Description |
|---|-------|-------------|
| 7 | Transaction helper | Supabase transaction wrapper for multi-table operations (workers delete+create, segment bulk insert, multi-platform publish) |
| 8 | Bounded retry | pg-boss max retry count (5), exponential backoff, dead letter queue for permanently failed jobs |
| 9 | Pagination | `limit`/`offset` with max page size (100) on all list endpoints (content, segments, jobs, analytics, queue) |
| 10 | Clip validation | Zod refinement: `endMs > startMs`, positive `maxLength`, sane duration bounds on clip extraction schema |
| 11 | Media cleanup | Background job identifying orphaned storage URLs (media without live references) and marking for deletion |
| 12 | DST-safe scheduling | Timezone-aware scheduling with IANA timezone validation. Handle DST transitions for queue slot timing. |

#### Workstream 3: Observability & Resilience (P1)

| # | Story | Description |
|---|-------|-------------|
| 13 | Structured logging | Shared pino logger with JSON output, request ID correlation. Replace all `console.warn`. |
| 14 | Health checks | `/api/health` per app checking DB, queue, storage. Returns 200/503. |
| 15 | Env validation | Zod schema validating all required env vars at startup. Fail fast on missing config. |
| 16 | Error boundaries | React error boundaries around each major layout with recovery UI. |
| 17 | State persistence | IndexedDB auto-save for in-progress Studio work (annotations, clips, assembly). Restore on reload. |
| 18 | Error tracking | Sentry integration capturing unhandled errors, API failures, queue job failures with context. |

#### Workstream 4: Breadcrumb Quality (P0 — quick wins)

| # | Story | Description |
|---|-------|-------------|
| 19 | Fix orphaned edges | Update 11 broken file references (publish→derived-asset.repo, jobs→distribution-job.repo, process→decomposition.service, etc.) |
| 20 | Remove duplicate blocks | Dedup crumbs in logbook/demo, assembly/demo, archive pages |
| 21 | Fix semantic edges | CaptureButton→MasterTimecode (RELATES not CALLS), remove MasterTimecode→WaveformTimeline |
| 22 | Standardize format | Convert JSDoc-style crumbs to line-comment style |
| 23 | Fix area codes | Change 4 service interfaces from DAT to DOM |
| 24 | Cross-app edges | Add Studio ↔ Content OS integration edges, FreeFlow → transcript service edges |

#### Workstream 5: Missing Components (P2)

| # | Story | Description |
|---|-------|-------------|
| 25 | Queue API routes | Create `/api/queue` and `/api/queue/slots` endpoints referenced by queue/page.tsx |
| 26 | OAuth callbacks | Create callback handlers for LinkedIn and X OAuth flows |
| 27 | Content lineage service | Dedicated service tracking original → derivative content relationships |
| 28 | RLS tightening | Audit and update RLS policies to `auth.uid() = user_id` per-row scoping |

### 5.3 Execution Timeline

```
WEEK 1 — Security Foundation
  Stories 19-24  Breadcrumb fixes (fast, unblocks everything)
  Stories 1-2    Auth middleware + API wrapper (the critical fix)

WEEK 2 — Security Hardening
  Stories 3-5    Rate limiting, SSRF prevention, token encryption
  Story 6        Migrate all 24 routes to use middleware

WEEK 3 — Data Integrity + Observability
  Stories 7-9    Transactions, bounded retry, pagination
  Stories 13-15  Logging, health checks, env validation

WEEK 4 — Resilience + Completeness
  Stories 10-12  Validation, media cleanup, DST scheduling
  Stories 16-18  Error boundaries, state persistence, Sentry

WEEK 5 — Feature Completion
  Stories 25-28  Queue routes, OAuth callbacks, lineage, RLS
```

---

## 6. Breadcrumb Audit Statistics

| Metric | Value |
|--------|-------|
| Total eligible files | 125 |
| Files with breadcrumbs | 125 (100%) |
| Excluded files (barrel exports + config) | 8 |
| Schema C field compliance | 100% (all 7 required fields present) |
| Files with STRONG hazards | 68% |
| Files with ADEQUATE hazards | 32% |
| Files with WEAK hazards | 0% |
| Orphaned edge targets | 11 (to be fixed in story 19) |
| Duplicate crumb blocks | 3 (to be fixed in story 20) |
| Incorrect area codes | 4 (to be fixed in story 23) |
| Semantically wrong edges | 3 (to be fixed in story 21) |
| Security findings (CRITICAL) | 1 (auth void) |
| Security findings (HIGH) | 5 |
| Security findings (MEDIUM) | 4 |
| Security findings (LOW) | 1 |

---

## 7. Appendix: Security Finding Reference

| ID | Severity | Finding | OWASP Category | Story |
|----|----------|---------|---------------|-------|
| 3.1 | CRITICAL | No authentication on 24 API routes | A01:2021 Broken Access Control | 1, 6 |
| 3.2 | HIGH | Error responses expose internal details | A04:2021 Insecure Design | 2 |
| 3.3 | HIGH | SSRF via FFmpeg URL parameter | A10:2021 SSRF | 4 |
| 3.4 | HIGH | OAuth tokens stored unencrypted | A02:2021 Cryptographic Failures | 5 |
| 3.5 | HIGH | Service role key potentially exposed in browser | A01:2021 Broken Access Control | 5 |
| 3.6 | MEDIUM | Kong API gateway logs API keys | A09:2021 Security Logging Failures | 5 |
| 3.7 | MEDIUM | No rate limiting on any endpoint | A04:2021 Insecure Design | 3 |
| 3.8 | MEDIUM | Math.random() for file paths | A02:2021 Cryptographic Failures | 4 |
| 3.9 | MEDIUM | Overly permissive RLS policies | A01:2021 Broken Access Control | 28 |
| 3.10 | LOW | Credentials in shell history/process list | A07:2021 Auth Failures | Script improvement |

---

*Report generated from breadcrumb audit data. All findings are pre-production — no live systems assessed.*
