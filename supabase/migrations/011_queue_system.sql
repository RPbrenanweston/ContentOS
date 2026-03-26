-- =====================================================
-- Migration 011: Queue System + Profiles
-- =====================================================
-- Adds: publishing_queues, queue_slots, profiles
-- Supports: recurring posting cadences, AI auto-fill,
--           and multi-brand identity management

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE day_of_week AS ENUM (
  'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'saturday', 'sunday'
);

CREATE TYPE queue_slot_status AS ENUM (
  'empty', 'filled', 'published', 'skipped'
);

-- =====================================================
-- 1. PROFILES (Multi-brand support)
-- =====================================================
-- A profile groups distribution accounts under a brand
-- identity. A creator might have "Personal", "Company",
-- "Client X" profiles.

CREATE TABLE profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  avatar_url    TEXT,
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_user ON profiles(user_id);
CREATE UNIQUE INDEX idx_profiles_default ON profiles(user_id) WHERE is_default = TRUE;

-- Link distribution accounts to profiles
ALTER TABLE distribution_accounts
  ADD COLUMN profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX idx_dist_accounts_profile ON distribution_accounts(profile_id);

-- =====================================================
-- 2. PUBLISHING_QUEUES
-- =====================================================
-- A queue defines a recurring publishing cadence for a
-- specific distribution account. Example: "Post to my
-- LinkedIn every Mon/Wed/Fri at 9:00 AM"

CREATE TABLE publishing_queues (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL,
  distribution_account_id UUID NOT NULL REFERENCES distribution_accounts(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL DEFAULT 'Default',
  timezone                TEXT NOT NULL DEFAULT 'UTC',
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  metadata                JSONB DEFAULT '{}'::jsonb,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_queues_user ON publishing_queues(user_id);
CREATE INDEX idx_queues_account ON publishing_queues(distribution_account_id);

-- =====================================================
-- 3. QUEUE_SCHEDULES
-- =====================================================
-- Individual time slots within a queue. Each represents
-- a recurring day+time when content should be published.

CREATE TABLE queue_schedules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publishing_queue_id UUID NOT NULL REFERENCES publishing_queues(id) ON DELETE CASCADE,
  day_of_week       day_of_week NOT NULL,
  time_of_day       TIME NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(publishing_queue_id, day_of_week, time_of_day)
);

CREATE INDEX idx_schedules_queue ON queue_schedules(publishing_queue_id);

-- =====================================================
-- 4. QUEUE_SLOTS
-- =====================================================
-- Materialized instances of schedule slots. Each slot
-- represents a specific date+time and can be filled
-- with an approved derived asset.

CREATE TABLE queue_slots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publishing_queue_id UUID NOT NULL REFERENCES publishing_queues(id) ON DELETE CASCADE,
  queue_schedule_id UUID REFERENCES queue_schedules(id) ON DELETE SET NULL,
  derived_asset_id  UUID REFERENCES derived_assets(id) ON DELETE SET NULL,
  scheduled_for     TIMESTAMPTZ NOT NULL,
  status            queue_slot_status NOT NULL DEFAULT 'empty',
  distribution_job_id UUID REFERENCES distribution_jobs(id) ON DELETE SET NULL,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_slots_queue ON queue_slots(publishing_queue_id);
CREATE INDEX idx_slots_scheduled ON queue_slots(scheduled_for)
  WHERE status IN ('empty', 'filled');
CREATE INDEX idx_slots_asset ON queue_slots(derived_asset_id);

-- =====================================================
-- 5. PUBLISHING_LOGS
-- =====================================================
-- Audit trail for all publishing attempts.
-- 7-day retention (enforce via cron/policy).

CREATE TABLE publishing_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL,
  distribution_job_id UUID REFERENCES distribution_jobs(id) ON DELETE SET NULL,
  event_type          TEXT NOT NULL,  -- 'attempt', 'success', 'failure', 'retry', 'unpublish'
  platform            platform_type NOT NULL,
  account_name        TEXT,
  external_post_id    TEXT,
  error_message       TEXT,
  request_payload     JSONB,
  response_payload    JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pub_logs_user ON publishing_logs(user_id);
CREATE INDEX idx_pub_logs_job ON publishing_logs(distribution_job_id);
CREATE INDEX idx_pub_logs_created ON publishing_logs(created_at DESC);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_publishing_queues_updated_at
  BEFORE UPDATE ON publishing_queues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_queue_slots_updated_at
  BEFORE UPDATE ON queue_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishing_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profiles"
  ON profiles FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own queues"
  ON publishing_queues FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own queue schedules"
  ON queue_schedules FOR ALL
  USING (publishing_queue_id IN (
    SELECT id FROM publishing_queues WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users manage own queue slots"
  ON queue_slots FOR ALL
  USING (publishing_queue_id IN (
    SELECT id FROM publishing_queues WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users view own publishing logs"
  ON publishing_logs FOR ALL
  USING (auth.uid() = user_id);
