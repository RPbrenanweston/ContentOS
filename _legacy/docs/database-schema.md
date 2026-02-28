# Database Schema Documentation

**Last Updated:** 2026-01-28
**Schema Version:** 001 (Initial)

## Overview

The AI Security Recruitment Platform database is built on Supabase (PostgreSQL) and consists of 6 core tables that support the full sales intelligence workflow: from data ingestion (RSS feeds, CSV uploads) to signal generation, candidate matching, and feedback collection.

### Design Principles

1. **Separation of Demand and Supply**: Prospects (demand-side decision makers) and Candidates (supply-side talent) are independent tables, allowing flexible many-to-many matching via the `matches` table.

2. **Audit Trail**: Every table includes `created_at`, `updated_at`, `source_of_truth`, and `confidence_level` fields to track data lineage and quality.

3. **Flexible Metadata**: JSONB `metadata` columns provide extensibility without schema migrations.

4. **Soft Deletes**: The `signals` table uses `is_active` flag for aging signals without data loss.

5. **Performance-First Indexing**: Indexes on foreign keys, lookup fields, and array columns (GIN) ensure fast queries.

6. **Row Level Security**: RLS enabled on all tables to support future multi-user access control.

## Entity Relationship Diagram

```
┌─────────────┐
│  companies  │
│             │
│ - id (PK)   │
│ - name      │
│ - domain ◆  │ (unique, dedup key)
│ - industry  │
│ - metadata  │
└──────┬──────┘
       │
       │ 1
       │
       ├──────────────────────────────┐
       │                              │
       │ N                            │ N
       │                              │
┌──────▼──────┐                ┌─────▼─────┐
│  prospects  │                │  signals  │
│             │                │           │
│ - id (PK)   │                │ - id (PK) │
│ - company ◆ │ (FK)           │ - co. ◆   │ (FK, nullable)
│ - name      │                │ - pros. ◆ │ (FK, nullable)
│ - email     │                │ - type    │
│ - title     │                │ - tags[]  │
│ - seniority │                │ - conf.   │
└──────┬──────┘                └─────┬─────┘
       │                              │
       │ 1                            │ 1
       │                              │
       │ N                            │ N
       │                              │
┌──────▼──────┐                ┌─────▼─────┐
│   matches   │                │ feedback  │
│             │                │           │
│ - id (PK)   │                │ - id (PK) │
│ - cand. ◆   │ (FK)           │ - signal◆ │ (FK)
│ - pros. ◆   │ (FK)           │ - type    │
│ - signal ◆  │ (FK, nullable) │ - note    │
│ - score     │                └───────────┘
│ - status    │
└──────▲──────┘
       │
       │ N
       │
       │ 1
       │
┌──────┴──────┐
│ candidates  │
│             │
│ - id (PK)   │
│ - name      │
│ - email     │
│ - skills[]  │
│ - status    │
└─────────────┘

Legend:
◆ = Indexed field
[] = Array type
PK = Primary Key
FK = Foreign Key
```

## Table Definitions

### 1. Companies

**Purpose:** Core company records with enrichment data from CSV uploads, RSS feeds, and manual entry.

**Deduplication Strategy:** `domain` field is unique (e.g., "acme.com"). Before inserting, check if domain exists; if yes, update existing record.

| Column               | Type        | Constraints        | Description                                           |
|---------------------|-------------|-------------------|-------------------------------------------------------|
| `id`                | UUID        | PRIMARY KEY       | Auto-generated unique identifier                       |
| `name`              | TEXT        | NOT NULL          | Company name (e.g., "Acme Corp")                      |
| `domain`            | TEXT        | NOT NULL, UNIQUE  | Company domain - dedup key (e.g., "acme.com")         |
| `industry`          | TEXT        | -                 | Industry classification (e.g., "Cybersecurity")        |
| `employee_count`    | INTEGER     | -                 | Number of employees                                    |
| `funding_stage`     | TEXT        | -                 | Funding stage (e.g., "Series B", "Public")            |
| `total_funding`     | NUMERIC     | -                 | Total funding raised (USD)                            |
| `revenue_range`     | TEXT        | -                 | Revenue bracket (e.g., "$10M-$50M")                   |
| `headquarters_location` | TEXT    | -                 | HQ location (e.g., "San Francisco, CA")               |
| `created_at`        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp                      |
| `updated_at`        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Auto-updated on modification (trigger)         |
| `source_of_truth`   | TEXT        | -                 | Data origin: "csv_upload", "rss", "manual", "api"    |
| `confidence_level`  | INTEGER     | CHECK 0-100       | Data quality score (higher = more reliable)           |
| `metadata`          | JSONB       | DEFAULT {}        | Flexible storage for additional enrichment fields     |

