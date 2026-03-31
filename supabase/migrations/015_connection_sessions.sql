-- US-004: Temporary storage for multi-entity LinkedIn OAuth sessions
-- Allows users to select which org pages to connect after OAuth completes

CREATE TABLE IF NOT EXISTS connection_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
  pending_entities jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE connection_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own sessions"
  ON connection_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on sessions"
  ON connection_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
