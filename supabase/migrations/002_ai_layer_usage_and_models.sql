-- =====================================================
-- Migration 002: AI Layer — Usage Tracking and Model Registry
-- =====================================================
-- Creates ai_usage_log for metering all AI calls across apps
-- Creates ai_models table with pricing and model registry
-- Establishes indexes for efficient querying
-- Design: docs/SHARED_AI_LAYER_DESIGN.md Section 4.1 and 4.4

-- =====================================================
-- 1. AI USAGE LOG TABLE
-- =====================================================
-- Core table: every AI call across all apps, all users, all providers
-- Used for billing, debugging, usage analytics, per-app metrics

CREATE TABLE ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID,                          -- for team/org billing (nullable for solo users)
  app_id TEXT NOT NULL,                  -- 'express_recruitment' | 'scorecard' | 'sales_block'
  feature_id TEXT NOT NULL,              -- 'generate-rubric' | 'classify-signal' | etc.

  -- LLM details
  provider TEXT NOT NULL,                -- 'anthropic' | 'openai'
  model TEXT NOT NULL,                   -- 'claude-sonnet-4-20250514' | 'gpt-4o'
  tokens_in INTEGER NOT NULL,
  tokens_out INTEGER NOT NULL,
  cost_usd NUMERIC(10,6) NOT NULL,

  -- Operational
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_code TEXT,                       -- null on success, error type on failure
  key_source TEXT NOT NULL DEFAULT 'managed', -- 'managed' | 'byok'

  -- Metadata
  metadata JSONB DEFAULT '{}',           -- app-specific context (never prompt content)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries across different dimensions
-- Index 1: User-level usage by date (billing, user dashboard)
CREATE INDEX idx_usage_user_date ON ai_usage_log(user_id, created_at DESC);

-- Index 2: Per-app usage tracking (app-specific analytics)
CREATE INDEX idx_usage_app_date ON ai_usage_log(app_id, created_at DESC);

-- Index 3: Org-level usage for team billing (org dashboard)
CREATE INDEX idx_usage_org_date ON ai_usage_log(org_id, created_at DESC) WHERE org_id IS NOT NULL;

-- Index 4: Billing-specific: managed vs BYOK key usage per user
CREATE INDEX idx_usage_billing ON ai_usage_log(user_id, key_source, created_at DESC);

-- Comments for documentation
COMMENT ON TABLE ai_usage_log IS 'Core metering table: every AI call across all apps logged here for billing and analytics';
COMMENT ON COLUMN ai_usage_log.user_id IS 'References auth.users - cascade delete if user removed';
COMMENT ON COLUMN ai_usage_log.org_id IS 'Optional org context for team/org-level billing (null for solo users)';
COMMENT ON COLUMN ai_usage_log.app_id IS 'Which app made the call: express_recruitment, scorecard, sales_block';
COMMENT ON COLUMN ai_usage_log.feature_id IS 'Feature within the app that triggered the call (for per-feature usage breakdown)';
COMMENT ON COLUMN ai_usage_log.cost_usd IS 'Pre-calculated cost based on tokens and model pricing (for instant billing accuracy)';
COMMENT ON COLUMN ai_usage_log.latency_ms IS 'Time from request to response completion (for performance tracking)';
COMMENT ON COLUMN ai_usage_log.key_source IS 'Whether call used user''s BYOK key or managed key (affects billing)';

-- =====================================================
-- 2. AI MODELS TABLE
-- =====================================================
-- Model registry: available models, their pricing, and capabilities
-- Referenced by ai_usage_log to calculate costs, guides model selection UI

CREATE TABLE ai_models (
  id TEXT PRIMARY KEY,                   -- 'claude-sonnet-4-20250514'
  provider TEXT NOT NULL,                -- 'anthropic' | 'openai'
  display_name TEXT NOT NULL,            -- 'Claude Sonnet 4' (for UI display)
  cost_per_input_token NUMERIC(12,10) NOT NULL,   -- cost per 1M input tokens
  cost_per_output_token NUMERIC(12,10) NOT NULL,  -- cost per 1M output tokens
  max_context_tokens INTEGER NOT NULL,
  max_output_tokens INTEGER NOT NULL,
  supports_streaming BOOLEAN DEFAULT true,
  supports_tools BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,      -- one default model (used if no model specified)
  is_active BOOLEAN DEFAULT true,        -- soft delete (true = available for selection)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with initial models
-- Claude Sonnet 4: latest, best structured output, best for general tasks
INSERT INTO ai_models (
  id,
  provider,
  display_name,
  cost_per_input_token,
  cost_per_output_token,
  max_context_tokens,
  max_output_tokens,
  supports_streaming,
  supports_tools,
  is_default,
  is_active
) VALUES
  (
    'claude-sonnet-4-20250514',
    'anthropic',
    'Claude Sonnet 4',
    0.000003,      -- $3 per 1M input tokens
    0.000015,      -- $15 per 1M output tokens
    200000,
    8192,
    true,
    true,
    true,          -- default
    true
  ),
  (
    'claude-haiku-4-5-20251001',
    'anthropic',
    'Claude Haiku 4.5',
    0.0000008,     -- $0.80 per 1M input tokens (80% cheaper than Sonnet)
    0.000004,      -- $4 per 1M output tokens
    200000,
    8192,
    true,
    true,
    false,         -- not default, but available
    true
  );

-- Comments for documentation
COMMENT ON TABLE ai_models IS 'Model registry: available LLM models, their capabilities, and pricing for cost calculation';
COMMENT ON COLUMN ai_models.id IS 'Model ID from provider (e.g., claude-sonnet-4-20250514 from Anthropic)';
COMMENT ON COLUMN ai_models.cost_per_input_token IS 'Cost per 1 million input tokens (for calculating usage-based billing)';
COMMENT ON COLUMN ai_models.cost_per_output_token IS 'Cost per 1 million output tokens (separate to reflect different provider pricing)';
COMMENT ON COLUMN ai_models.is_default IS 'If true, this model is used when no model specified in chat() call (only one should be true)';
COMMENT ON COLUMN ai_models.is_active IS 'If false, model is hidden from selection UI but historical data preserved';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- ai_usage_log table ready for metering
-- ai_models registry seeded with Claude Sonnet 4 and Haiku 4.5
-- All indexes created for efficient querying