**Indexes:**
- `idx_companies_name` (TEXT) - for fuzzy search
- `idx_companies_industry` (TEXT) - for filtering by industry
- `idx_companies_confidence` (INTEGER) - for quality filtering
- UNIQUE constraint on `domain`

**Common Queries:**
```sql
-- Find company by domain (exact match)
SELECT * FROM companies WHERE domain = 'acme.com';

-- Fuzzy search by name
SELECT * FROM companies WHERE name ILIKE '%acme%';

-- High-confidence companies in cybersecurity
SELECT * FROM companies
WHERE industry = 'Cybersecurity'
  AND confidence_level >= 80
ORDER BY employee_count DESC;
```

---

### 2. Prospects

**Purpose:** Decision makers at companies (demand-side contacts). These are hiring managers, VPs, Directors, and C-level executives who make buying decisions.

**Relationship:** Many prospects belong to one company (`company_id` foreign key with CASCADE DELETE).

| Column               | Type        | Constraints        | Description                                           |
|---------------------|-------------|-------------------|-------------------------------------------------------|
| `id`                | UUID        | PRIMARY KEY       | Auto-generated unique identifier                       |
| `company_id`        | UUID        | NOT NULL, FK      | Foreign key to companies.id (CASCADE DELETE)          |
| `name`              | TEXT        | NOT NULL          | Full name (e.g., "Jane Smith")                        |
| `email`             | TEXT        | -                 | Email address                                         |
| `phone`             | TEXT        | -                 | Phone number                                          |
| `title`             | TEXT        | -                 | Job title (e.g., "VP of Engineering")                 |
| `seniority`         | TEXT        | -                 | Level: "C-Level", "VP", "Director", "Manager", "IC"  |
| `departments`       | TEXT[]      | DEFAULT []        | Array of departments (e.g., ["Engineering", "Security"]) |
| `linkedin_url`      | TEXT        | -                 | LinkedIn profile URL                                  |
| `location`          | TEXT        | -                 | Geographic location                                   |
| `created_at`        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp                      |
| `updated_at`        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Auto-updated on modification (trigger)         |
| `source_of_truth`   | TEXT        | -                 | Data origin: "csv_upload", "rss", "manual", "api"    |
| `confidence_level`  | INTEGER     | CHECK 0-100       | Data quality score                                    |
| `metadata`          | JSONB       | DEFAULT {}        | Flexible storage for additional fields                |

**Indexes:**
- `idx_prospects_company_id` (UUID) - for fast company-to-prospects joins
- `idx_prospects_email` (TEXT) - for deduplication and lookup
- `idx_prospects_seniority` (TEXT) - for filtering decision makers
- `idx_prospects_departments` (GIN) - for array search

**Common Queries:**
```sql
-- Get all prospects at a company
SELECT * FROM prospects
WHERE company_id = 'uuid-here'
ORDER BY seniority;

-- Find C-level security decision makers
SELECT p.*, c.name AS company_name
FROM prospects p
JOIN companies c ON p.company_id = c.id
WHERE p.seniority = 'C-Level'
  AND 'Security' = ANY(p.departments);

-- Check for duplicate emails
SELECT email, COUNT(*) AS duplicate_count, ARRAY_AGG(name) AS names
FROM prospects
GROUP BY email
HAVING COUNT(*) > 1;
```

