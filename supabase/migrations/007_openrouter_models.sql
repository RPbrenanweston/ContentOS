-- =====================================================
-- Migration 007: OpenRouter Models — Seed Model Registry
-- =====================================================
-- Adds OpenRouter as a third provider to the Shared AI Layer
-- Seeds ai_models table with 8 popular OpenRouter models
-- spanning budget (Gemini Flash, DeepSeek), mid-tier (Llama,
-- Mistral, Qwen), and premium (Claude, Gemini Pro, GPT-4o) tiers
--
-- OpenRouter uses OpenAI-compatible API with custom baseURL
-- All pricing data from https://openrouter.ai/api/v1/models
-- Provider column is TEXT (unconstrained), so 'openrouter' works
-- Design: docs/SHARED_AI_LAYER_DESIGN.md Section 4.4

-- =====================================================
-- SEED OPENROUTER MODELS
-- =====================================================
-- Insert 8 popular OpenRouter models with accurate pricing
-- All models: provider='openrouter', is_default=false, is_active=true
-- Pricing is per-token (very small decimals, not per-million)

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
  -- Budget Tier: Ultra-low cost, high availability
  (
    'google/gemini-2.0-flash-001',
    'openrouter',
    'Google Gemini 2.0 Flash',
    0.0000001,      -- $0.10 per 1M input tokens
    0.0000004,      -- $0.40 per 1M output tokens
    1048576,        -- 1M context window
    8192,
    true,
    true,
    false,
    true
  ),
  (
    'deepseek/deepseek-chat',
    'openrouter',
    'DeepSeek V3 Chat',
    0.00000032,     -- $0.32 per 1M input tokens
    0.00000089,     -- $0.89 per 1M output tokens
    163840,
    163840,
    true,
    true,
    false,
    true
  ),

  -- Mid Tier: Performance + cost balance
  (
    'meta-llama/llama-3.3-70b-instruct',
    'openrouter',
    'Llama 3.3 70B Instruct',
    0.0000001,      -- $0.10 per 1M input tokens
    0.00000032,     -- $0.32 per 1M output tokens
    131072,
    16384,
    true,
    true,
    false,
    true
  ),
  (
    'mistralai/mistral-large-2411',
    'openrouter',
    'Mistral Large 2411',
    0.000002,       -- $2.00 per 1M input tokens
    0.000006,       -- $6.00 per 1M output tokens
    131072,
    8192,           -- Conservative fallback (API returned null)
    true,
    true,
    false,
    true
  ),
  (
    'qwen/qwen-2.5-72b-instruct',
    'openrouter',
    'Qwen 2.5 72B Instruct',
    0.00000012,     -- $0.12 per 1M input tokens
    0.00000039,     -- $0.39 per 1M output tokens
    32768,
    16384,
    true,
    true,
    false,
    true
  ),

  -- Premium Tier: Frontier models with highest capability
  (
    'anthropic/claude-sonnet-4.6',
    'openrouter',
    'Claude Sonnet 4.6 (via OpenRouter)',
    0.000003,       -- $3.00 per 1M input tokens
    0.000015,       -- $15.00 per 1M output tokens
    1000000,        -- 1M context window
    128000,
    true,
    true,
    false,
    true
  ),
  (
    'google/gemini-3.1-pro-preview',
    'openrouter',
    'Google Gemini 3.1 Pro Preview',
    0.000002,       -- $2.00 per 1M input tokens
    0.000012,       -- $12.00 per 1M output tokens
    1048576,        -- 1M context window
    65536,
    true,
    true,
    false,
    true
  ),
  (
    'openai/gpt-4o',
    'openrouter',
    'OpenAI GPT-4o (via OpenRouter)',
    0.0000025,      -- $2.50 per 1M input tokens
    0.00001,        -- $10.00 per 1M output tokens
    128000,
    16384,
    true,
    true,
    false,
    true
  );

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Verify all 8 models inserted successfully
DO $$
DECLARE
  openrouter_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO openrouter_count
  FROM ai_models
  WHERE provider = 'openrouter';

  IF openrouter_count != 8 THEN
    RAISE EXCEPTION 'Expected 8 OpenRouter models, found %', openrouter_count;
  END IF;

  RAISE NOTICE 'Successfully seeded % OpenRouter models', openrouter_count;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- 8 OpenRouter models added to ai_models registry
-- Pricing spans budget ($0.10/M) to premium ($15/M output)
-- All models support streaming and tools
-- Provider column accepts 'openrouter' (no schema changes needed)
