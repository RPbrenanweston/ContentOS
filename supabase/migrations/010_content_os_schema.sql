-- =====================================================
-- Migration 010: Content-OS Core Schema
-- =====================================================
-- Creates: content_nodes, podcast_shows, content_segments,
--          derived_assets, distribution_accounts (real OAuth),
--          distribution_jobs, podcast_analytics, media_processing_jobs
-- Plus: pgcrypto token encryption functions

-- Enable pgcrypto for token encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 1. PODCAST SHOWS (must exist before content_nodes references it)
-- =====================================================

CREATE TABLE podcast_shows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    author TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    category TEXT NOT NULL,
    subcategory TEXT,
    artwork_url TEXT NOT NULL,
    feed_url TEXT,
    website_url TEXT,
    explicit BOOLEAN DEFAULT FALSE,
    show_type TEXT DEFAULT 'episodic' CHECK (show_type IN ('episodic', 'serial')),
    copyright TEXT,
    imported_from_url TEXT,
    last_import_at TIMESTAMPTZ,
    accent_color TEXT DEFAULT '#000000',
    custom_css TEXT,
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT unique_show_slug_per_user UNIQUE (user_id, slug)
);

CREATE INDEX idx_podcast_shows_user ON podcast_shows(user_id);
CREATE INDEX idx_podcast_shows_slug ON podcast_shows(slug);

CREATE TRIGGER update_podcast_shows_updated_at
    BEFORE UPDATE ON podcast_shows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE podcast_shows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own shows" ON podcast_shows
    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public read for published shows" ON podcast_shows
    FOR SELECT USING (true);

-- =====================================================
-- 2. CONTENT NODES (universal content entity)
-- =====================================================

CREATE TABLE content_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('blog', 'video', 'audio', 'podcast_episode')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'ready', 'published', 'archived')),
    title TEXT NOT NULL,
    description TEXT,
    body JSONB,
    slug TEXT,
    media_url TEXT,
    media_duration_seconds INTEGER,
    media_size_bytes BIGINT,
    thumbnail_url TEXT,
    waveform_data JSONB,
    -- Podcast-specific
    show_id UUID REFERENCES podcast_shows(id) ON DELETE SET NULL,
    episode_number INTEGER,
    season_number INTEGER,
    episode_type TEXT CHECK (episode_type IN ('full', 'trailer', 'bonus')),
    explicit BOOLEAN DEFAULT FALSE,
    transcript JSONB,
    chapters JSONB,
    show_notes TEXT,
    -- SEO
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    canonical_url TEXT,
    og_image_url TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_content_nodes_user ON content_nodes(user_id);
CREATE INDEX idx_content_nodes_type ON content_nodes(content_type);
CREATE INDEX idx_content_nodes_status ON content_nodes(status);
CREATE INDEX idx_content_nodes_show ON content_nodes(show_id);
CREATE INDEX idx_content_nodes_published ON content_nodes(published_at DESC);
CREATE INDEX idx_content_nodes_slug ON content_nodes(slug);
CREATE INDEX idx_content_nodes_tags ON content_nodes USING GIN(tags);

CREATE TRIGGER update_content_nodes_updated_at
    BEFORE UPDATE ON content_nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE content_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own content" ON content_nodes
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 3. CONTENT SEGMENTS
-- =====================================================

CREATE TABLE content_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_node_id UUID NOT NULL REFERENCES content_nodes(id) ON DELETE CASCADE,
    segment_type TEXT NOT NULL CHECK (segment_type IN (
        'idea', 'quote', 'hook', 'clip_candidate', 'chapter',
        'key_point', 'call_to_action', 'story', 'statistic'
    )),
    title TEXT,
    body TEXT NOT NULL,
    start_seconds NUMERIC,
    end_seconds NUMERIC,
    start_offset INTEGER,
    end_offset INTEGER,
    confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
    extraction_model TEXT,
    is_manual BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_segments_content_node ON content_segments(content_node_id);
CREATE INDEX idx_segments_type ON content_segments(segment_type);
CREATE INDEX idx_segments_time ON content_segments(start_seconds, end_seconds);

CREATE TRIGGER update_content_segments_updated_at
    BEFORE UPDATE ON content_segments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE content_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage segments via content ownership" ON content_segments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM content_nodes cn
            WHERE cn.id = content_segments.content_node_id
            AND cn.user_id = auth.uid()
        )
    );

-- =====================================================
-- 4. DERIVED ASSETS
-- =====================================================

CREATE TABLE derived_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_node_id UUID NOT NULL REFERENCES content_nodes(id) ON DELETE CASCADE,
    segment_id UUID REFERENCES content_segments(id) ON DELETE SET NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN (
        'social_post', 'clip', 'carousel', 'audiogram',
        'quote_image', 'thread', 'newsletter_block', 'blog_excerpt',
        'transcript_snippet', 'show_notes_summary'
    )),
    title TEXT,
    body TEXT,
    media_url TEXT,
    media_duration_seconds INTEGER,
    target_platform TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'scheduled', 'published', 'failed')),
    generation_model TEXT,
    generation_prompt TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_derived_assets_content ON derived_assets(content_node_id);
CREATE INDEX idx_derived_assets_segment ON derived_assets(segment_id);
CREATE INDEX idx_derived_assets_type ON derived_assets(asset_type);
CREATE INDEX idx_derived_assets_status ON derived_assets(status);
CREATE INDEX idx_derived_assets_platform ON derived_assets(target_platform);

CREATE TRIGGER update_derived_assets_updated_at
    BEFORE UPDATE ON derived_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE derived_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage derived assets via content ownership" ON derived_assets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM content_nodes cn
            WHERE cn.id = derived_assets.content_node_id
            AND cn.user_id = auth.uid()
        )
    );

