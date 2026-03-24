# Brenan Weston — Central Workspace
## Claude Code Master Context

> **Read this file completely before starting any task.**
> This is the root of all active projects. Never start work without knowing which project you are in.

---

## ⚠️ Anti-Drift Rules (mandatory before every session)

1. **Identify your target project first.** Ask: which folder should I be working in?
2. **`cd` into the correct project directory before making any changes.**
3. **Never commit recruitment code to `shared-ai-layer` or `codesignal-20`.** Recruitment logic lives in `ai-recruitment` (not yet cloned here — clone from GitHub if needed).
4. **Never commit salesblock UI or logic into any other repo.** SalesBlock is its own product.
5. **Check the current branch before starting.** Run `git branch --show-current` and verify it matches the table below.
6. **Never set a `claude/*` branch as default.** Always work toward `main` or a `ralph/*` branch.

---

## Project Map

| Folder | Repo | Purpose | Stack | Active Branch |
|--------|------|---------|-------|---------------|
| `.` (root) | shared-ai-layer | Shared AI infrastructure layer (LLM providers, prompts, shared types) | TypeScript + Python | `main` |
| `jobtrackr/` | jobtrackr | Two-sided job marketplace for tech/security recruitment | Next.js 14, Supabase, TypeScript | `ralph/marketplace-features` |
| `codesignal-20/` | codesignal-20 | Multi-agent sourcing platform (CodeSignal + ExecSignal agents) | TypeScript, Bun, Vercel | `main` |
| `escapement/` | escapement | AI control plane — govern AI usage across all apps | Hono, Next.js, Supabase | `main` |
| `Ultralearning-Architect/` | Ultralearning-Architect | Public HTML showcase | HTML | `main` |

### Not yet cloned (GitHub only)
| Repo | Purpose |
|------|---------|
| `salesblock-io` | SalesBlock CRM product — **default branch BROKEN, fix before cloning** |
| `ai-recruitment` | AI recruitment tooling (Python) — **no main branch yet, fix before cloning** |
| `sourcing-mission-control` | Sourcing control UI |
| `SPP` | Sourcing pipeline product |
| `Breadcrumb` | Breadcrumb product |

---

## Root Repo (shared-ai-layer) Structure

```
Claude code/           ← YOU ARE HERE (shared-ai-layer root)
├── packages/
│   └── ai-core/       ← TypeScript package: unified LLM provider access
├── backend/
│   └── ai_core/       ← Python equivalent
├── supabase/          ← Shared DB migrations
├── docs/              ← Shared documentation
├── skills/            ← PAI skill definitions
└── commands/          ← CLI command definitions
```

**This root repo is for shared infrastructure only.**
Do not put product code (jobtrackr features, salesblock UI, recruitment flows) here.

---

## How to Start a Claude Code Session

### Working on a nested project
```bash
# Always cd into the project first
cd jobtrackr/
# Verify branch
git branch --show-current   # should be ralph/marketplace-features or main
# Then start your work
```

### Working on shared AI layer
```bash
# Stay at root — you're already in the right place
git branch --show-current   # should be main
# Work in packages/ai-core/ or backend/ai_core/
```

### Working on a GitHub-only repo (not yet cloned)
```bash
# Clone it first into this folder
git clone https://github.com/RPbrenanweston/salesblock-io ./SalesBlock
# BUT: fix the default branch FIRST (see audit report)
```

---

## Branch Status (as of March 2026 audit)

| Repo | Issue | Required Fix |
|------|-------|-------------|
| `salesblock-io` | Default branch is `ralph/salesblock-io` not `main` | Fix in GitHub Settings → Branches **before next session** |
| `ai-recruitment` | No `main` branch — Claude session branch is default | Create `main` from current default in GitHub |
| `jobtrackr` | `ralph/marketplace-features` is 2,450 commits ahead of main | Merge to main before next session |
| `shared-ai-layer` | `claude/separate-recruitment-project-3l4Ll` is cross-contamination | Delete after reviewing |
| `escapement` | On `ralph/escapement-gaps-v1` locally — not on main | `git checkout main` |

---

## PAI Skills

Skills live in `skills/` at the root. These are PAI skill definitions used by Claude and other agents.

To use a skill from Claude Code:
```bash
# Skills are available as prompts/instructions, not as executables
ls skills/
cat skills/<skill-name>.md
```

---

## Loose Files at Root

The root contains legacy PAI enrichment scripts (`.py`, `.json`, `.csv`). These are archived work from the data pipeline phase. **Do not modify or delete these without checking the archive.** If asked to clean up, move them to `archive/pai-legacy/`.

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind, Shadcn UI |
| Backend | Supabase (PostgreSQL + Auth + RLS), Python FastAPI |
| AI | Anthropic Claude (primary), OpenAI, OpenRouter (via shared-ai-layer) |
| Runtime | Bun (tests/local), Node 20 (Vercel) |
| Deployment | Vercel (all apps) |
| DB | Supabase (shared project for root, dedicated for jobtrackr, escapement) |

---

## Contacts / Ownership

**Project Owner:** Robert (RPbrenanweston)
**Email:** robert@brenanweston.com
**GitHub:** https://github.com/RPbrenanweston
