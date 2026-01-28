-- =====================================================
-- Migration 001: Initial Schema for AI Security Recruitment Platform
-- =====================================================
-- Creates core tables: companies, prospects, candidates, signals, matches, feedback
-- Establishes foreign key relationships, indexes, and audit triggers
-- Implements basic RLS for future multi-user support

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. COMPANIES TABLE
-- =====================================================
-- Core company records with enrichment data and audit metadata

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    domain TEXT NOT NULL UNIQUE,
    industry TEXT,
    employee_count INTEGER,
    funding_stage TEXT,
    total_funding NUMERIC,
    revenue_range TEXT,
    headquarters_location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_of_truth TEXT,
    confidence_level INTEGER CHECK (confidence_level >= 0 AND confidence_level <= 100),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_industry ON companies(industry);
CREATE INDEX idx_companies_confidence ON companies(confidence_level);

-- Comments for documentation
COMMENT ON TABLE companies IS 'Core company records with enrichment data from CSV uploads, RSS feeds, and manual entry';
COMMENT ON COLUMN companies.domain IS 'Unique company domain (e.g., acme.com) - used as deduplication key';
COMMENT ON COLUMN companies.confidence_level IS 'Data quality score 0-100, higher = more reliable enrichment';
COMMENT ON COLUMN companies.source_of_truth IS 'Origin of record: csv_upload, rss, manual, api';
COMMENT ON COLUMN companies.metadata IS 'Flexible JSONB storage for additional enrichment fields';

-- =====================================================
-- 2. PROSPECTS TABLE
-- =====================================================
-- Decision makers at companies (demand-side contacts)

CREATE TABLE prospects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    title TEXT,
    seniority TEXT,
    departments TEXT[] DEFAULT ARRAY[]::TEXT[],
    linkedin_url TEXT,
    location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_of_truth TEXT,
    confidence_level INTEGER CHECK (confidence_level >= 0 AND confidence_level <= 100),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_prospects_company_id ON prospects(company_id);
CREATE INDEX idx_prospects_email ON prospects(email);
CREATE INDEX idx_prospects_seniority ON prospects(seniority);
CREATE INDEX idx_prospects_departments ON prospects USING GIN(departments);

-- Comments for documentation
COMMENT ON TABLE prospects IS 'Decision makers at companies - hiring managers, VPs, Directors, C-level';
COMMENT ON COLUMN prospects.seniority IS 'Level: C-Level, VP, Director, Manager, IC';
COMMENT ON COLUMN prospects.departments IS 'Array of departments (e.g., [Engineering, Security, IT])';
COMMENT ON COLUMN prospects.company_id IS 'Foreign key to companies - CASCADE DELETE if company removed';

-- =====================================================
-- 3. CANDIDATES TABLE
-- =====================================================
-- Supply-side talent pool (independent from prospects)

CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    current_title TEXT,
    current_company TEXT,
    skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    years_experience INTEGER,
    compensation_expectation TEXT,
    availability TEXT,
    linkedin_url TEXT,
    resume_url TEXT,
    recruiter_notes TEXT,
    interview_history JSONB DEFAULT '[]'::jsonb,
    placement_status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_of_truth TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_candidates_skills ON candidates USING GIN(skills);
CREATE INDEX idx_candidates_placement_status ON candidates(placement_status);
CREATE INDEX idx_candidates_availability ON candidates(availability);

-- Comments for documentation
COMMENT ON TABLE candidates IS 'Supply-side talent pool - security professionals, engineers, analysts';
COMMENT ON COLUMN candidates.skills IS 'Array of skills (e.g., [AppSec, Penetration Testing, Cloud Security])';
COMMENT ON COLUMN candidates.availability IS 'Hiring timeline: immediate, 2_weeks, 1_month, 3_months';
COMMENT ON COLUMN candidates.placement_status IS 'Status: active, placed, inactive';
COMMENT ON COLUMN candidates.interview_history IS 'JSONB array of interview records with companies';

-- =====================================================
-- 4. SIGNALS TABLE
-- =====================================================
-- Sales signals linked to companies and/or prospects

