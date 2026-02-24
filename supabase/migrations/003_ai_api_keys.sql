-- =====================================================
-- Migration 003: AI Layer — BYOK API Keys
-- =====================================================
-- Creates ai_api_keys table for user-provided API keys
-- Supports bring-your-own-key (BYOK) model for provider APIs
-- Encrypted storage at rest (via Supabase Vault or app-level encryption)
-- Design: docs/SHARED_AI_LAYER_DESIGN.md Section 4.2

-- =====================================================
-- 1. AI API KEYS TABLE
-- =====================================================
-- Stores user-provided API keys for LLM providers
-- One key per user per provider (unique constraint enforced)
-- Encrypted before storage, decrypted on retrieval
-- RLS policy ensures users can only see their own keys

CREATE TABLE ai_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,                -- 'anthropic' | 'openai'
  encrypted_key TEXT NOT NULL,           -- encrypted via app-level AES-256-GCM (S12)
  key_hint TEXT NOT NULL,                -- last 4 chars for UI display: '...xK7m'
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  last_validated_at TIMESTAMPTZ,         -- last successful API call with this key
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One key per provider per user (enforced)
  UNIQUE(user_id, provider)
);

-- =====================================================
-- 2. INDEXES
-- =====================================================
-- Index 1: Retrieve active key for user + provider (most common query)
CREATE INDEX idx_api_keys_user_active ON ai_api_keys(user_id, is_active, provider);

-- Index 2: Find all keys for a user (key management UI)
CREATE INDEX idx_api_keys_user ON ai_api_keys(user_id, is_active);

-- =====================================================
-- 3. ROW-LEVEL SECURITY (RLS)
-- =====================================================
-- Enable RLS on ai_api_keys table
ALTER TABLE ai_api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own keys
CREATE POLICY "Users can view own keys" ON ai_api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own keys
CREATE POLICY "Users can insert own keys" ON ai_api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own keys (deactivate, update hints)
CREATE POLICY "Users can update own keys" ON ai_api_keys
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own keys (removal)
CREATE POLICY "Users can delete own keys" ON ai_api_keys
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. TRIGGER FOR UPDATED_AT
-- =====================================================
-- Automatically update the updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION update_ai_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_api_keys_updated_at_trigger
  BEFORE UPDATE ON ai_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_api_keys_updated_at();

-- =====================================================
-- NOTES
-- =====================================================
-- - encrypted_key is stored as text (contains IV + ciphertext + auth tag)
-- - Decryption happens in application code (keys.ts, keys.py)
-- - key_hint extracted from last 4 chars of plaintext key before encryption
-- - is_active allows soft-delete / deactivation without data loss
-- - last_used_at and last_validated_at track key usage for diagnostics
-- - RLS ensures encryption at rest + access control at database level