---

### 3. Candidates

**Purpose:** Supply-side talent pool. Security professionals, engineers, and analysts available for placement. Independent from prospects (no foreign keys).

| Column                    | Type        | Constraints        | Description                                           |
|--------------------------|-------------|-------------------|-------------------------------------------------------|
| `id`                     | UUID        | PRIMARY KEY       | Auto-generated unique identifier                       |
| `name`                   | TEXT        | NOT NULL          | Full name                                             |
| `email`                  | TEXT        | -                 | Email address                                         |
| `phone`                  | TEXT        | -                 | Phone number                                          |
| `current_title`          | TEXT        | -                 | Current job title                                     |
| `current_company`        | TEXT        | -                 | Current employer                                      |
| `skills`                 | TEXT[]      | DEFAULT []        | Array of skills (e.g., ["AppSec", "Penetration Testing"]) |
| `years_experience`       | INTEGER     | -                 | Total years of experience                             |
| `compensation_expectation` | TEXT      | -                 | Salary expectation (e.g., "$150K-$180K")              |
| `availability`           | TEXT        | -                 | Timeline: "immediate", "2_weeks", "1_month", "3_months" |
| `linkedin_url`           | TEXT        | -                 | LinkedIn profile URL                                  |
| `resume_url`             | TEXT        | -                 | Link to resume (S3, Dropbox, etc.)                    |
| `recruiter_notes`        | TEXT        | -                 | Internal notes about candidate                        |
| `interview_history`      | JSONB       | DEFAULT []        | Array of interview records with companies             |
| `placement_status`       | TEXT        | DEFAULT 'active'  | Status: "active", "placed", "inactive"                |
| `created_at`             | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp                      |
| `updated_at`             | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Auto-updated on modification (trigger)         |
| `source_of_truth`        | TEXT        | -                 | Data origin: "csv_upload", "referral", "manual"       |
| `metadata`               | JSONB       | DEFAULT {}        | Flexible storage for additional fields                |

**Indexes:**
- `idx_candidates_email` (TEXT) - for deduplication and lookup
- `idx_candidates_skills` (GIN) - for array search on skills
- `idx_candidates_placement_status` (TEXT) - for filtering active candidates
- `idx_candidates_availability` (TEXT) - for filtering by availability

**Common Queries:**
```sql
-- Find candidates with specific skills
SELECT * FROM candidates
WHERE skills @> ARRAY['AppSec', 'Penetration Testing']
  AND placement_status = 'active';

-- Get immediately available candidates
SELECT * FROM candidates
WHERE availability = 'immediate'
  AND placement_status = 'active'
ORDER BY years_experience DESC;

-- Search by skill keyword (any match)
SELECT * FROM candidates
WHERE 'Cloud Security' = ANY(skills);
```

---

### 4. Signals

**Purpose:** Sales signals discovered from RSS feeds, CSV uploads, and manual entry. Signals are linked to companies and/or prospects and represent hiring opportunities, funding events, leadership changes, etc.

**Relationship:**
- Optional link to `companies.id` (CASCADE DELETE)
- Optional link to `prospects.id` (CASCADE DELETE)
- **Constraint:** At least one of `company_id` or `prospect_id` must be non-null

