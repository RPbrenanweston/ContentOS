-- =====================================================
-- @crumb migration-014-rls-tightening
-- DAT | Security | Row Level Security hardening
-- why: Tighten RLS across Content OS and Studio tables: add WITH CHECK to write
--      operations, and enable RLS on studio tables that shipped without policies
-- hazard: Removing the old policies and recreating them is a brief window where
--         rows are unprotected — run this migration in a maintenance window or
--         use Supabase's transactional DDL support
-- hazard: service-role clients bypass RLS; ensure all background jobs still use
--         createServiceClient() — never createServerClient() for cross-user ops
-- edge: supabase/migrations/010_content_os_schema.sql -> EXTENDS (replaces policies)
-- edge: supabase/migrations/012_breadcrumb_studio.sql -> EXTENDS (adds missing RLS)
-- =====================================================
-- Migration 014: Tighten RLS to per-user scoping
-- Changes:
--   1. Content OS tables (010): replace USING-only policies with USING + WITH CHECK
--   2. Studio tables (012): enable RLS and add per-user policies (none existed)
-- =====================================================

-- =====================================================
-- SECTION 1: Content OS — add WITH CHECK to all policies
-- =====================================================
-- Migration 010 enabled RLS and added USING clauses but omitted WITH CHECK.
-- Without WITH CHECK, Postgres allows writes that would be invisible to the
-- row owner (e.g. inserting with a different user_id still succeeds).
-- These replacements make USING and WITH CHECK consistent.

-- -------------------------------------------------------
-- 1a. content_nodes  (direct user_id column)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own content nodes" ON content_nodes;

CREATE POLICY "Users can access own content_nodes"
  ON content_nodes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------
-- 1b. content_segments  (ownership via content_nodes)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Users view own segments" ON content_segments;

CREATE POLICY "Users can access own content_segments"
  ON content_segments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM content_nodes
      WHERE content_nodes.id = content_segments.content_node_id
        AND content_nodes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content_nodes
      WHERE content_nodes.id = content_segments.content_node_id
        AND content_nodes.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 1c. derived_assets  (ownership via content_nodes)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own derived assets" ON derived_assets;

CREATE POLICY "Users can access own derived_assets"
  ON derived_assets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM content_nodes
      WHERE content_nodes.id = derived_assets.content_node_id
        AND content_nodes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content_nodes
      WHERE content_nodes.id = derived_assets.content_node_id
        AND content_nodes.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 1d. distribution_accounts  (direct user_id column)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own distribution accounts" ON distribution_accounts;

CREATE POLICY "Users can access own distribution_accounts"
  ON distribution_accounts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------
-- 1e. distribution_jobs  (ownership via distribution_accounts)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own distribution jobs" ON distribution_jobs;

CREATE POLICY "Users can access own distribution_jobs"
  ON distribution_jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM distribution_accounts
      WHERE distribution_accounts.id = distribution_jobs.distribution_account_id
        AND distribution_accounts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM distribution_accounts
      WHERE distribution_accounts.id = distribution_jobs.distribution_account_id
        AND distribution_accounts.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 1f. performance_metrics  (ownership via distribution_jobs → distribution_accounts)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Users view own metrics" ON performance_metrics;

CREATE POLICY "Users can access own performance_metrics"
  ON performance_metrics
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM distribution_jobs dj
      JOIN distribution_accounts da ON da.id = dj.distribution_account_id
      WHERE dj.id = performance_metrics.distribution_job_id
        AND da.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM distribution_jobs dj
      JOIN distribution_accounts da ON da.id = dj.distribution_account_id
      WHERE dj.id = performance_metrics.distribution_job_id
        AND da.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 1g. profiles  (direct user_id column — 011 already has WITH CHECK via USING, no change needed)
-- Drop and recreate for consistency with explicit WITH CHECK
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own profiles" ON profiles;

CREATE POLICY "Users can access own profiles"
  ON profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------
-- 1h. publishing_queues  (direct user_id column)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own queues" ON publishing_queues;

CREATE POLICY "Users can access own publishing_queues"
  ON publishing_queues
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------
-- 1i. queue_schedules  (ownership via publishing_queues)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own queue schedules" ON queue_schedules;

CREATE POLICY "Users can access own queue_schedules"
  ON queue_schedules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM publishing_queues
      WHERE publishing_queues.id = queue_schedules.publishing_queue_id
        AND publishing_queues.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM publishing_queues
      WHERE publishing_queues.id = queue_schedules.publishing_queue_id
        AND publishing_queues.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 1j. queue_slots  (ownership via publishing_queues)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own queue slots" ON queue_slots;

CREATE POLICY "Users can access own queue_slots"
  ON queue_slots
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM publishing_queues
      WHERE publishing_queues.id = queue_slots.publishing_queue_id
        AND publishing_queues.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM publishing_queues
      WHERE publishing_queues.id = queue_slots.publishing_queue_id
        AND publishing_queues.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 1k. publishing_logs  (direct user_id column)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Users view own publishing logs" ON publishing_logs;

