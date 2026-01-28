---
phase: "01"
plan: "02"
plan_name: "CSV Upload & Mapping Interface"
subsystem: "data-ingestion"
tags: ["python", "csv", "supabase", "validation", "data-merge", "cli"]
completed: "2026-01-28"
duration: "5.7 minutes"

# Dependency graph
requires:
  - plan: "01-01"
    reason: "Depends on database schema definition (companies, prospects, candidates tables)"
provides:
  - "CSV upload system with Apollo and candidate format support"
  - "Smart merge logic (preserve-existing, fill-blanks)"
  - "Validation engine with Pydantic models"
  - "CLI interface with dry-run mode"
  - "Data provenance tracking"
affects:
  - plan: "01-03"
    reason: "RSS aggregator will use similar validation and merge patterns"
  - plan: "02-*"
    reason: "Agents will read enrichment data uploaded via CSV"
  - plan: "04-02"
    reason: "Attio sync will export data initially uploaded via CSV"

# Tech stack
tech-stack:
  added:
    - library: "pandas"
      purpose: "CSV parsing and data manipulation"
    - library: "pydantic"
      purpose: "Data validation and normalization"
    - library: "typer"
      purpose: "CLI interface"
    - library: "email-validator"
      purpose: "Email format validation"
    - library: "validators"
      purpose: "URL and domain validation"
    - library: "supabase-py"
      purpose: "Database integration"
  patterns:
    - "Field mapping profiles (Apollo, Candidate)"
    - "Smart merge strategy (preserve truth, fill blanks)"
    - "Dry-run validation pattern"
    - "Metadata-based provenance tracking"

# File tracking
key-files:
  created:
    - path: "backend/validation.py"
      purpose: "Pydantic models for data validation"
    - path: "backend/csv_mapper.py"
      purpose: "CSV parsing and field mapping"
    - path: "backend/data_merger.py"
      purpose: "Smart merge logic implementation"
    - path: "backend/csv_uploader.py"
      purpose: "Main uploader with Supabase integration and CLI"
    - path: "backend/requirements.txt"
      purpose: "Python dependencies"
    - path: "tests/test_csv_upload.py"
      purpose: "Unit tests for parsing, validation, merge"
    - path: "docs/csv-upload-guide.md"
      purpose: "Complete usage guide with field mappings"
    - path: "sample_data/apollo_export_example.csv"
      purpose: "Example Apollo export with 10 rows"
    - path: ".env.example"
      purpose: "Environment configuration template"
    - path: ".gitignore"
      purpose: "Exclude sensitive files and build artifacts"
  modified: []

# Decisions made
decisions:
  - id: "preserve-existing-merge"
    what: "Merge strategy: preserve existing data, fill blanks only"
    why: "Prevents overwriting manually verified data with potentially stale CSV uploads"
    impact: "High data integrity, but requires initial data to be accurate"
    alternatives:
      - "Full overwrite: simpler but loses manual edits"
      - "Timestamp-based: complex and error-prone"

  - id: "array-field-union"
    what: "Array fields (departments, skills) use union merge with deduplication"
    why: "Accumulates knowledge over time without losing existing entries"
    impact: "Arrays grow over time, need cleanup mechanism"
    alternatives:
      - "Replace: loses existing data"
      - "Append with duplicates: causes data bloat"

  - id: "email-company-uniqueness"
    what: "Prospects identified by email + company_id (not just email)"
    why: "Same person can move between companies"
    impact: "Allows tracking career progression"
    alternatives:
      - "Email only: can't handle job changes"
      - "LinkedIn URL: not always available"

  - id: "cli-interface"
    what: "CLI-based upload (not web UI)"
    why: "MVP optimization - web UI adds complexity for single-user tool"
    impact: "Developer-friendly but not end-user ready"
    alternatives:
      - "Web UI: more accessible but higher dev cost"
      - "API only: less user-friendly"

  - id: "validation-before-upload"
    what: "Dry-run mode validates entire CSV before database changes"
    why: "Prevents partial uploads and data inconsistency"
    impact: "Safer but requires two-step workflow"
    alternatives:
      - "Optimistic upload: faster but risky"
      - "Row-by-row with rollback: complex transaction management"

# Performance metrics
metrics:
  lines_of_code: 1948
  files_created: 10
  tests_written: 12
  documentation_pages: 1
---

# Phase 01 Plan 02: CSV Upload & Mapping Interface Summary