| Column               | Type        | Constraints        | Description                                           |
|---------------------|-------------|-------------------|-------------------------------------------------------|
| `id`                | UUID        | PRIMARY KEY       | Auto-generated unique identifier                       |
| `company_id`        | UUID        | FK (nullable)     | Foreign key to companies.id (CASCADE DELETE)          |
| `prospect_id`       | UUID        | FK (nullable)     | Foreign key to prospects.id (CASCADE DELETE)          |
| `signal_type`       | TEXT        | NOT NULL          | Category: "HIRING", "COMPANY", "INDIVIDUAL"           |
| `title`             | TEXT        | NOT NULL          | Brief description (e.g., "Hiring AppSec Engineer")    |
| `description`       | TEXT        | -                 | Full content or summary                               |
| `source`            | TEXT        | -                 | Source identifier (e.g., "techcrunch_rss", "csv_upload") |
| `source_url`        | TEXT        | -                 | Link to original content                              |
| `tags`              | TEXT[]      | DEFAULT []        | Classification tags (e.g., ["hiring_urgency:high", "expansion_signal"]) |
| `confidence_score`  | INTEGER     | CHECK 0-100       | Algorithm-generated quality score                     |
| `detected_at`       | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When signal was discovered                     |
| `is_active`         | BOOLEAN     | DEFAULT TRUE      | Soft delete flag (FALSE for aged-out signals)         |
| `engagement_status` | TEXT        | DEFAULT 'new'     | Lifecycle: "new", "contacted", "deal_won", "deal_lost" |
| `engaged_at`        | TIMESTAMPTZ | -                 | Timestamp when prospect was contacted                 |
| `created_at`        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp                      |
| `updated_at`        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Auto-updated on modification (trigger)         |
| `metadata`          | JSONB       | DEFAULT {}        | Flexible storage for extraction data                  |

**Indexes:**
- `idx_signals_company_id` (UUID) - for fast company signal lookups
- `idx_signals_prospect_id` (UUID) - for fast prospect signal lookups
- `idx_signals_type` (TEXT) - for filtering by category
- `idx_signals_is_active` (BOOLEAN) - for filtering active signals
- `idx_signals_detected_at` (TIMESTAMPTZ DESC) - for time-based queries
- `idx_signals_engagement_status` (TEXT) - for tracking conversions
- `idx_signals_tags` (GIN) - for array search on tags

**Signal Types:**
- **HIRING**: Job postings, hiring announcements, team expansion
- **COMPANY**: Funding, acquisitions, product launches, partnerships
- **INDIVIDUAL**: Promotions, new hires, leadership changes

**Signal Lifecycle:**
1. **new** - Signal detected, not yet acted upon
2. **contacted** - Prospect reached out to about this signal
3. **deal_won** - Signal resulted in successful placement/sale
4. **deal_lost** - Opportunity lost or signal irrelevant

**Common Queries:**
```sql
-- Get all active signals for a company
SELECT * FROM signals
WHERE company_id = 'uuid-here'
  AND is_active = TRUE
ORDER BY detected_at DESC;

-- Find high-urgency hiring signals
SELECT s.*, c.name AS company_name
FROM signals s
JOIN companies c ON s.company_id = c.id
WHERE s.signal_type = 'HIRING'
  AND s.tags @> ARRAY['hiring_urgency:high']
  AND s.is_active = TRUE;

-- Get new signals from last 7 days
SELECT * FROM signals
WHERE detected_at > NOW() - INTERVAL '7 days'
  AND engagement_status = 'new'
ORDER BY confidence_score DESC;
```

---

### 5. Matches

**Purpose:** Candidate-prospect pairings with scoring. Prepares for matching engine v2 where algorithm suggests candidates for specific hiring opportunities.

**Relationship:**
- Many-to-one with `candidates.id` (CASCADE DELETE)
- Many-to-one with `prospects.id` (CASCADE DELETE)
- Optional link to `signals.id` (SET NULL on delete)

| Column               | Type        | Constraints        | Description                                           |
|---------------------|-------------|-------------------|-------------------------------------------------------|
| `id`                | UUID        | PRIMARY KEY       | Auto-generated unique identifier                       |
| `candidate_id`      | UUID        | NOT NULL, FK      | Foreign key to candidates.id (CASCADE DELETE)         |
| `prospect_id`       | UUID        | NOT NULL, FK      | Foreign key to prospects.id (CASCADE DELETE)          |
| `signal_id`         | UUID        | FK (nullable)     | Foreign key to signals.id (SET NULL on delete)        |
| `match_score`       | INTEGER     | CHECK 0-100       | Algorithm-generated match quality score               |
| `match_reason`      | TEXT        | -                 | Explanation of why matched (e.g., "Skills align with job req") |
| `status`            | TEXT        | DEFAULT 'suggested' | Lifecycle: "suggested", "presented", "interviewing", "placed", "rejected" |
| `created_at`        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp                      |
| `updated_at`        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Auto-updated on modification (trigger)         |
| `metadata`          | JSONB       | DEFAULT {}        | Flexible storage for additional match data            |

