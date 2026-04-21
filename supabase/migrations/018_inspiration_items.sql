-- =====================================================
-- Migration 018: Inspiration Items (Phase 1)
-- =====================================================
-- Creates: inspiration_items, inspiration_highlights,
--          content_inspiration_refs (junction to content_nodes)
-- NOTE: pgvector embedding columns intentionally deferred to Phase 3.
-- Reuses shared update_updated_at_column() trigger function from
-- earlier migrations (001 / 010).

-- =====================================================
-- 1. INSPIRATION ITEMS
-- =====================================================

CREATE TABLE public.inspiration_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_url TEXT,
    -- Normalized URL for dedup: lowercase host, strip trailing slash, drop utm_*
    source_url_normalized TEXT,
    source_type TEXT NOT NULL CHECK (source_type IN (
        'article', 'tweet', 'youtube', 'substack',
        'linkedin', 'pdf', 'image', 'manual'
    )),
    title TEXT,
    author TEXT,
    author_handle TEXT,
    published_at TIMESTAMPTZ,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    captured_via TEXT CHECK (captured_via IN (
        'share_sheet', 'extension', 'manual', 'email'
    )),
    body_markdown TEXT,
    body_html TEXT,
    media_url TEXT,
    raw JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'fetching', 'processing', 'ready', 'error'
    )),
    error TEXT,
    user_rating SMALLINT CHECK (user_rating BETWEEN -1 AND 2),
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inspiration_items_user_captured
    ON public.inspiration_items (user_id, captured_at DESC);

CREATE INDEX idx_inspiration_items_user_url_norm
    ON public.inspiration_items (user_id, source_url_normalized)
    WHERE source_url_normalized IS NOT NULL;

CREATE INDEX idx_inspiration_items_user_status
    ON public.inspiration_items (user_id, status);

CREATE TRIGGER update_inspiration_items_updated_at
    BEFORE UPDATE ON public.inspiration_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.inspiration_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own inspiration items" ON public.inspiration_items
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 2. INSPIRATION HIGHLIGHTS
-- =====================================================

CREATE TABLE public.inspiration_highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspiration_item_id UUID NOT NULL REFERENCES public.inspiration_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    highlight_type TEXT NOT NULL CHECK (highlight_type IN (
        'key_idea', 'hook', 'quote', 'structure_note',
        'tonal_marker', 'vocabulary_note', 'user_highlight'
    )),
    content TEXT NOT NULL,
    rationale TEXT,
    source_offset INT,
    position SMALLINT NOT NULL DEFAULT 0,
    user_created BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inspiration_highlights_item_position
    ON public.inspiration_highlights (inspiration_item_id, position);

ALTER TABLE public.inspiration_highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own inspiration highlights" ON public.inspiration_highlights
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 3. CONTENT <-> INSPIRATION REFERENCE JUNCTION
-- =====================================================

CREATE TABLE public.content_inspiration_refs (
    content_node_id UUID NOT NULL REFERENCES public.content_nodes(id) ON DELETE CASCADE,
    inspiration_item_id UUID NOT NULL REFERENCES public.inspiration_items(id) ON DELETE CASCADE,
    highlight_id UUID REFERENCES public.inspiration_highlights(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (
        content_node_id,
        inspiration_item_id,
        COALESCE(highlight_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
);

CREATE INDEX idx_content_inspiration_refs_user
    ON public.content_inspiration_refs (user_id);

ALTER TABLE public.content_inspiration_refs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own content-inspiration refs" ON public.content_inspiration_refs
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