**One-liner:** Python CLI for uploading Apollo exports and candidate CSVs to Supabase with smart merge logic (preserve-existing, fill-blanks), Pydantic validation, dry-run mode, and provenance tracking.

## What Was Built

### Core Components

1. **Validation Engine** (`validation.py`)
   - Pydantic models for Company, Prospect, Candidate data
   - Email format validation (RFC 5322)
   - Domain normalization (strips http://, www., trailing slashes)
   - Seniority normalization (standardizes to C-Level, VP, Director, etc.)
   - Availability normalization (standardizes to immediate, 2_weeks, etc.)
   - Batch validation with detailed error reporting

2. **CSV Mapper** (`csv_mapper.py`)
   - Apollo mapping profile (splits CSV into company + prospect data)
   - Candidate mapping profile (talent supply-side)
   - Array field parsing (departments, skills from comma-separated strings)
   - Name field combination (first + last → full name)
   - Location combination (city, state, country → single string)
   - Employee count parsing (handles ranges like "50-100")

3. **Data Merger** (`data_merger.py`)
   - Preserve-existing, fill-blanks merge strategy
   - Protected fields (id, created_at, source_of_truth never overwritten)
   - Array field union (departments, skills merged and deduplicated)
   - Metadata tracking (timestamps, fields updated, source)
   - Merge history accumulation (audit trail)

4. **CSV Uploader** (`csv_uploader.py`)
   - Supabase integration via supabase-py
   - CLI interface with Typer
   - Dry-run mode (validate without database changes)
   - Error handling with partial success support
   - Detailed upload summaries
   - Company upsert by domain (checks existence, merges if found)
   - Prospect upsert by email + company_id
   - Candidate upsert by email

### Testing & Documentation

5. **Test Suite** (`test_csv_upload.py`)
   - CSV parsing tests (departments, skills, name combination)
   - Validation tests (email, domain, required fields)
   - Merge logic tests (fill blanks, preserve existing, array merge, protected fields)
   - 12 unit tests covering core functionality

6. **Documentation** (`csv-upload-guide.md`)
   - Complete field mapping tables (Apollo → Supabase, Candidate → Supabase)
   - CLI usage examples (dry-run, upload Apollo, upload candidate)
   - Data merge strategy explanation
   - Validation rules reference
   - Troubleshooting guide
   - Workflow for uploading 10 pilot companies

7. **Sample Data** (`apollo_export_example.csv`)
   - 10 example rows with realistic data
   - 6 companies (Acme Security, CyberDefense, ShieldTech, Fortify Data, SecureCloud, ZeroTrust)
   - 10 prospects (CISOs, VPs, Directors, Recruiters)
   - All fields populated (demonstrates full mapping)

### Configuration

8. **Environment Setup**
   - `.env.example` with comprehensive configuration sections
   - Supabase credentials (URL, anon key, service key)
   - LLM API keys (Anthropic, Ollama for future agents)
   - RSS feed configuration (for plan 01-03)
   - Attio CRM integration settings (for plan 04-02)
   - Feature flags for future capabilities

9. **Project Setup**
   - `.gitignore` (excludes .env, uploads/, __pycache__, logs)
   - `backend/__init__.py` (makes backend a Python package)
   - `requirements.txt` (pandas, pydantic, typer, supabase-py, validators)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added .gitignore file**

- **Found during:** Task 1 (environment setup)
- **Issue:** No .gitignore file means sensitive .env and .DS_Store could be committed
- **Fix:** Created comprehensive .gitignore covering Python, env files, uploads, logs, IDE files
- **Files modified:** `.gitignore` (created)
- **Commit:** 6d83ff9

**2. [Rule 2 - Missing Critical] Added backend/__init__.py**

- **Found during:** Task 5 (building uploader)
- **Issue:** Backend directory wasn't a proper Python package (import issues)
- **Fix:** Created `__init__.py` with version metadata
- **Files modified:** `backend/__init__.py` (created)
- **Commit:** 6d83ff9

**3. [Rule 2 - Missing Critical] Enhanced .env.example**

- **Found during:** Task 6 (environment configuration)
- **Issue:** Original plan showed minimal .env.example, but comprehensive template prevents configuration errors
- **Fix:** Added sections for LLM APIs, RSS feeds, Attio integration, storage, logging, security, feature flags
- **Files modified:** `.env.example`
- **Commit:** 6d83ff9 (linter enhanced after creation)

### Dependency Clarification

**Plan depends on 01-01 (database schema):**

- Plan frontmatter lists `depends_on: - 01-01-PLAN.md`
- 01-01 has not been executed yet (no schema migration files exist)
- **Resolution:** Built CSV uploader code that will work with schema once 01-01 is executed
- **Rationale:** CSV uploader is just Python code - doesn't require database to exist at development time, only at runtime
- **Impact:** Code is ready to run as soon as 01-01 schema migration is applied

## Technical Highlights

### Smart Merge Algorithm

The merge logic implements **preserve-truth, fill-blanks** strategy:

```python
# Example: Uploading same company twice
# First upload: employee_count=None, industry="Technology"
# Second upload: employee_count=500, industry="Software"
# Result: employee_count=500 (filled), industry="Technology" (preserved)

if existing_value is None and new_value is not None:
    merged[field] = new_value  # Fill blank
elif existing_value is not None:
    merged[field] = existing_value  # Preserve existing
```

**Benefits:**
- Prevents overwriting manually verified data
- Accumulates knowledge over time
- Maintains data integrity across multiple CSV uploads

### Array Field Merging

Departments and skills use **union merge with deduplication**:

```python
existing_departments = ['Engineering']
new_departments = ['Engineering', 'Security']
merged_departments = ['Engineering', 'Security']  # Union
```

**Benefits:**
- Accumulates knowledge (person gains new department responsibilities)
- Prevents duplicates
- Reflects career progression

### Validation Pipeline

Three-stage validation ensures data quality:

1. **Parse:** CSV → dictionaries with field mapping
2. **Validate:** Pydantic models enforce types, formats, constraints
3. **Normalize:** Standardize domains, seniority, availability

**Example normalization:**
- Domain: `https://www.ACME.COM/` → `acme.com`
- Seniority: `c-level`, `executive` → `C-Level`
- Availability: `now`, `asap` → `immediate`

### Dry-Run Pattern

Validate before upload prevents partial failures:

```bash
# Step 1: Dry-run (no DB changes)
python backend/csv_uploader.py upload data.csv --dry-run

# Review validation results
# Companies: 10 valid, 0 errors
# Prospects: 9 valid, 1 error (row 5: invalid email)

# Step 2: Fix CSV, re-run dry-run

# Step 3: Upload for real
python backend/csv_uploader.py upload data.csv
```

### Provenance Tracking

Every record tracks its source and merge history:

```python
{
  "source_of_truth": "csv_upload",
  "confidence_level": 80,
  "metadata": {
    "last_merge": {
      "timestamp": "2024-01-28T10:30:00Z",
      "fields_updated": ["employee_count", "funding_stage"],
      "source": "csv_upload"
    },
    "merge_history": [
      {"timestamp": "2024-01-20T08:00:00Z", "fields_updated": ["industry"]},
      {"timestamp": "2024-01-28T10:30:00Z", "fields_updated": ["employee_count", "funding_stage"]}
    ]
  }
}
```

**Benefits:**
- Audit trail for compliance
- Debug data quality issues
- Train future ML models on confidence levels

## Verification Results

### CSV Parsing ✓

- [x] Apollo CSV with all fields parses correctly
- [x] Candidate CSV mapping implemented
- [x] Missing columns handled gracefully (no crashes)
- [x] Array fields (departments, skills) converted from comma-separated strings
- [x] Name combination (first + last) works correctly
- [x] Location combination (city, state, country) works correctly

### Validation ✓

- [x] Invalid emails rejected (Pydantic EmailStr validation)
- [x] Invalid domains rejected (validators library)
- [x] Required fields enforced (name, domain for companies)
- [x] Domain normalization strips http://, www., trailing slashes
- [x] Seniority normalization standardizes levels
- [x] Validation summary shows valid/invalid row counts

### Data Merge Logic ✓

- [x] New data fills blank fields in existing records
- [x] Existing data NOT overwritten by new uploads
- [x] Metadata tracks which fields were updated and when
- [x] Array fields (departments, skills) merged and deduplicated
- [x] Protected fields (id, created_at, source_of_truth) never change

### Database Integration (pending 01-01) ⏳

- [ ] Company upsert works (requires schema from 01-01)
- [ ] Prospect correctly linked to company via company_id
- [ ] Candidate uploaded independently
- [ ] source_of_truth set to 'csv_upload'
- [ ] confidence_level set to 80

**Note:** Database integration tests require 01-01 schema migration to be executed first.

### CLI Interface ✓

- [x] Dry-run mode shows validation results without database changes
- [x] Upload command structure implemented (Apollo and Candidate types)
- [x] Error logging shows which rows failed and why
- [x] Supports both Apollo and Candidate upload types
- [x] Environment variable loading from .env

### Testing ✓

- [x] Unit tests written for parsing, validation, merge logic
- [x] 12 test cases covering core functionality
- [x] Tests run with pytest (require dependencies: `pip install -r requirements.txt`)

### Documentation ✓

- [x] `docs/csv-upload-guide.md` explains entire workflow with examples
- [x] Field mapping tables documented (CSV → database)
- [x] CLI usage examples provided
- [x] Troubleshooting section included
- [x] Sample CSVs provided for testing

## Success Criteria

- ✅ CSV upload interface for manual enrichment data
- ✅ CSV schema mapped to Supabase (companies, prospects, candidates)
- ✅ Manual data insertion workflow documented
- ✅ Smart merge logic preserves existing data
- ✅ Validation prevents data quality issues
- ✅ Source tracking enables audit trails
- ⏳ 10 pilot companies ready to seed (depends on 01-01 schema + user running upload)

## Next Phase Readiness

### Blockers

1. **Database schema doesn't exist yet**
   - Plan 01-01 must be executed before CSV uploads can run
   - Schema files (001_initial_schema.sql) need to be created and applied
   - **Mitigation:** Code is ready; just needs schema to exist

### Concerns

1. **No integration tests with live database**
   - Unit tests verify logic, but database interaction untested
   - **Mitigation:** Can test manually after 01-01 with sample CSV

2. **No web UI for non-technical users**
   - CLI requires Python environment and command-line knowledge
   - **Mitigation:** Acceptable for MVP; can add web UI in Phase 4 if needed

3. **Array growth over time**
   - Union merge for departments/skills means arrays grow indefinitely
   - **Mitigation:** Add cleanup mechanism in future iteration

### Dependencies for Downstream Plans

- **Plan 01-03 (RSS Aggregator):** Can reuse validation and merge patterns
- **Plan 02-* (Agents):** Will read CSV-uploaded enrichment data
- **Plan 04-02 (Attio Sync):** Will export data initially uploaded via CSV

### Recommendations

1. **Execute 01-01 next** - Schema is prerequisite for testing CSV upload
2. **Test with sample CSV** - Use `apollo_export_example.csv` to validate end-to-end flow
3. **Add integration tests** - After 01-01, write tests against test database
4. **Consider web UI** - If non-developers need to upload CSVs, build simple upload form

## Git Commits

| Commit | Files | Description |
|--------|-------|-------------|
| 6d83ff9 | 10 files, 1948 lines | feat(01-02): implement CSV upload and mapping system |

**Commit details:**
- backend/validation.py (Pydantic models)
- backend/csv_mapper.py (parsing and field mapping)
- backend/data_merger.py (smart merge logic)
- backend/csv_uploader.py (CLI and Supabase integration)
- backend/requirements.txt (dependencies)
- tests/test_csv_upload.py (unit tests)
- docs/csv-upload-guide.md (complete guide)
- sample_data/apollo_export_example.csv (example data)
- .env.example (environment template)
- .gitignore (exclude sensitive files)

## Lessons Learned

### What Went Well

1. **Pydantic validation** - Extremely powerful for data quality enforcement
2. **Merge strategy** - Preserve-existing logic protects data integrity
3. **Dry-run pattern** - Prevents costly mistakes before database changes
4. **Comprehensive docs** - Field mapping tables make onboarding easy

### What Could Be Improved

1. **Integration testing** - Need test database for end-to-end validation
2. **Error recovery** - Could add resume-from-row for large CSV failures
3. **Performance** - Batch inserts would be faster than row-by-row upserts

### Technical Debt

1. **No duplicate detection across companies** - Same company could be added with slight domain variations (e.g., `acme.com` vs `www.acme.com`)
2. **No fuzzy matching** - Can't detect `Acme Corp` vs `Acme Corporation`
3. **No CSV validation before upload** - Could add CSV header validation step
4. **No progress bar** - Large CSVs have no progress indicator

---

**Plan Status:** ✅ Complete

**Ready for:** 01-03 (RSS Aggregator) after 01-01 (Database Schema) is executed

**Estimated time to test:** 15 minutes (after 01-01 complete + Supabase credentials configured)
