---
phase: 01-data-foundation
plan: 01
subsystem: database
tags: [supabase, postgresql, schema, migrations, rls, audit-trails]

# Dependency graph
requires:
  - phase: none
    provides: greenfield project
provides:
  - Complete 6-table database schema (companies, prospects, candidates, signals, matches, feedback)
  - Migration script with foreign keys, indexes, constraints, and triggers
  - Row Level Security foundation with permissive MVP policies
  - Audit trail infrastructure (created_at, updated_at, source_of_truth, confidence_level)
  - Comprehensive documentation with ER diagrams, query patterns, and CSV/RSS mapping examples
  - Environment configuration template for all future integrations
affects: [01-02-csv-upload, 01-03-rss-aggregator, 02-agent-architecture, 04-attio-sync]

# Tech tracking
tech-stack:
  added: [supabase, postgresql]
  patterns:
    - "Audit metadata pattern: created_at, updated_at, source_of_truth, confidence_level on all tables"
    - "Flexible storage pattern: JSONB metadata columns for extensibility"
    - "Soft delete pattern: is_active flag on signals for aging without data loss"
    - "Array columns with GIN indexes: skills[], tags[], departments[] for containment queries"
    - "Foreign key CASCADE rules: delete company → cascades to prospects, signals"

key-files:
  created:
    - supabase/migrations/001_initial_schema.sql
    - supabase/schema.sql
    - docs/database-schema.md
    - .env.example
  modified: []

key-decisions:
  - "Separate candidates and prospects tables (supply vs demand independence)"
  - "Signals linked to both companies AND prospects (flexible many-to-many)"
  - "Check constraint on signals: must link to company_id OR prospect_id"
  - "Domain field as unique deduplication key for companies"
  - "RLS enabled with permissive MVP policies (all authenticated users)"
  - "JSONB metadata columns for extensibility without schema migrations"
  - "GIN indexes on all array columns (skills, tags, departments)"
  - "Updated_at auto-trigger on all tables with that column"

patterns-established:
  - "Audit trail pattern: All tables include created_at, updated_at, source_of_truth, confidence_level"
  - "Confidence scoring pattern: 0-100 integer with check constraint for data quality tracking"
  - "Source tracking pattern: source_of_truth field documents data origin (csv_upload, rss, manual, api)"
  - "Soft delete pattern: is_active boolean on signals for lifecycle management"
  - "Foreign key cascade pattern: CASCADE DELETE for dependent records (prospects, signals, matches, feedback)"

# Metrics
duration: 5min
completed: 2026-01-28
---

# Phase 1 Plan 01: Supabase Schema Design & Setup Summary

**Complete 6-table PostgreSQL schema with audit trails, RLS, cascade rules, array indexes, and comprehensive documentation**

## Performance

- **Duration:** 5 minutes
- **Started:** 2026-01-28T08:45:54Z
- **Completed:** 2026-01-28T08:51:26Z
- **Tasks:** 4 completed
- **Files modified:** 4 created

## Accomplishments

- **Complete database foundation** with 6 normalized tables supporting full sales intelligence workflow
- **Production-ready migration script** with foreign keys, indexes, constraints, check rules, and auto-update triggers
- **Row Level Security** enabled on all tables with permissive MVP policies (ready for multi-user enhancement)
- **Comprehensive 744-line documentation** with ER diagrams, query patterns, CSV/RSS mapping examples, and troubleshooting guide
- **Audit trail infrastructure** on all tables (created_at, updated_at, source_of_truth, confidence_level) for data lineage tracking

## Task Commits

Each task was committed atomically:

1. **Task 1: Create initial database migration script** - `0ec31ca` (feat)
   - 6 tables: companies, prospects, candidates, signals, matches, feedback
   - Foreign key relationships with CASCADE rules
   - Indexes on foreign keys, lookup fields, and array columns (GIN)
   - Check constraints (confidence 0-100, signals must link to company or prospect)
   - Updated_at trigger function applied to all tables
   - Row Level Security with permissive MVP policies
   - Helpful views for common queries

2. **Task 2: Create consolidated schema reference** - `6d64c61` (feat)
   - Complete schema overview with all 6 tables
   - Text-based ER diagram showing relationships
   - Detailed field definitions with constraints
   - Example queries for common patterns
   - CSV upload and RSS feed mapping examples
   - Maintenance queries (aging, deduplication, quality reports)

3. **Task 3: Create comprehensive database schema documentation** - `8595c99` (docs)
   - 744-line documentation file
   - Visual ER diagram with relationship explanations
   - Table definitions with all columns, types, and constraints
   - Indexing strategy and performance optimization guidance
   - CSV upload and RSS feed data flow diagrams
   - Common query patterns for each table
   - Maintenance operations documentation
   - Security and RLS model with future multi-user guidance
   - Troubleshooting guide for common issues
   - Sample data examples in JSON format

4. **Task 4: Create environment configuration template** - `6b55d7a` (feat)
   - Supabase connection settings (URL, anon key, service key)
   - Application settings (environment, port)
   - LLM API keys (Anthropic Claude, Ollama)
   - RSS feed configuration placeholders
   - Attio CRM integration settings
   - File storage configuration (local/S3)
   - Logging, monitoring, security settings
   - Feature flags for gradual rollout
   - Development tools configuration

