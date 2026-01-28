-- =====================================================
-- AI SECURITY RECRUITMENT PLATFORM - SCHEMA REFERENCE
-- =====================================================
-- This file provides a complete schema overview for reference
-- Actual migrations are in supabase/migrations/
-- Updated: 2026-01-28

-- =====================================================
-- TABLE OVERVIEW
-- =====================================================
-- 1. companies       - Core company records with enrichment data
-- 2. prospects       - Decision makers at companies (demand-side)
-- 3. candidates      - Talent pool (supply-side, independent)
-- 4. signals         - Sales signals linked to companies/prospects
-- 5. matches         - Candidate-prospect pairings with scoring
-- 6. feedback        - User feedback on signals (training data)

-- =====================================================
-- RELATIONSHIP DIAGRAM (Text-based ER)
-- =====================================================
--
-- companies (1) ──< (N) prospects
--     │
--     │ (1)
--     │
--     └─< (N) signals >─┐
--                       │
-- candidates (1)        │ (N)
--     │                 │
--     │ (1)            (1)
--     │                 │
--     └─< (N) matches <─┘
--             │
--             │ (N)
--             │
--            (1)
--             │
--          prospects
--
-- feedback (N) ──> (1) signals
--
-- Key relationships:
-- - One company has many prospects (ON DELETE CASCADE)
-- - One company has many signals (ON DELETE CASCADE)
-- - One prospect has many signals (ON DELETE CASCADE)
-- - One candidate can be matched to many prospects (matches table)
-- - One signal can receive many feedback entries (ON DELETE CASCADE)

-- =====================================================
-- TABLE DEFINITIONS
-- =====================================================

-- -------------------------------------------------
-- COMPANIES TABLE
-- -------------------------------------------------
-- Purpose: Core company records with enrichment data
-- Source: CSV uploads, RSS feeds, manual entry
-- Dedup key: domain (unique)