-- =====================================================
-- 5. DISTRIBUTION ACCOUNTS (real OAuth — replaces fake manual)
-- =====================================================

CREATE TABLE distribution_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN (
        'twitter', 'linkedin', 'youtube', 'tiktok', 'instagram',
        'facebook', 'threads', 'bluesky', 'reddit',
        'medium', 'substack', 'ghost', 'beehiiv'
    )),
    platform_account_id TEXT NOT NULL,
    platform_username TEXT,
    platform_display_name TEXT,
    platform_avatar_url TEXT,
    -- OAuth tokens (encrypted via pgcrypto)
    access_token_encrypted BYTEA NOT NULL,
    refresh_token_encrypted BYTEA,
    token_expires_at TIMESTAMPTZ,
    token_scopes TEXT[],
    -- Account health
    is_active BOOLEAN DEFAULT TRUE,
    last_verified_at TIMESTAMPTZ,
    last_error TEXT,
    consecutive_failures INTEGER DEFAULT 0,
    rate_limit_remaining INTEGER,
    rate_limit_reset_at TIMESTAMPTZ,
    -- Platform-specific config
    platform_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_platform_account UNIQUE (user_id, platform, platform_account_id)
);

CREATE INDEX idx_dist_accounts_user ON distribution_accounts(user_id);
CREATE INDEX idx_dist_accounts_platform ON distribution_accounts(platform);
CREATE INDEX idx_dist_accounts_active ON distribution_accounts(is_active);
CREATE INDEX idx_dist_accounts_token_expiry ON distribution_accounts(token_expires_at);

CREATE TRIGGER update_distribution_accounts_updated_at
    BEFORE UPDATE ON distribution_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE distribution_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own distribution accounts" ON distribution_accounts
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 6. DISTRIBUTION JOBS
-- =====================================================

CREATE TABLE distribution_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    derived_asset_id UUID REFERENCES derived_assets(id) ON DELETE SET NULL,
    content_node_id UUID REFERENCES content_nodes(id) ON DELETE SET NULL,
    account_id UUID NOT NULL REFERENCES distribution_accounts(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ,
    content_snapshot JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'scheduled', 'processing', 'published', 'failed', 'cancelled'
    )),
    platform_post_id TEXT,
    platform_post_url TEXT,
    published_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_dist_jobs_user ON distribution_jobs(user_id);
CREATE INDEX idx_dist_jobs_account ON distribution_jobs(account_id);
CREATE INDEX idx_dist_jobs_status ON distribution_jobs(status);
CREATE INDEX idx_dist_jobs_scheduled ON distribution_jobs(scheduled_at);
CREATE INDEX idx_dist_jobs_next_retry ON distribution_jobs(next_retry_at);

CREATE TRIGGER update_distribution_jobs_updated_at
    BEFORE UPDATE ON distribution_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE distribution_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own distribution jobs" ON distribution_jobs
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 7. PODCAST ANALYTICS (privacy-preserving)
-- =====================================================

CREATE TABLE podcast_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_node_id UUID NOT NULL REFERENCES content_nodes(id) ON DELETE CASCADE,
    show_id UUID REFERENCES podcast_shows(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'download', 'stream', 'play', 'pause', 'seek',
        'complete', 'partial_listen', 'embed_view'
    )),
    listener_hash TEXT NOT NULL,
    country_code TEXT,
    region TEXT,
    city TEXT,
    user_agent_family TEXT,
    device_type TEXT,
    listened_seconds INTEGER,
    total_seconds INTEGER,
    listen_percentage NUMERIC,
    referrer_domain TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_podcast_analytics_content ON podcast_analytics(content_node_id);
CREATE INDEX idx_podcast_analytics_show ON podcast_analytics(show_id);
CREATE INDEX idx_podcast_analytics_event ON podcast_analytics(event_type);
CREATE INDEX idx_podcast_analytics_date ON podcast_analytics(created_at);
CREATE INDEX idx_podcast_analytics_country ON podcast_analytics(country_code);
CREATE INDEX idx_podcast_analytics_client ON podcast_analytics(user_agent_family);

ALTER TABLE podcast_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own show analytics" ON podcast_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM podcast_shows ps
            WHERE ps.id = podcast_analytics.show_id
            AND ps.user_id = auth.uid()
        )
    );

-- =====================================================
-- 8. MEDIA PROCESSING JOBS
-- =====================================================

CREATE TABLE media_processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_node_id UUID REFERENCES content_nodes(id) ON DELETE SET NULL,
    job_type TEXT NOT NULL CHECK (job_type IN (
        'normalize', 'trim', 'add_intro_outro', 'extract_clip',
        'generate_waveform', 'transcribe', 'extract_chapters',
        'generate_audiogram', 'convert_format'
    )),
    input_url TEXT NOT NULL,
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed'
    )),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_jobs_user ON media_processing_jobs(user_id);
CREATE INDEX idx_media_jobs_content ON media_processing_jobs(content_node_id);
CREATE INDEX idx_media_jobs_status ON media_processing_jobs(status);

CREATE TRIGGER update_media_processing_jobs_updated_at
    BEFORE UPDATE ON media_processing_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE media_processing_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own media jobs" ON media_processing_jobs
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 9. TOKEN ENCRYPTION FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION encrypt_token(plain_token TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(
        plain_token,
        current_setting('app.settings.token_encryption_key')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_token(encrypted_token BYTEA)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(
        encrypted_token,
        current_setting('app.settings.token_encryption_key')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION encrypt_token FROM PUBLIC;
REVOKE ALL ON FUNCTION decrypt_token FROM PUBLIC;
GRANT EXECUTE ON FUNCTION encrypt_token TO service_role;
GRANT EXECUTE ON FUNCTION decrypt_token TO service_role;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
