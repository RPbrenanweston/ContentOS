-- Stripe Payment Logs Table
-- Idempotency tracking for webhook events to prevent double crediting
-- Part of Phase 3: Billing + Credits

CREATE TABLE IF NOT EXISTS stripe_payment_logs (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stripe session ID (unique, used for idempotency)
  session_id TEXT NOT NULL UNIQUE,

  -- User who made the payment
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Payment amount in USD
  amount_usd NUMERIC(10, 2) NOT NULL,

  -- Payment status from Stripe
  payment_status TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payment_logs_user ON stripe_payment_logs(user_id);
CREATE INDEX idx_payment_logs_session ON stripe_payment_logs(session_id);

-- RLS Policies
ALTER TABLE stripe_payment_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment logs
CREATE POLICY payment_logs_select ON stripe_payment_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Webhook handler uses service role, no INSERT policy needed for regular users

-- Comments
COMMENT ON TABLE stripe_payment_logs IS 'Idempotency tracking for Stripe webhook events';
COMMENT ON COLUMN stripe_payment_logs.session_id IS 'Unique Stripe checkout session ID for idempotency';
COMMENT ON COLUMN stripe_payment_logs.payment_status IS 'Payment status from Stripe (e.g., "paid", "unpaid")';
