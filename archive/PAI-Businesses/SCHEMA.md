# Business Directory Schema

**Purpose:** Define what replicates per-business vs. stays at USER/ root

---

## Replicate Per-Business (Isolation Required)

These directories exist inside each `BUSINESSES/{BusinessName}/` to prevent context contamination:

| Directory | Why Isolated | Example |
|-----------|-------------|---------|
| **PROJECTS/** | Projects belong to one business | BrennanWeston client work ≠ Scorecrd feature development |
| **PROJECTS.md** | Project index per business | Each business tracks its own project registry |
| **WORKFLOWS/** | Business-specific automation | ExpressRecruitment onboarding ≠ EtsyShop listing workflows |
| **CREDENTIALS/** | API keys scoped to business | Scorecrd Stripe key ≠ BrennanWeston CRM credentials |

---

## Stay at USER/ Root (Shared Identity)

These files remain at `USER/` level because they represent RPBW's identity, not business-specific data:

| File/Directory | Why Shared | Rationale |
|----------------|-----------|-----------|
| **CONTACTS.md** | People are people | A contact doesn't become different based on business context |
| **ABOUTME.md** | Your identity | You are you regardless of which business |
| **AISTEERINGRULES.md** | Behavioral rules | Personal preferences apply universally |
| **DAIDENTITY.md** | Assistant identity | Joan's personality doesn't change per business |
| **FINANCES/** | Personal finances | Your financial data, not business-specific |
| **TELOS/** | Life goals system | Life goals transcend individual businesses |
| **TERMINAL/** | Shell configurations | Terminal settings are environment, not business |
| **SKILLCUSTOMIZATIONS/** | PAI skill tweaks | Skill behavior applies across all businesses |
| **TECHSTACKPREFERENCES.md** | Technology choices | Your tech preferences persist across contexts |
| **PRODUCTIVITY.md** | Personal productivity | How you work, not what business you're in |
| **RESUME.md** | Professional history | Career spans multiple businesses |

---

## Directory Structure

```
USER/
  BUSINESSES/
    BUSINESSES.md           # Master index (this document's sibling)
    SCHEMA.md               # This document

    BrennanWeston/          # Operational recruitment business
      PROJECTS/
        PROJECTS.md
      WORKFLOWS/
      CREDENTIALS/

    ExpressRecruitment/     # Development-stage recruitment
      PROJECTS/
        PROJECTS.md
      WORKFLOWS/
      CREDENTIALS/

    Scorecrd/               # SaaS product (interview scorecards)
      PROJECTS/
        PROJECTS.md
      WORKFLOWS/
      CREDENTIALS/

    SalesBlock/             # SaaS product (sales enablement)
      PROJECTS/
        PROJECTS.md
      WORKFLOWS/
      CREDENTIALS/

    EtsyShop/               # Digital asset sales
      PROJECTS/
        PROJECTS.md
      WORKFLOWS/
      CREDENTIALS/

    TravelAgent/            # Partnership travel business
      PROJECTS/
        PROJECTS.md
      WORKFLOWS/
      CREDENTIALS/

    _DEFAULT/               # Uncategorized or backward-compat projects
      PROJECTS/
        PROJECTS.md

  # Shared identity files (stay at USER/ root)
  CONTACTS.md
  ABOUTME.md
  AISTEERINGRULES.md
  DAIDENTITY.md
  FINANCES/
  TELOS/
  [... other personal files]

  # Backward compatibility symlink
  PROJECTS/ -> BUSINESSES/_DEFAULT/PROJECTS/
```

---

## Cross-Business References

When Project A (in Business X) must reference Project B (in Business Y):

**DO:**
- Use explicit paths: `/BUSINESSES/Scorecrd/PROJECTS/auth-system/`
- Document WHY the cross-reference exists
- Keep 95% of projects cleanly in one business

**DON'T:**
- Create `SHARED/` directories (becomes dumping ground)
- Duplicate projects across businesses (sync nightmares)
- Use implicit metadata linking (fragile, undocumented)

**Example:**
```markdown
# Project: ExpressRecruitment Client Onboarding

## Implementation Notes

The subscription billing pattern here is based on work done in Scorecrd.
See: `/BUSINESSES/Scorecrd/PROJECTS/stripe-integration/` for implementation details.

Cross-ref reason: Both SaaS products use identical Stripe subscription model.
```

---

## Adding a New Business

To add business #7, #8, etc.:

1. **Create directory:**
   ```bash
   mkdir -p ~/.claude/skills/PAI/USER/BUSINESSES/NewBusiness/{PROJECTS,WORKFLOWS,CREDENTIALS}
   ```

2. **Initialize PROJECTS.md:**
   ```markdown
   # NewBusiness Projects

   ## Active Projects

   [Projects go here...]

   ---
   **Business Context:** [2-3 sentences]
   **Stage:** [Operational/Development/Planning/Early-stage]
   **Revenue Model:** [How this business makes money]
   ```

3. **Update master index:**
   Add entry to `BUSINESSES.md` table with type, stage, revenue model, and capabilities.

4. **Set as active (optional):**
   Update `STATE/current-business.json` if making it the default.

---

**Document Status:** Schema definition for RPBW's multi-business PAI structure
**Last Updated:** 2026-02-04
**Purpose:** Define replication rules to prevent context contamination while preserving shared identity
