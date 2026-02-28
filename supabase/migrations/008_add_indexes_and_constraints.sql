-- =====================================================
-- Migration 008: Add Missing Indexes and CHECK Constraints
-- =====================================================
-- Adds compound indexes on ai_usage_log for analytics queries
-- Adds CHECK constraints on ai_credit_balances for data integrity
-- Reference: ANALYSIS_REPORT.md Section 6.1

-- =====================================================
-- 1. COMPOUND INDEXES ON ai_usage_log
-- =====================================================
-- These cover analytics queries that the billing and reporting code runs
-- but were not indexed in migration 002.

-- Usage by model over time (model performance dashboards)
CREATE INDEX idx_usage_model_date ON ai_usage_log(model, created_at DESC);

-- Usage by provider over time (provider comparison, cost analysis)
CREATE INDEX idx_usage_provider_date ON ai_usage_log(provider, created_at DESC);

-- Per-feature analytics within an app (feature-level cost breakdown)
CREATE INDEX idx_usage_app_feature_date ON ai_usage_log(app_id, feature_id, created_at DESC);

-- =====================================================
-- 2. CHECK CONSTRAINTS ON ai_credit_balances
-- =====================================================
-- Prevent invalid data at the database level.

-- Credits remaining must not go negative
ALTER TABLE ai_credit_balances
  ADD CONSTRAINT chk_credits_remaining_non_negative
  CHECK (credits_remaining_usd >= 0);

-- Credits used must not go negative
ALTER TABLE ai_credit_balances
  ADD CONSTRAINT chk_credits_used_non_negative
  CHECK (credits_used_usd >= 0);

-- Spending cap, if set, must be positive
ALTER TABLE ai_credit_balances
  ADD CONSTRAINT chk_spending_cap_positive
  CHECK (spending_cap_usd IS NULL OR spending_cap_usd > 0);

-- Admin cap, if set, must be positive
ALTER TABLE ai_credit_balances
  ADD CONSTRAINT chk_admin_cap_positive
  CHECK (admin_cap_usd IS NULL OR admin_cap_usd > 0);

-- Period end must be after period start
ALTER TABLE ai_credit_balances
  ADD CONSTRAINT chk_period_end_after_start
  CHECK (period_end > period_start);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- 3 compound indexes added to ai_usage_log
-- 5 CHECK constraints added to ai_credit_balances
