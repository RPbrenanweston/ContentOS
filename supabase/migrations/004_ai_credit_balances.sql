-- Migration: ai_credit_balances table for managed credits tracking
-- Phase 3: Billing + Credits
-- Story: S19

-- Create ai_credit_balances table
CREATE TABLE ai_credit_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID,                                    -- for team/org billing (nullable for solo users)
  credits_remaining_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
  credits_used_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
  spending_cap_usd NUMERIC(10,4),                 -- user-configured monthly cap (null = no cap)
  admin_cap_usd NUMERIC(10,4),                    -- admin-enforced cap (null = no cap)
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one balance record per user per billing period
  UNIQUE(user_id, period_start)
);

-- Create index for fast user lookups
CREATE INDEX idx_ai_credit_balances_user_id ON ai_credit_balances(user_id);

-- Create index for period queries
CREATE INDEX idx_ai_credit_balances_period ON ai_credit_balances(period_start, period_end);

-- RLS: Enable row-level security
ALTER TABLE ai_credit_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own credit balance records
CREATE POLICY "Users can view own credit balances"
  ON ai_credit_balances
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit balances"
  ON ai_credit_balances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credit balances"
  ON ai_credit_balances
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger: auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_credit_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_credit_balances_updated_at
  BEFORE UPDATE ON ai_credit_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_credit_balances_updated_at();

-- Comments for documentation
COMMENT ON TABLE ai_credit_balances IS 'Tracks managed credits per user per billing period with spending caps';
COMMENT ON COLUMN ai_credit_balances.credits_remaining_usd IS 'Remaining credit balance in USD (decremented on usage)';
COMMENT ON COLUMN ai_credit_balances.credits_used_usd IS 'Total credits consumed in this period';
COMMENT ON COLUMN ai_credit_balances.spending_cap_usd IS 'User-configured monthly spending cap (null = no cap)';
COMMENT ON COLUMN ai_credit_balances.admin_cap_usd IS 'Admin-enforced cap overriding user cap (null = no admin cap)';
COMMENT ON COLUMN ai_credit_balances.period_start IS 'Billing period start timestamp (typically first of month)';
COMMENT ON COLUMN ai_credit_balances.period_end IS 'Billing period end timestamp (typically last of month)';