**Indexes:**
- `idx_matches_candidate_id` (UUID) - for candidate-centric queries
- `idx_matches_prospect_id` (UUID) - for prospect-centric queries
- `idx_matches_signal_id` (UUID) - for signal-triggered matches
- `idx_matches_status` (TEXT) - for filtering active matches

**Match Lifecycle:**
1. **suggested** - Algorithm recommended this match
2. **presented** - Candidate profile shared with prospect
3. **interviewing** - Interview process underway
4. **placed** - Candidate hired
5. **rejected** - Match didn't work out

**Common Queries:**
```sql
-- Get all matches for a candidate
SELECT m.*, p.name AS prospect_name, p.title, c.name AS company_name
FROM matches m
JOIN prospects p ON m.prospect_id = p.id
JOIN companies c ON p.company_id = c.id
WHERE m.candidate_id = 'uuid-here';

-- Find active matches (not placed or rejected)
SELECT * FROM matches
WHERE status IN ('suggested', 'presented', 'interviewing')
ORDER BY match_score DESC;

-- Get matches triggered by specific signal
SELECT * FROM matches
WHERE signal_id = 'uuid-here';
```

---

### 6. Feedback

**Purpose:** User feedback on signals (thumbs up/down). Used to train filtering accuracy and improve confidence scoring over time.

**Relationship:** Many-to-one with `signals.id` (CASCADE DELETE)

| Column               | Type        | Constraints        | Description                                           |
|---------------------|-------------|-------------------|-------------------------------------------------------|
| `id`                | UUID        | PRIMARY KEY       | Auto-generated unique identifier                       |
| `signal_id`         | UUID        | NOT NULL, FK      | Foreign key to signals.id (CASCADE DELETE)            |
| `user_id`           | UUID        | -                 | Future: link to auth.users for multi-user support     |
| `feedback_type`     | TEXT        | NOT NULL, CHECK   | "thumbs_up" or "thumbs_down"                          |
| `feedback_note`     | TEXT        | -                 | Optional explanation of feedback                      |
| `created_at`        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Feedback timestamp                             |

**Indexes:**
- `idx_feedback_signal_id` (UUID) - for aggregating feedback per signal
- `idx_feedback_type` (TEXT) - for calculating positive/negative ratios
- `idx_feedback_user_id` (UUID) - for future user-specific analytics

**Common Queries:**
```sql
-- Get feedback stats for a signal
SELECT
  feedback_type,
  COUNT(*) AS count
FROM feedback
WHERE signal_id = 'uuid-here'
GROUP BY feedback_type;

-- Calculate overall positive feedback ratio
SELECT
  SUM(CASE WHEN feedback_type = 'thumbs_up' THEN 1 ELSE 0 END)::FLOAT / COUNT(*) AS positive_ratio
FROM feedback;

-- Find signals with negative feedback (for review)
SELECT DISTINCT s.*
FROM signals s
JOIN feedback f ON s.id = f.signal_id
WHERE f.feedback_type = 'thumbs_down'
  AND s.is_active = TRUE;
```

---

## Data Flow & Mapping

### CSV Upload → Database

**Companies CSV:**
```csv
company_name,domain,industry,employee_count,funding_stage
Acme Corp,acme.com,Cybersecurity,500,Series B
```

**Mapping to `companies` table:**
```sql
INSERT INTO companies (name, domain, industry, employee_count, funding_stage, source_of_truth, confidence_level)
VALUES ('Acme Corp', 'acme.com', 'Cybersecurity', 500, 'Series B', 'csv_upload', 75);
```

**Prospects CSV:**
```csv
name,email,title,seniority,company_domain
Jane Smith,jane@acme.com,VP of Engineering,VP,acme.com
```