CREATE TABLE signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    source TEXT,
    source_url TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    engagement_status TEXT DEFAULT 'new',
    engaged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT signals_must_link_to_company_or_prospect
        CHECK (company_id IS NOT NULL OR prospect_id IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX idx_signals_company_id ON signals(company_id);
CREATE INDEX idx_signals_prospect_id ON signals(prospect_id);
CREATE INDEX idx_signals_type ON signals(signal_type);
CREATE INDEX idx_signals_is_active ON signals(is_active);
CREATE INDEX idx_signals_detected_at ON signals(detected_at DESC);
CREATE INDEX idx_signals_engagement_status ON signals(engagement_status);
CREATE INDEX idx_signals_tags ON signals USING GIN(tags);

-- Comments for documentation
COMMENT ON TABLE signals IS 'Sales signals from RSS feeds, CSV uploads, and manual entry - linked to companies or prospects';
COMMENT ON COLUMN signals.signal_type IS 'Category: HIRING, COMPANY, INDIVIDUAL (e.g., HIRING=job posting, COMPANY=funding, INDIVIDUAL=promotion)';
COMMENT ON COLUMN signals.tags IS 'Array of classification tags: hiring_urgency:high, competitor_signal, expansion_signal';
COMMENT ON COLUMN signals.confidence_score IS 'Algorithm-generated quality score 0-100';
COMMENT ON COLUMN signals.is_active IS 'Soft delete flag - FALSE for aged-out or irrelevant signals';
COMMENT ON COLUMN signals.engagement_status IS 'Lifecycle: new, contacted, deal_won, deal_lost';
COMMENT ON COLUMN signals.engaged_at IS 'Timestamp when prospect was contacted about this signal';

-- =====================================================
-- 5. MATCHES TABLE
-- =====================================================
-- Candidate-prospect pairings (prepares for matching engine v2)

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    signal_id UUID REFERENCES signals(id) ON DELETE SET NULL,
    match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
    match_reason TEXT,
    status TEXT DEFAULT 'suggested',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_matches_candidate_id ON matches(candidate_id);
CREATE INDEX idx_matches_prospect_id ON matches(prospect_id);
CREATE INDEX idx_matches_signal_id ON matches(signal_id);
CREATE INDEX idx_matches_status ON matches(status);

-- Comments for documentation
COMMENT ON TABLE matches IS 'Candidate-prospect pairings with scoring and lifecycle tracking';
COMMENT ON COLUMN matches.match_score IS 'Algorithm-generated match quality 0-100';
COMMENT ON COLUMN matches.status IS 'Lifecycle: suggested, presented, interviewing, placed, rejected';
COMMENT ON COLUMN matches.signal_id IS 'Optional link to signal that triggered the match';

-- =====================================================
-- 6. FEEDBACK TABLE
-- =====================================================
-- User feedback on signals (trains filtering accuracy)

CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_id UUID NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
    user_id UUID,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down')),
    feedback_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_feedback_signal_id ON feedback(signal_id);
CREATE INDEX idx_feedback_type ON feedback(feedback_type);
CREATE INDEX idx_feedback_user_id ON feedback(user_id);

-- Comments for documentation
COMMENT ON TABLE feedback IS 'User thumbs up/down on signals - used to train filtering and improve confidence scoring';
COMMENT ON COLUMN feedback.user_id IS 'Future: link to auth.users for multi-user support';
COMMENT ON COLUMN feedback.feedback_type IS 'thumbs_up or thumbs_down';

-- =====================================================
-- 7. UPDATED_AT TRIGGER FUNCTION
-- =====================================================
-- Automatically updates updated_at timestamp on row modification

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prospects_updated_at
    BEFORE UPDATE ON prospects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
    BEFORE UPDATE ON candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_signals_updated_at
    BEFORE UPDATE ON signals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS) SETUP
-- =====================================================
-- Enable RLS on all tables for future multi-user support
-- MVP: Permissive policies allow all authenticated users

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Permissive policies for MVP (all authenticated users can access)
-- TODO: Replace with user-specific policies when multi-user support added

CREATE POLICY "Enable all access for authenticated users" ON companies
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON prospects
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON candidates
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON signals
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON matches
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON feedback
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- 9. HELPFUL VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Active signals with company context
CREATE VIEW active_signals_with_companies AS
SELECT
    s.id,
    s.signal_type,
    s.title,
    s.description,
    s.confidence_score,
    s.detected_at,
    s.engagement_status,
    s.tags,
    c.name AS company_name,
    c.domain AS company_domain,
    c.industry AS company_industry,
    c.employee_count
FROM signals s
LEFT JOIN companies c ON s.company_id = c.id
WHERE s.is_active = TRUE
ORDER BY s.detected_at DESC;

COMMENT ON VIEW active_signals_with_companies IS 'Active signals enriched with company context - most common query for dashboard';

-- View: Prospects with company details
CREATE VIEW prospects_with_companies AS
SELECT
    p.id,
    p.name,
    p.email,
    p.title,
    p.seniority,
    p.departments,
    p.linkedin_url,
    c.name AS company_name,
    c.domain AS company_domain,
    c.industry AS company_industry,
    c.employee_count,
    c.funding_stage
FROM prospects p
JOIN companies c ON p.company_id = c.id
ORDER BY p.created_at DESC;

COMMENT ON VIEW prospects_with_companies IS 'Prospects with company context - useful for contact list exports';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- All tables, indexes, constraints, triggers, and RLS policies created
-- Schema ready for CSV uploads, RSS feed ingestion, and agent operations
