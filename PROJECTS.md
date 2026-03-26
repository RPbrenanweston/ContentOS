# Project Structure

This is a **monorepo** containing multiple projects with clear boundaries to prevent cross-contamination.

---

## Active Projects

### 1. **Shared AI Layer** (Core)
**Location:** `backend/`, `packages/`, `supabase/`, `docs/`

A foundational TypeScript + Python library providing unified access to multiple LLM providers (Anthropic Claude, OpenAI GPT, OpenRouter, Ollama).

**Tech Stack:**
- **TypeScript:** `packages/ai-core/` (npm package)
- **Python:** `backend/ai_core/` (PyPI package)
- **Database:** Supabase (migrations in `supabase/`)
- **CI/CD:** `.github/workflows/`

**Key Files:**
- `jobtrackr/` — See below

---

### 2. **JobTrackr**
**Location:** `jobtrackr/` (subdirectory)

Two-sided job search platform for tech security recruitment. Deployed as a Next.js app with Supabase backend.

**Tech Stack:**
- **Frontend:** Next.js 14, TypeScript, Shadcn UI
- **Backend:** Supabase (shared with Shared AI Layer)
- **Deployment:** Vercel

**Key Files:**
- `jobtrackr/README.md` — Full project documentation
- `jobtrackr/ROADMAP.md` — Feature roadmap

---

## Archived Projects

All archived projects are preserved in `/archive/` for historical reference. These are **not** part of active development.

### **PAI Legacy** (`archive/pai-legacy/`)
Attio CRM data enrichment pipeline using LeadMagic, Smartlead, and email validation APIs. Abandoned after data pipeline completion.

**Files:**
- Batch processing: `batch_1_*.py`, `batch_1_*.json`
- Attio integration: `attio_*.py`
- LeadMagic enrichment: `leadmagic_*.py`
- Smartlead campaigns: `smartlead_*.py`
- Email validation: `validate_*.py`
- Enrichment workflows: `enrich_*.py`, `process_*.py`
- Documentation: `*_SUMMARY.md`, `*_GUIDE.md`, etc.

**Status:** ✋ On hold — all scripts and data preserved for reference

---

### **Exprs GTM** (`archive/exprs-gtm/`)
Go-to-market strategy and agent framework for Exprs.io product. Includes ICP definition, brand voice, and URL sourcing/verification agents.

**Files:**
- `agents-exprs-gtm/` — Complete GTM architecture with component definitions
- `exprs_*.md` — Campaign playbooks and implementation guides
- `URL_SOURCING_*.md` — Agent specifications

**Status:** ✋ On hold — GTM strategy documented, agents not deployed

---

### **Wix Recruitment Site** (`archive/wix-recruitment/`)
Recruitment site implementation for Wix platform. Includes gap analysis, implementation guide, and HTML embed code.

**Files:**
- `WIX_HOMEPAGE_GAP_ANALYSIS.md`
- `WIX_HANDOVER_INSTRUCTIONS.md`
- `wix-*.md` — Implementation guides
- `homepage-embed.html` — Embed code for Wix

**Status:** ✋ On hold — design and implementation docs ready for deployment

---

### **Social Media Tools** (`archive/social-media-tools/`)
Ad-hoc automation scripts for social media scheduling (LinkedIn, Twitter, TikTok) using LATE API.

**Files:**
- `create_draft*.py` — Draft creation scripts
- `schedule_*.py` — Post scheduling
- `cyber_funding*.py` — Cyber funding campaign automation
- Immuta, Brenan, and client profile templates

**Status:** ✋ On hold — scripts functional but not integrated into core workflow

---

### **Test Scripts** (`archive/test-scripts/`)
Temporary test, debug, and monitoring scripts from development cycles.

**Files:**
- `test_*.py` — Unit tests for integrations (aiark, leadmagic, late, batch)
- `debug_*.py` — Debugging utilities
- `quick_*.py` — Quick validation demos
- `check_*.sh`, `monitor_*.sh` — Monitoring scripts

**Status:** ✋ Archived — kept for reference, not maintained

---

## Directory Structure

```
.
├── jobtrackr/                          # JobTrackr product (Next.js)
├── packages/                           # TypeScript monorepo workspace
│   └── ai-core/                        # Shared AI Layer (TS)
├── backend/                            # Python Shared AI Layer + utilities
├── supabase/                           # Database migrations & RLS
├── docs/                               # Shared documentation
├── .github/workflows/                  # CI/CD pipeline
├── archive/                            # Archived projects (preserved)
│   ├── pai-legacy/                     # PAI enrichment pipeline
│   ├── exprs-gtm/                      # Exprs.io GTM
│   ├── wix-recruitment/                # Wix site implementation
│   ├── social-media-tools/             # Social media automation
│   ├── test-scripts/                   # Test utilities
│   └── PAI-Businesses/                 # Supporting data
├── skills/                             # PAI skill definitions
├── commands/                           # CLI commands
├── .env.local                          # Local secrets (NOT tracked)
├── .gitignore                          # Prevents re-contamination
└── PROJECTS.md                         # This file

```

---

## Development Workflow

### For Shared AI Layer Changes
```bash
cd backend
# or
cd packages/ai-core
# Make changes, run tests, submit PR
```

### For JobTrackr Changes
```bash
cd jobtrackr
npm run dev
# or
npm run build
```

### For Archived Project Review
```bash
# Read documentation
cat archive/pai-legacy/EMAIL_VALIDATION_COMPLETE.md
# Review scripts
ls archive/pai-legacy/*.py
```

---

## Environment Variables

**Local secrets** (`.env.local` — NOT tracked):
- `WIX_API_TOKEN` — Wix API credential
- `WIX_API_TOKEN_V2` — Wix API v2 credential
- Other API keys as needed

See `.env.example` for full list of available variables.

---

## Security

- ✅ API tokens stored in `.env.local` (not tracked)
- ✅ `.gitignore` enforces project boundaries
- ✅ Archived projects isolated from active development
- ✅ No sensitive data in version control

---

## Project Owner

**RPBW** — All projects and archives

---

## Questions?

Refer to individual project READMEs:
- JobTrackr: `jobtrackr/README.md`
- Shared AI Layer: `docs/`
- Archived projects: Respective `archive/*/README.md` or `.md` files
