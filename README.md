# ContentOS

A creation optimizer platform — helping real creators structure, refine, and distribute their authentic long-form content across platforms.

**Status:** Active Development
**Stack:** Next.js 15, React 19, TypeScript, Supabase, Python

---

## What It Does

ContentOS follows a five-stage content lifecycle:

```
WRITE → STRUCTURE → OPTIMIZE → DISTRIBUTE → LEARN
```

- **Write** — Ghost-inspired, distraction-free editor with auto-save
- **Structure** — AI identifies segments (hooks, quotes, stories, stats) in the background
- **Optimize** — One-click platform adaptation (LinkedIn, X, Bluesky, Threads, Reddit)
- **Distribute** — Smart queue with publishing cadence and scheduling
- **Learn** — Analytics showing what resonated where, with content lineage tracking

The creator always has final say. AI assists structure and distribution, never replaces the writing.

---

## Architecture

```
ContentOS/
├── apps/
│   ├── content-os/          # Content creation & distribution app (Next.js 15)
│   └── studio/              # Video capture, annotation & compilation app (Next.js)
├── packages/
│   └── ai-core/             # Shared AI layer — multi-provider LLM access (TypeScript)
├── backend/
│   └── ai_core/             # Python AI layer equivalent + social media scheduler
├── infra/
│   ├── freeflow/            # Self-hosted media pipeline (Docker + Nginx)
│   └── supabase/            # Self-hosted Supabase config
├── supabase/
│   └── migrations/          # Database migrations (001-014)
└── docs/                    # Architecture docs
```

### Content OS App (`apps/content-os/`)

The main content platform with:

- **Domain layer** — Content nodes, segments, derived assets, distribution, queue, performance metrics
- **Infrastructure** — Supabase repositories, platform distribution adapters, pg-boss queue workers
- **Services** — Asset generation, content decomposition, media processing, transcription
- **API routes** — Content CRUD, analytics, distribution, media upload/clip, queue management, OAuth webhooks
- **UI** — TipTap editor, analytics dashboard, asset management, queue calendar, distribution panel

### Studio App (`apps/studio/`)

Video production companion:

- YouTube player with timecode capture and keyboard shortcuts
- Breadcrumb annotation system (mark moments during playback)
- Clip trimming, drawing overlays, text overlays, audio mixing
- Compilation assembly with render queue
- Export to ContentOS pipeline

### Shared AI Layer (`packages/ai-core/`)

Unified LLM provider access:

- Multi-provider support (Anthropic, OpenAI, OpenRouter — 100+ models)
- Usage tracking, BYOK with AES-256-GCM encryption
- Credit-based billing with Stripe integration
- Model registry with OpenRouter auto-sync
- Retry logic with exponential backoff

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Editor | TipTap |
| Backend | Supabase (PostgreSQL + Auth + RLS), Python FastAPI |
| AI | Anthropic Claude, OpenAI, OpenRouter |
| Queue | pg-boss |
| Infrastructure | Docker, Nginx, self-hosted Supabase |
| Testing | Vitest, pytest |
| CI | GitHub Actions |
| Linting | ESLint, Prettier, Ruff |

---

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
cp apps/content-os/.env.local.example apps/content-os/.env.local

# Run database migrations
cd infra && bash scripts/run-migrations.sh

# Start development
cd apps/content-os && npm run dev
```

See `apps/content-os/.env.local.example` and `infra/supabase/.env.example` for required configuration.

---

## Database

14 migrations covering:

1. Initial schema (content nodes, segments, assets)
2. AI layer (usage tracking, models, API keys, billing)
3. Content OS schema (distribution, queue, analytics)
4. Breadcrumb Studio schema
5. RLS policies and indexes

---

## Distribution Platforms

| Platform | Adapter | Status |
|----------|---------|--------|
| LinkedIn | `linkedin.adapter.ts` | OAuth + API |
| X (Twitter) | `x.adapter.ts` | OAuth + API |
| Bluesky | `bluesky.adapter.ts` | AT Protocol |
| Threads | `threads.adapter.ts` | API |
| Reddit | `reddit.adapter.ts` | API |

---

## License

Private repository.