**Mapping to `prospects` table:**
```sql
INSERT INTO prospects (company_id, name, email, title, seniority, source_of_truth, confidence_level)
SELECT
  c.id,
  'Jane Smith',
  'jane@acme.com',
  'VP of Engineering',
  'VP',
  'csv_upload',
  75
FROM companies c
WHERE c.domain = 'acme.com';
```

---

### RSS Feed → Signals

**Example: TechCrunch article about funding**

RSS Item:
```xml
<item>
  <title>Acme Corp raises $50M Series B to expand security platform</title>
  <link>https://techcrunch.com/2026/01/28/acme-funding</link>
  <description>Security startup Acme Corp announced today...</description>
  <pubDate>Tue, 28 Jan 2026 10:00:00 GMT</pubDate>
</item>
```

**Mapping to `signals` table:**
```sql
INSERT INTO signals (
  company_id,
  signal_type,
  title,
  description,
  source,
  source_url,
  tags,
  confidence_score,
  detected_at,
  source_of_truth
)
SELECT
  c.id,
  'COMPANY',
  'Acme Corp raises $50M Series B',
  'Full article text here...',
  'techcrunch_rss',
  'https://techcrunch.com/2026/01/28/acme-funding',
  ARRAY['funding_signal', 'expansion_signal', 'hiring_urgency:high'],
  85,
  '2026-01-28 10:00:00+00',
  'rss'
FROM companies c
WHERE c.domain = 'acme.com';
```

---

## Performance Considerations

### Indexing Strategy

1. **Foreign Keys:** All foreign key columns indexed for fast joins
2. **Array Columns:** GIN indexes on `skills`, `tags`, `departments` for containment queries (`@>`)
3. **Time-Based Queries:** `detected_at` indexed DESC for recent signals
4. **Status Filtering:** Indexes on `is_active`, `engagement_status`, `placement_status` for lifecycle queries

### Query Optimization Tips

**Good:**
```sql
-- Uses idx_signals_company_id and idx_signals_is_active
SELECT * FROM signals
WHERE company_id = 'uuid-here' AND is_active = TRUE;
```

**Bad:**
```sql
-- Full table scan (no index on title)
SELECT * FROM signals
WHERE title ILIKE '%hiring%';
```

**Better:**
```sql
-- Uses idx_signals_type and idx_signals_tags
SELECT * FROM signals
WHERE signal_type = 'HIRING'
  AND tags @> ARRAY['hiring_urgency:high'];
```

---

## Maintenance Operations

### 1. Age Out Old Signals

Signals older than 90 days with no engagement should be marked inactive:

```sql
UPDATE signals
SET is_active = FALSE
WHERE detected_at < NOW() - INTERVAL '90 days'
  AND engagement_status = 'new'
  AND is_active = TRUE;
```

**Schedule:** Run daily via cron job

---

### 2. Deduplicate Prospects

Find and merge duplicate prospects by email:

```sql
-- Find duplicates
SELECT email, COUNT(*) AS duplicate_count, ARRAY_AGG(id) AS prospect_ids
FROM prospects
GROUP BY email
HAVING COUNT(*) > 1;

-- Manual merge: Keep first, delete rest (update references first)
-- This requires application logic to merge metadata
```

---

### 3. Data Quality Report

Generate confidence level summary:

```sql
SELECT
  'companies' AS table_name,
  AVG(confidence_level) AS avg_confidence,
  COUNT(*) FILTER (WHERE confidence_level >= 80) AS high_confidence_count,
  COUNT(*) FILTER (WHERE confidence_level < 50) AS low_confidence_count,
  COUNT(*) AS total_count
FROM companies
UNION ALL
SELECT
  'prospects',
  AVG(confidence_level),
  COUNT(*) FILTER (WHERE confidence_level >= 80),
  COUNT(*) FILTER (WHERE confidence_level < 50),
  COUNT(*)
FROM prospects;
```

---

## Security & Access Control

### Row Level Security (RLS)