## Files Created/Modified

### Created
- **supabase/migrations/001_initial_schema.sql** (343 lines)
  - Complete migration script with all tables, indexes, constraints, triggers, and RLS policies
  - Production-ready for Supabase deployment

- **supabase/schema.sql** (461 lines)
  - Consolidated schema reference with detailed comments
  - Text-based ER diagram showing all relationships
  - Example queries for common patterns (search, filter, aggregate)
  - CSV upload and RSS feed mapping examples
  - Maintenance query examples

- **docs/database-schema.md** (744 lines)
  - Comprehensive documentation with visual ER diagram
  - Table-by-table definitions with rationale
  - Indexing strategy and performance guidance
  - Data flow diagrams (CSV → DB, RSS → DB)
  - Common query patterns organized by use case
  - Maintenance operations (aging signals, deduplication, quality reports)
  - Security model and RLS guidance
  - Troubleshooting guide with solutions
  - Sample data in JSON format

- **.env.example** (144 lines)
  - Supabase connection configuration
  - LLM API keys (Claude, Ollama)
  - RSS feed settings
  - Attio CRM integration
  - Storage, logging, security, feature flags
  - Development tools

## Decisions Made

1. **Separate candidates and prospects tables**
   - Rationale: Supply-side (candidates) and demand-side (prospects) have different lifecycles and relationships
   - Impact: Enables independent candidate pipeline management, flexible many-to-many matching via matches table

2. **Signals linked to both companies AND prospects**
   - Rationale: Some signals are company-level (funding), others are individual-level (promotion), some are both (job posting)
   - Impact: Check constraint ensures at least one link exists, maximum flexibility for signal classification

3. **Domain field as unique deduplication key**
   - Rationale: Company names vary ("Acme Corp" vs "Acme Corporation"), domains are canonical
   - Impact: CSV uploads check domain before inserting, prevents duplicate company records

4. **JSONB metadata columns on all tables**
   - Rationale: Enrichment data evolves rapidly, schema migrations are slow
   - Impact: Flexible storage for additional fields without ALTER TABLE statements

5. **RLS enabled with permissive MVP policies**
   - Rationale: Security foundation in place for future multi-user access control
   - Impact: All authenticated users can access all data in MVP, policies easy to enhance later

6. **GIN indexes on all array columns**
   - Rationale: Array containment queries (@>) are common (skills search, tag filtering)
   - Impact: Fast queries on skills[], tags[], departments[] arrays

7. **Confidence level 0-100 on all tables**
   - Rationale: Data quality varies by source (CSV=high, RSS extraction=medium, manual=varies)
   - Impact: Enables filtering by confidence, tracks data quality over time, informs feedback loop

8. **Updated_at auto-trigger on all tables**
   - Rationale: Manual timestamp management error-prone
   - Impact: Reliable audit trail, automatic tracking of when records last changed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - schema design completed successfully without blocking issues.

## User Setup Required

**Manual Supabase setup required before schema deployment:**

1. **Create Supabase project** at https://app.supabase.com/
2. **Get connection credentials** from project settings → API
3. **Copy .env.example to .env** and fill in:
   - `SUPABASE_URL` (project URL)
   - `SUPABASE_ANON_KEY` (public/anon key)
   - `SUPABASE_SERVICE_KEY` (service role key - keep secret!)
4. **Run migration** via Supabase CLI:
   ```bash
   supabase link --project-ref your-project-ref
   supabase db push
   ```
   Or via SQL Editor in Supabase dashboard (paste migration script)
5. **Verify tables created** in Supabase Table Editor

**Verification:**
```bash
# Check tables exist
psql $SUPABASE_URL -c "\dt"

# Should show: companies, prospects, candidates, signals, matches, feedback

# Check RLS enabled
psql $SUPABASE_URL -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"

# All tables should show rowsecurity = t (true)
```

## Next Phase Readiness

**Ready for next plan (01-02: CSV Upload Interface):**
- ✅ Database schema complete and documented
- ✅ Field mappings documented for CSV → database
- ✅ Deduplication strategy defined (domain for companies, email for prospects/candidates)
- ✅ Confidence level and source_of_truth fields ready for CSV tracking
- ✅ Foreign key relationships ready for company → prospects linking

**Ready for plan 01-03 (RSS Aggregator):**
- ✅ Signals table ready for RSS feed data
- ✅ Tags[] array ready for signal classification
- ✅ Confidence scoring field ready for RSS extraction quality
- ✅ Source tracking ready (source='techcrunch_rss', source_url=article URL)

**No blockers.**

**Considerations for future plans:**
- Migration must be run against Supabase instance before CSV upload or RSS ingestion can begin
- RLS policies are permissive for MVP - consider user-specific policies before production
- Maintenance queries (aging signals, deduplication) should be scheduled as cron jobs in Phase 5

---
*Phase: 01-data-foundation*
*Completed: 2026-01-28*