CREATE TABLE companies (
    -- Identity
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    domain TEXT NOT NULL UNIQUE,  -- Deduplication key (e.g., acme.com)

    -- Enrichment fields
    industry TEXT,
    employee_count INTEGER,
    funding_stage TEXT,           -- Seed, Series A, Series B, etc.
    total_funding NUMERIC,        -- Total funding amount
    revenue_range TEXT,           -- e.g., "$10M-$50M"
    headquarters_location TEXT,

    -- Audit metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_of_truth TEXT,         -- csv_upload, rss, manual, api
    confidence_level INTEGER CHECK (confidence_level >= 0 AND confidence_level <= 100),

    -- Flexible storage
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_industry ON companies(industry);
CREATE INDEX idx_companies_confidence ON companies(confidence_level);

-- Example queries:
-- Find company by domain:
--   SELECT * FROM companies WHERE domain = 'acme.com';
-- Search companies by name (fuzzy):
--   SELECT * FROM companies WHERE name ILIKE '%acme%';
-- Get high-confidence companies in specific industry:
--   SELECT * FROM companies WHERE industry = 'Cybersecurity' AND confidence_level >= 80;

-- -------------------------------------------------
-- PROSPECTS TABLE
-- -------------------------------------------------
-- Purpose: Decision makers at companies (demand-side contacts)
-- Links to: companies (many-to-one)
-- Cascade: Deleting company removes all prospects

CREATE TABLE prospects (
    -- Identity
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Contact fields
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,

    -- Professional details
    title TEXT,
    seniority TEXT,               -- C-Level, VP, Director, Manager, IC
    departments TEXT[] DEFAULT ARRAY[]::TEXT[],  -- [Engineering, Security, IT]
    linkedin_url TEXT,
    location TEXT,

    -- Audit metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_of_truth TEXT,
    confidence_level INTEGER CHECK (confidence_level >= 0 AND confidence_level <= 100),

    -- Flexible storage
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_prospects_company_id ON prospects(company_id);
CREATE INDEX idx_prospects_email ON prospects(email);
CREATE INDEX idx_prospects_seniority ON prospects(seniority);
CREATE INDEX idx_prospects_departments ON prospects USING GIN(departments);

-- Example queries:
-- Get all prospects at a company:
--   SELECT * FROM prospects WHERE company_id = 'uuid-here';
-- Find C-level security decision makers:
--   SELECT * FROM prospects WHERE seniority = 'C-Level' AND 'Security' = ANY(departments);
-- Check for duplicate emails:
--   SELECT email, COUNT(*) FROM prospects GROUP BY email HAVING COUNT(*) > 1;

-- -------------------------------------------------
-- CANDIDATES TABLE
-- -------------------------------------------------
-- Purpose: Supply-side talent pool (independent from prospects)
-- No foreign keys: Candidates exist independently

CREATE TABLE candidates (
    -- Identity
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Contact fields
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,

    -- Professional details
    current_title TEXT,
    current_company TEXT,
    skills TEXT[] DEFAULT ARRAY[]::TEXT[],  -- [AppSec, Penetration Testing, Cloud Security]
    years_experience INTEGER,

    -- Hiring details
    compensation_expectation TEXT,
    availability TEXT,            -- immediate, 2_weeks, 1_month, 3_months

    -- Resources
    linkedin_url TEXT,
    resume_url TEXT,

    -- Recruiter tracking
    recruiter_notes TEXT,
    interview_history JSONB DEFAULT '[]'::jsonb,  -- Array of interview records
    placement_status TEXT DEFAULT 'active',       -- active, placed, inactive

    -- Audit metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_of_truth TEXT,

    -- Flexible storage
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_candidates_skills ON candidates USING GIN(skills);
CREATE INDEX idx_candidates_placement_status ON candidates(placement_status);
CREATE INDEX idx_candidates_availability ON candidates(availability);

-- Example queries:
-- Find candidates with specific skills:
--   SELECT * FROM candidates WHERE skills @> ARRAY['AppSec', 'Penetration Testing'];
-- Get immediately available candidates:
--   SELECT * FROM candidates WHERE availability = 'immediate' AND placement_status = 'active';
-- Search by skill keyword:
--   SELECT * FROM candidates WHERE 'Cloud Security' = ANY(skills);

-- -------------------------------------------------
-- SIGNALS TABLE
-- -------------------------------------------------
-- Purpose: Sales signals from RSS feeds, CSV uploads, manual entry
-- Links to: companies (optional), prospects (optional)
-- Constraint: Must link to at least one of company_id OR prospect_id

CREATE TABLE signals (
    -- Identity
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,

    -- Signal classification
    signal_type TEXT NOT NULL,    -- HIRING, COMPANY, INDIVIDUAL
    title TEXT NOT NULL,
    description TEXT,

    -- Source tracking
    source TEXT,                  -- techcrunch_rss, csv_upload, linkedin
    source_url TEXT,              -- Link to original content

    -- Classification
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],  -- [hiring_urgency:high, competitor_signal, expansion_signal]
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),

    -- Lifecycle
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,       -- Soft delete for aging
    engagement_status TEXT DEFAULT 'new', -- new, contacted, deal_won, deal_lost
    engaged_at TIMESTAMPTZ,               -- When prospect was contacted

    -- Audit metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Flexible storage
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Constraints
    CONSTRAINT signals_must_link_to_company_or_prospect
        CHECK (company_id IS NOT NULL OR prospect_id IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_signals_company_id ON signals(company_id);
CREATE INDEX idx_signals_prospect_id ON signals(prospect_id);
CREATE INDEX idx_signals_type ON signals(signal_type);
CREATE INDEX idx_signals_is_active ON signals(is_active);
CREATE INDEX idx_signals_detected_at ON signals(detected_at DESC);
CREATE INDEX idx_signals_engagement_status ON signals(engagement_status);
CREATE INDEX idx_signals_tags ON signals USING GIN(tags);

-- Example queries:
-- Get all active signals for a company:
--   SELECT * FROM signals WHERE company_id = 'uuid-here' AND is_active = TRUE;
-- Find high-urgency hiring signals:
--   SELECT * FROM signals WHERE signal_type = 'HIRING' AND tags @> ARRAY['hiring_urgency:high'];
-- Get new signals from last 7 days:
--   SELECT * FROM signals WHERE detected_at > NOW() - INTERVAL '7 days' AND engagement_status = 'new';

-- -------------------------------------------------
-- MATCHES TABLE
-- -------------------------------------------------
-- Purpose: Candidate-prospect pairings with scoring (prepares for matching engine v2)
-- Links to: candidates (many-to-one), prospects (many-to-one), signals (optional)

CREATE TABLE matches (
    -- Identity
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    signal_id UUID REFERENCES signals(id) ON DELETE SET NULL,

    -- Match scoring
    match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
    match_reason TEXT,            -- Explanation of why matched

    -- Lifecycle
    status TEXT DEFAULT 'suggested',  -- suggested, presented, interviewing, placed, rejected

    -- Audit metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Flexible storage
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_matches_candidate_id ON matches(candidate_id);
CREATE INDEX idx_matches_prospect_id ON matches(prospect_id);
CREATE INDEX idx_matches_signal_id ON matches(signal_id);
CREATE INDEX idx_matches_status ON matches(status);

-- Example queries:
-- Get all matches for a candidate:
--   SELECT * FROM matches WHERE candidate_id = 'uuid-here';
-- Find active matches (not placed or rejected):
--   SELECT * FROM matches WHERE status IN ('suggested', 'presented', 'interviewing');
-- Get matches triggered by specific signal:
--   SELECT * FROM matches WHERE signal_id = 'uuid-here';

-- -------------------------------------------------
-- FEEDBACK TABLE
-- -------------------------------------------------
-- Purpose: User feedback on signals (trains filtering accuracy)
-- Links to: signals (many-to-one)
-- Used for: Improving confidence scoring and signal relevance

CREATE TABLE feedback (
    -- Identity
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_id UUID NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
    user_id UUID,                 -- Future: link to auth.users

    -- Feedback data
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down')),
    feedback_note TEXT,           -- Optional explanation

    -- Audit metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feedback_signal_id ON feedback(signal_id);
CREATE INDEX idx_feedback_type ON feedback(feedback_type);
CREATE INDEX idx_feedback_user_id ON feedback(user_id);

-- Example queries:
-- Get feedback stats for a signal:
--   SELECT feedback_type, COUNT(*) FROM feedback WHERE signal_id = 'uuid-here' GROUP BY feedback_type;
-- Calculate positive feedback ratio:
--   SELECT
--     SUM(CASE WHEN feedback_type = 'thumbs_up' THEN 1 ELSE 0 END)::FLOAT / COUNT(*) AS positive_ratio
--   FROM feedback;
-- Find signals with negative feedback:
--   SELECT DISTINCT signal_id FROM feedback WHERE feedback_type = 'thumbs_down';

-- =====================================================
-- COMMON QUERY PATTERNS
-- =====================================================

-- Pattern 1: Get all signals for a company with prospect context
-- SELECT
--   s.*,
--   c.name AS company_name,
--   p.name AS prospect_name,
--   p.title AS prospect_title
-- FROM signals s
-- LEFT JOIN companies c ON s.company_id = c.id
-- LEFT JOIN prospects p ON s.prospect_id = p.id
-- WHERE s.company_id = 'uuid-here'
-- ORDER BY s.detected_at DESC;

-- Pattern 2: Find candidates matching prospect's company industry
-- SELECT
--   cand.*,
--   c.industry AS target_industry
-- FROM candidates cand
-- CROSS JOIN (
--   SELECT DISTINCT c.industry
--   FROM prospects p
--   JOIN companies c ON p.company_id = c.id
--   WHERE p.id = 'prospect-uuid-here'
-- ) c
-- WHERE cand.placement_status = 'active';

-- Pattern 3: Get engagement pipeline summary
-- SELECT
--   engagement_status,
--   COUNT(*) AS signal_count,
--   AVG(confidence_score) AS avg_confidence
-- FROM signals
-- WHERE is_active = TRUE
-- GROUP BY engagement_status
-- ORDER BY
--   CASE engagement_status
--     WHEN 'new' THEN 1
--     WHEN 'contacted' THEN 2
--     WHEN 'deal_won' THEN 3
--     WHEN 'deal_lost' THEN 4
--   END;

-- =====================================================
-- CSV UPLOAD MAPPING EXAMPLES
-- =====================================================

-- Example 1: Import companies from CSV
-- CSV columns: company_name, domain, industry, employee_count
-- INSERT INTO companies (name, domain, industry, employee_count, source_of_truth, confidence_level)
-- VALUES ('Acme Corp', 'acme.com', 'Cybersecurity', 500, 'csv_upload', 75);

-- Example 2: Import prospects from CSV
-- CSV columns: name, email, title, company_domain
-- INSERT INTO prospects (company_id, name, email, title, source_of_truth, confidence_level)
-- SELECT
--   c.id,
--   'John Doe',
--   'john@acme.com',
--   'VP of Engineering',
--   'csv_upload',
--   75
-- FROM companies c
-- WHERE c.domain = 'acme.com';

-- =====================================================
-- RSS FEED MAPPING EXAMPLES
-- =====================================================

-- Example: Create signal from TechCrunch RSS article about funding
-- INSERT INTO signals (company_id, signal_type, title, description, source, source_url, tags, confidence_score, source_of_truth)
-- SELECT
--   c.id,
--   'COMPANY',
--   'Acme Corp raises $50M Series B',
--   'Full article text here...',
--   'techcrunch_rss',
--   'https://techcrunch.com/article-url',
--   ARRAY['funding_signal', 'expansion_signal', 'hiring_urgency:high'],
--   85,
--   'rss'
-- FROM companies c
-- WHERE c.domain = 'acme.com';

-- =====================================================
-- MAINTENANCE QUERIES
-- =====================================================

-- Age out old signals (mark inactive after 90 days with no engagement)
-- UPDATE signals
-- SET is_active = FALSE
-- WHERE detected_at < NOW() - INTERVAL '90 days'
--   AND engagement_status = 'new'
--   AND is_active = TRUE;

-- Find duplicate prospects by email
-- SELECT email, COUNT(*) AS duplicate_count, ARRAY_AGG(id) AS prospect_ids
-- FROM prospects
-- GROUP BY email
-- HAVING COUNT(*) > 1;

-- Get data quality summary
-- SELECT
--   'companies' AS table_name,
--   AVG(confidence_level) AS avg_confidence,
--   COUNT(*) FILTER (WHERE confidence_level >= 80) AS high_confidence_count,
--   COUNT(*) AS total_count
-- FROM companies
-- UNION ALL
-- SELECT
--   'prospects',
--   AVG(confidence_level),
--   COUNT(*) FILTER (WHERE confidence_level >= 80),
--   COUNT(*)
-- FROM prospects;

-- =====================================================
-- END OF SCHEMA REFERENCE
-- =====================================================