RLS is enabled on all tables with permissive policies for MVP (all authenticated users can access all data).

**Current Policy (MVP):**
```sql
CREATE POLICY "Enable all access for authenticated users" ON companies
  FOR ALL USING (auth.role() = 'authenticated');
```

**Future Enhancement (Multi-User):**
```sql
-- Example: Users can only see their own company's data
CREATE POLICY "Users see own company data" ON companies
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM user_company_access WHERE company_id = companies.id
  ));
```

---

## Migration Management

### Running Migrations

**Local Development (Supabase CLI):**
```bash
supabase db reset
supabase db push
```

**Production:**
```bash
supabase migration up --db-url $SUPABASE_URL
```

### Rollback Strategy

Migrations are **append-only**. To rollback:

1. Create new migration with `DROP TABLE` or `ALTER TABLE` statements
2. Test locally first
3. Deploy to production

---

## Troubleshooting

### Issue: Foreign key constraint violation

**Error:** `insert or update on table "prospects" violates foreign key constraint "prospects_company_id_fkey"`

**Cause:** Trying to insert prospect with `company_id` that doesn't exist

**Solution:** Insert company first, then prospects:
```sql
-- Step 1: Insert company
INSERT INTO companies (name, domain, ...) VALUES (...) RETURNING id;

-- Step 2: Insert prospect with company_id from step 1
INSERT INTO prospects (company_id, ...) VALUES ('uuid-from-step-1', ...);
```

---

### Issue: Signals constraint violation

**Error:** `new row for relation "signals" violates check constraint "signals_must_link_to_company_or_prospect"`

**Cause:** Both `company_id` and `prospect_id` are NULL

**Solution:** Provide at least one:
```sql
-- Link to company only
INSERT INTO signals (company_id, signal_type, title, ...) VALUES ('uuid', 'COMPANY', 'Funding', ...);

-- Link to prospect only
INSERT INTO signals (prospect_id, signal_type, title, ...) VALUES ('uuid', 'INDIVIDUAL', 'Promotion', ...);

-- Link to both
INSERT INTO signals (company_id, prospect_id, signal_type, title, ...) VALUES ('uuid1', 'uuid2', 'HIRING', 'Job Post', ...);
```

---

## Next Steps

After schema setup:

1. **Phase 1, Plan 02:** CSV upload interface with field mapping
2. **Phase 1, Plan 03:** RSS feed aggregator to populate signals
3. **Phase 2:** Agent architecture to enrich data and generate insights
4. **Phase 3:** Feedback loop to improve confidence scoring

---

## Appendix: Example Data

### Sample Company Record
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Acme Corp",
  "domain": "acme.com",
  "industry": "Cybersecurity",
  "employee_count": 500,
  "funding_stage": "Series B",
  "total_funding": 75000000,
  "revenue_range": "$50M-$100M",
  "headquarters_location": "San Francisco, CA",
  "source_of_truth": "csv_upload",
  "confidence_level": 85,
  "metadata": {
    "founded_year": 2018,
    "ceo": "John Doe",
    "tech_stack": ["AWS", "Kubernetes", "Python"]
  }
}
```

### Sample Signal Record
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "company_id": "550e8400-e29b-41d4-a716-446655440000",
  "prospect_id": null,
  "signal_type": "HIRING",
  "title": "Acme Corp hiring Senior AppSec Engineer",
  "description": "Acme Corp is looking for an experienced AppSec engineer to join their security team...",
  "source": "linkedin_jobs",
  "source_url": "https://linkedin.com/jobs/12345",
  "tags": ["hiring_urgency:high", "security_role", "senior_level"],
  "confidence_score": 90,
  "detected_at": "2026-01-28T10:00:00Z",
  "is_active": true,
  "engagement_status": "new",
  "metadata": {
    "job_location": "Remote",
    "salary_range": "$150K-$200K",
    "extracted_skills": ["AppSec", "SAST", "DAST", "Threat Modeling"]
  }
}
```

---

**End of Documentation**
