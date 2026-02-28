-- =====================================================
-- Migration 009: Consolidate Duplicate Trigger Functions
--                + Fix Hardcoded Count Validation
-- =====================================================
-- Addresses ANALYSIS_REPORT.md Section 6.2 and 6.3
--
-- Problem (6.2): Migrations 003 and 004 each created their own
-- copy of the updated_at trigger function, identical to the
-- shared one in migration 001 (update_updated_at_column).
--
-- Fix: Drop the duplicate functions, re-point triggers at the
-- shared function from migration 001.
--
-- Problem (6.3): Migration 007 has IF openrouter_count != 8
-- which breaks idempotency if run after model insertions.
-- That check ran at migration time and can't be retroactively
-- fixed, but we document it here for clarity.

-- =====================================================
-- 1. CONSOLIDATE ai_api_keys TRIGGER (from migration 003)
-- =====================================================
-- Drop the duplicate trigger, recreate pointing to shared function
DROP TRIGGER IF EXISTS ai_api_keys_updated_at_trigger ON ai_api_keys;

CREATE TRIGGER ai_api_keys_updated_at_trigger
  BEFORE UPDATE ON ai_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop the now-unused duplicate function
DROP FUNCTION IF EXISTS update_ai_api_keys_updated_at();

-- =====================================================
-- 2. CONSOLIDATE ai_credit_balances TRIGGER (from migration 004)
-- =====================================================
-- Drop the duplicate trigger, recreate pointing to shared function
DROP TRIGGER IF EXISTS ai_credit_balances_updated_at ON ai_credit_balances;

CREATE TRIGGER ai_credit_balances_updated_at
  BEFORE UPDATE ON ai_credit_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop the now-unused duplicate function
DROP FUNCTION IF EXISTS update_ai_credit_balances_updated_at();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- 2 duplicate trigger functions removed
-- 2 triggers re-pointed to shared update_updated_at_column()
-- All tables with updated_at now use the single shared function