CREATE POLICY "Users can access own publishing_logs"
  ON publishing_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- SECTION 2: Studio tables — enable RLS (none existed in 012)
-- =====================================================
-- Migration 012 created the studio schema with no RLS at all. Any authenticated
-- user could read or write any other user's videos, breadcrumbs, and compilations.

-- -------------------------------------------------------
-- 2a. studio_videos  (direct user_id column)
-- -------------------------------------------------------
ALTER TABLE studio_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own studio_videos"
  ON studio_videos
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------
-- 2b. studio_breadcrumbs  (ownership via studio_videos)
-- -------------------------------------------------------
ALTER TABLE studio_breadcrumbs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own studio_breadcrumbs"
  ON studio_breadcrumbs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM studio_videos
      WHERE studio_videos.id = studio_breadcrumbs.video_id
        AND studio_videos.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM studio_videos
      WHERE studio_videos.id = studio_breadcrumbs.video_id
        AND studio_videos.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 2c. studio_compilations  (ownership via studio_videos)
-- -------------------------------------------------------
ALTER TABLE studio_compilations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own studio_compilations"
  ON studio_compilations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM studio_videos
      WHERE studio_videos.id = studio_compilations.video_id
        AND studio_videos.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM studio_videos
      WHERE studio_videos.id = studio_compilations.video_id
        AND studio_videos.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 2d. studio_compilation_breadcrumbs  (ownership via studio_compilations → studio_videos)
-- -------------------------------------------------------
ALTER TABLE studio_compilation_breadcrumbs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own studio_compilation_breadcrumbs"
  ON studio_compilation_breadcrumbs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM studio_compilations sc
      JOIN studio_videos sv ON sv.id = sc.video_id
      WHERE sc.id = studio_compilation_breadcrumbs.compilation_id
        AND sv.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM studio_compilations sc
      JOIN studio_videos sv ON sv.id = sc.video_id
      WHERE sc.id = studio_compilation_breadcrumbs.compilation_id
        AND sv.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 2e. studio_outputs  (ownership via studio_breadcrumbs or studio_compilations → studio_videos)
--     An output is accessible if the user owns either the linked breadcrumb's video
--     or the linked compilation's video.
-- -------------------------------------------------------
ALTER TABLE studio_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own studio_outputs"
  ON studio_outputs
  FOR ALL
  USING (
    (
      studio_outputs.breadcrumb_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM studio_breadcrumbs sb
        JOIN studio_videos sv ON sv.id = sb.video_id
        WHERE sb.id = studio_outputs.breadcrumb_id
          AND sv.user_id = auth.uid()
      )
    )
    OR (
      studio_outputs.compilation_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM studio_compilations sc
        JOIN studio_videos sv ON sv.id = sc.video_id
        WHERE sc.id = studio_outputs.compilation_id
          AND sv.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    (
      studio_outputs.breadcrumb_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM studio_breadcrumbs sb
        JOIN studio_videos sv ON sv.id = sb.video_id
        WHERE sb.id = studio_outputs.breadcrumb_id
          AND sv.user_id = auth.uid()
      )
    )
    OR (
      studio_outputs.compilation_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM studio_compilations sc
        JOIN studio_videos sv ON sv.id = sc.video_id
        WHERE sc.id = studio_outputs.compilation_id
          AND sv.user_id = auth.uid()
      )
    )
  );

-- -------------------------------------------------------
-- 2f. studio_jobs  (ownership via studio_outputs → breadcrumb/compilation → studio_videos)
-- -------------------------------------------------------
ALTER TABLE studio_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own studio_jobs"
  ON studio_jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM studio_outputs so
      WHERE so.id = studio_jobs.output_id
        AND (
          (
            so.breadcrumb_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM studio_breadcrumbs sb
              JOIN studio_videos sv ON sv.id = sb.video_id
              WHERE sb.id = so.breadcrumb_id
                AND sv.user_id = auth.uid()
            )
          )
          OR (
            so.compilation_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM studio_compilations sc
              JOIN studio_videos sv ON sv.id = sc.video_id
              WHERE sc.id = so.compilation_id
                AND sv.user_id = auth.uid()
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM studio_outputs so
      WHERE so.id = studio_jobs.output_id
        AND (
          (
            so.breadcrumb_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM studio_breadcrumbs sb
              JOIN studio_videos sv ON sv.id = sb.video_id
              WHERE sb.id = so.breadcrumb_id
                AND sv.user_id = auth.uid()
            )
          )
          OR (
            so.compilation_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM studio_compilations sc
              JOIN studio_videos sv ON sv.id = sc.video_id
              WHERE sc.id = so.compilation_id
                AND sv.user_id = auth.uid()
            )
          )
        )
    )
  );
