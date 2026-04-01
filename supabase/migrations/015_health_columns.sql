-- Migration 015: Add health tracking columns to distribution_accounts
--
-- The HealthDrawer UI and /api/accounts/[id]/health route query these columns.
-- The original schema (010) had `last_error` and `consecutive_failures` but
-- was missing the timestamp columns needed for health timeline display.

-- Add missing health columns
ALTER TABLE distribution_accounts
  ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_failure_at TIMESTAMPTZ;

-- Rename last_error → last_error_message for consistency with API response
-- (only if the old column exists and new one doesn't)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'distribution_accounts' AND column_name = 'last_error'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'distribution_accounts' AND column_name = 'last_error_message'
  ) THEN
    ALTER TABLE distribution_accounts RENAME COLUMN last_error TO last_error_message;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'distribution_accounts' AND column_name = 'last_error_message'
  ) THEN
    ALTER TABLE distribution_accounts ADD COLUMN last_error_message TEXT;
  END IF;
END $$;
