-- =====================================================
-- Migration 012: Breadcrumb Studio Schema
-- =====================================================
-- Video bookmarking and content creation tables
-- Namespaced with studio_ prefix alongside recruitment schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------
-- STUDIO_VIDEOS
-- -------------------------------------------------
CREATE TABLE studio_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'youtube')),
    source_url TEXT,
    file_url TEXT,
    title TEXT NOT NULL,
    duration_seconds NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT videos_source_check CHECK (
        (source_type = 'youtube' AND source_url IS NOT NULL) OR
        (source_type = 'upload' AND file_url IS NOT NULL)
    )
);

CREATE INDEX idx_studio_videos_user_id ON studio_videos(user_id);
CREATE INDEX idx_studio_videos_created_at ON studio_videos(created_at DESC);

-- -------------------------------------------------
-- STUDIO_BREADCRUMBS
-- -------------------------------------------------
CREATE TABLE studio_breadcrumbs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES studio_videos(id) ON DELETE CASCADE,
    timestamp_seconds NUMERIC NOT NULL,
    start_time_seconds NUMERIC NOT NULL,
    end_time_seconds NUMERIC NOT NULL,
    note TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT breadcrumbs_time_valid CHECK (
        start_time_seconds >= 0
        AND end_time_seconds > start_time_seconds
    )
);

CREATE INDEX idx_studio_breadcrumbs_video_id ON studio_breadcrumbs(video_id);
CREATE INDEX idx_studio_breadcrumbs_timestamp ON studio_breadcrumbs(timestamp_seconds);
CREATE INDEX idx_studio_breadcrumbs_tags ON studio_breadcrumbs USING GIN(tags);

-- -------------------------------------------------
-- STUDIO_COMPILATIONS
-- -------------------------------------------------
CREATE TABLE studio_compilations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES studio_videos(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_studio_compilations_video_id ON studio_compilations(video_id);

-- -------------------------------------------------
-- STUDIO_COMPILATION_BREADCRUMBS (Join Table)
-- -------------------------------------------------
CREATE TABLE studio_compilation_breadcrumbs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    compilation_id UUID NOT NULL REFERENCES studio_compilations(id) ON DELETE CASCADE,
    breadcrumb_id UUID NOT NULL REFERENCES studio_breadcrumbs(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,

    UNIQUE(compilation_id, breadcrumb_id)
);

CREATE INDEX idx_studio_comp_bc_compilation ON studio_compilation_breadcrumbs(compilation_id);
CREATE INDEX idx_studio_comp_bc_breadcrumb ON studio_compilation_breadcrumbs(breadcrumb_id);

-- -------------------------------------------------
-- STUDIO_OUTPUTS
-- -------------------------------------------------
CREATE TABLE studio_outputs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    breadcrumb_id UUID REFERENCES studio_breadcrumbs(id) ON DELETE SET NULL,
    compilation_id UUID REFERENCES studio_compilations(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('clip', 'post', 'compilation')),
    text_content TEXT,
    file_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT outputs_source_check CHECK (
        breadcrumb_id IS NOT NULL OR compilation_id IS NOT NULL
    )
);

CREATE INDEX idx_studio_outputs_breadcrumb ON studio_outputs(breadcrumb_id);
CREATE INDEX idx_studio_outputs_compilation ON studio_outputs(compilation_id);
CREATE INDEX idx_studio_outputs_status ON studio_outputs(status);

-- -------------------------------------------------
-- STUDIO_JOBS (Simple async job queue)
-- -------------------------------------------------
CREATE TABLE studio_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    output_id UUID NOT NULL REFERENCES studio_outputs(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('extract_clip', 'generate_post', 'compile_video')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    error_message TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_studio_jobs_status ON studio_jobs(status);
CREATE INDEX idx_studio_jobs_output ON studio_jobs(output_id);
CREATE INDEX idx_studio_jobs_pending ON studio_jobs(status, created_at) WHERE status = 'pending';

-- -------------------------------------------------
-- UPDATED_AT TRIGGERS
-- -------------------------------------------------
CREATE OR REPLACE FUNCTION studio_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_studio_videos_updated_at
    BEFORE UPDATE ON studio_videos
    FOR EACH ROW EXECUTE FUNCTION studio_update_updated_at();

CREATE TRIGGER trg_studio_breadcrumbs_updated_at
    BEFORE UPDATE ON studio_breadcrumbs
    FOR EACH ROW EXECUTE FUNCTION studio_update_updated_at();

CREATE TRIGGER trg_studio_compilations_updated_at
    BEFORE UPDATE ON studio_compilations
    FOR EACH ROW EXECUTE FUNCTION studio_update_updated_at();

CREATE TRIGGER trg_studio_outputs_updated_at
    BEFORE UPDATE ON studio_outputs
    FOR EACH ROW EXECUTE FUNCTION studio_update_updated_at();

CREATE TRIGGER trg_studio_jobs_updated_at
    BEFORE UPDATE ON studio_jobs
    FOR EACH ROW EXECUTE FUNCTION studio_update_updated_at();
