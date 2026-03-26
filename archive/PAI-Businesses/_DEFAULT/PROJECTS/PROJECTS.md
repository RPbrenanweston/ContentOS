# Uncategorized Projects

**Purpose:** Projects that don't fit cleanly into a specific business line, or backward-compatibility projects from before multi-business structure.

---

## Active Projects

| Project | Type | Status | Started | Notes |
|---------|------|--------|---------|-------|
| _(Uncategorized projects)_ | | | | |

---

## Completed Projects

| Project | Type | Completed | Outcome |
|---------|------|-----------|---------|
| _(Historical uncategorized projects)_ | | | |

---

## Migration Notes

**Backward Compatibility:** `USER/PROJECTS/` symlinks to this directory. Existing projects appear here by default.

**Categorization:** When a project clearly belongs to a business line, move it:
```bash
mv ~/.claude/skills/PAI/USER/BUSINESSES/_DEFAULT/PROJECTS/ProjectName \
   ~/.claude/skills/PAI/USER/BUSINESSES/BusinessName/PROJECTS/ProjectName
```

Then update the business's `PROJECTS.md` to reflect the new project.

---

**Document Status:** Default project registry for uncategorized work
**Last Updated:** 2026-02-04
