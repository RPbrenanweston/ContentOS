-- =====================================================
-- Migration 010: Content OS Domain Tables
-- =====================================================
-- Creates: content_nodes, content_segments, derived_assets,
--          distribution_accounts, distribution_jobs, performance_metrics

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE content_node_type AS ENUM ('blog', 'video', 'audio');

CREATE TYPE content_node_status AS ENUM (
  'draft', 'processing', 'ready', 'published', 'archived'
);

CREATE TYPE segment_type AS ENUM (
  'idea', 'quote', 'hook', 'clip_candidate', 'chapter',
  'statistic', 'story', 'cta'
);

CREATE TYPE asset_type AS ENUM (
  'social_post', 'clip', 'carousel', 'email_draft',
  'blog_summary', 'thread'
);

CREATE TYPE asset_status AS ENUM (
  'generating', 'draft', 'approved', 'published', 'failed'
);

CREATE TYPE platform_type AS ENUM (
  'linkedin', 'x', 'youtube', 'tiktok', 'instagram', 'newsletter'
);

CREATE TYPE distribution_job_status AS ENUM (
  'pending', 'scheduled', 'publishing', 'published', 'failed', 'cancelled'
);

-- =====================================================
-- 1. CONTENT_NODES
-- =====================================================

CREATE TABLE content_nodes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  title         TEXT NOT NULL,
  content_type  content_node_type NOT NULL,
  status        content_node_status NOT NULL DEFAULT 'draft',
  body_text     TEXT,
  body_html     TEXT,
  source_url    TEXT,
  source_mime_type TEXT,
  duration_ms   INTEGER,
  word_count    INTEGER,
  summary       TEXT,
  tags          TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_nodes_user_id ON content_nodes(user_id);
CREATE INDEX idx_content_nodes_status ON content_nodes(status);
CREATE INDEX idx_content_nodes_type ON content_nodes(content_type);
CREATE INDEX idx_content_nodes_created_at ON content_nodes(created_at DESC);
CREATE INDEX idx_content_nodes_tags ON content_nodes USING GIN(tags);

-- =====================================================
-- 2. CONTENT_SEGMENTS
-- =====================================================

CREATE TABLE content_segments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_node_id UUID NOT NULL REFERENCES content_nodes(id) ON DELETE CASCADE,
  segment_type    segment_type NOT NULL,
  title           TEXT,
  body            TEXT NOT NULL,
  start_ms        INTEGER,
  end_ms          INTEGER,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  confidence      NUMERIC(4,3),
  tags            TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_segments_node_id ON content_segments(content_node_id);
CREATE INDEX idx_segments_type ON content_segments(segment_type);
CREATE INDEX idx_segments_sort ON content_segments(content_node_id, sort_order);

-- =====================================================
-- 3. DERIVED_ASSETS
-- =====================================================

CREATE TABLE derived_assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_node_id   UUID NOT NULL REFERENCES content_nodes(id) ON DELETE CASCADE,
  asset_type        asset_type NOT NULL,
  status            asset_status NOT NULL DEFAULT 'draft',
  title             TEXT,
  body              TEXT NOT NULL,
  platform_hint     platform_type,
  media_url         TEXT,
  source_segment_ids UUID[] DEFAULT ARRAY[]::UUID[],
  generation_prompt TEXT,
  ai_model          TEXT,
  version           INTEGER NOT NULL DEFAULT 1,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_node_id ON derived_assets(content_node_id);
CREATE INDEX idx_assets_type ON derived_assets(asset_type);
CREATE INDEX idx_assets_status ON derived_assets(status);
CREATE INDEX idx_assets_platform ON derived_assets(platform_hint);

-- =====================================================
-- 4. DISTRIBUTION_ACCOUNTS
-- =====================================================

CREATE TABLE distribution_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL,
  platform              platform_type NOT NULL,
  account_name          TEXT NOT NULL,
  external_account_id   TEXT NOT NULL,
  profile_image_url     TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  metadata              JSONB DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform, external_account_id)
);

CREATE INDEX idx_dist_accounts_user ON distribution_accounts(user_id);
CREATE INDEX idx_dist_accounts_platform ON distribution_accounts(platform);

-- =====================================================
-- 5. DISTRIBUTION_JOBS
-- =====================================================

CREATE TABLE distribution_jobs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  derived_asset_id        UUID NOT NULL REFERENCES derived_assets(id) ON DELETE CASCADE,
  distribution_account_id UUID NOT NULL REFERENCES distribution_accounts(id) ON DELETE CASCADE,
  status                  distribution_job_status NOT NULL DEFAULT 'pending',
  scheduled_at            TIMESTAMPTZ,
  published_at            TIMESTAMPTZ,
  external_post_id        TEXT,
  external_post_url       TEXT,
  error_message           TEXT,
  retry_count             INTEGER NOT NULL DEFAULT 0,
  metadata                JSONB DEFAULT '{}'::jsonb,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_asset ON distribution_jobs(derived_asset_id);
CREATE INDEX idx_jobs_account ON distribution_jobs(distribution_account_id);
CREATE INDEX idx_jobs_status ON distribution_jobs(status);
CREATE INDEX idx_jobs_scheduled ON distribution_jobs(scheduled_at)
  WHERE status = 'scheduled';

-- =====================================================
-- 6. PERFORMANCE_METRICS
-- =====================================================

CREATE TABLE performance_metrics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_job_id UUID NOT NULL REFERENCES distribution_jobs(id) ON DELETE CASCADE,
  impressions         INTEGER DEFAULT 0,
  views               INTEGER DEFAULT 0,
  clicks              INTEGER DEFAULT 0,
  likes               INTEGER DEFAULT 0,
  comments            INTEGER DEFAULT 0,
  shares              INTEGER DEFAULT 0,
  saves               INTEGER DEFAULT 0,
  engagement_rate     NUMERIC(6,4),
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_metrics_job ON performance_metrics(distribution_job_id);
CREATE INDEX idx_metrics_fetched ON performance_metrics(fetched_at DESC);

-- =====================================================
-- TRIGGERS (reuse shared update_updated_at_column)
-- =====================================================

CREATE TRIGGER update_content_nodes_updated_at
  BEFORE UPDATE ON content_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_segments_updated_at
  BEFORE UPDATE ON content_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_derived_assets_updated_at
  BEFORE UPDATE ON derived_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_distribution_accounts_updated_at
  BEFORE UPDATE ON distribution_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_distribution_jobs_updated_at
  BEFORE UPDATE ON distribution_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE content_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE derived_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own content nodes"
  ON content_nodes FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users view own segments"
  ON content_segments FOR ALL
  USING (content_node_id IN (
    SELECT id FROM content_nodes WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users manage own derived assets"
  ON derived_assets FOR ALL
  USING (content_node_id IN (
    SELECT id FROM content_nodes WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users manage own distribution accounts"
  ON distribution_accounts FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own distribution jobs"
  ON distribution_jobs FOR ALL
  USING (distribution_account_id IN (
    SELECT id FROM distribution_accounts WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users view own metrics"
  ON performance_metrics FOR ALL
  USING (distribution_job_id IN (
    SELECT dj.id FROM distribution_jobs dj
    JOIN distribution_accounts da ON dj.distribution_account_id = da.id
    WHERE da.user_id = auth.uid()
  ));
