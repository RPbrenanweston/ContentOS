-- Migration: Org-level billing support
-- Phase 4: Multi-Provider + Polish
-- Story: S25
--
-- Adds org-level credit balance support with shared pools,
-- org-level indexes, and RLS policies for org members.

-- Add org-level balance unique constraint
-- (Note: individual user balances still use UNIQUE(user_id, period_start))
ALTER TABLE ai_credit_balances
  ADD CONSTRAINT ai_credit_balances_org_period_unique
  UNIQUE (org_id, period_start)
  DEFERRABLE INITIALLY DEFERRED;

-- Create index for org-level queries
CREATE INDEX idx_ai_credit_balances_org_id
  ON ai_credit_balances(org_id, period_start, period_end)
  WHERE org_id IS NOT NULL;

-- RLS Policy: Org members can view org credit balance
-- Assumes orgs table with org_members junction table exists
-- If not, this policy will have no effect until org membership is implemented
CREATE POLICY "Org members can view org credit balances"
  ON ai_credit_balances
  FOR SELECT
  USING (
    org_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = ai_credit_balances.org_id
      AND org_members.user_id = auth.uid()
    )
  );

-- Comments for documentation
COMMENT ON CONSTRAINT ai_credit_balances_org_period_unique
  ON ai_credit_balances
  IS 'One org-level balance record per org per billing period (separate from user-level balances)';

COMMENT ON INDEX idx_ai_credit_balances_org_id
  IS 'Accelerates org-level credit balance queries for shared credit pools';
