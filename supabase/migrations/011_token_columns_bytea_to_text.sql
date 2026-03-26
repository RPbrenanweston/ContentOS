-- Migration 011: Change encrypted token columns from BYTEA to TEXT
--
-- The application stores AES-256-GCM encrypted tokens as colon-delimited
-- hex strings (iv:authTag:ciphertext). BYTEA was the original column type
-- but TEXT is correct for this format. Postgres allows implicit BYTEA→TEXT
-- casts so existing rows survive without data migration.
--
-- Also drops the now-unused pgcrypto encrypt_token / decrypt_token SQL
-- functions that were added in migration 010, since encryption is handled
-- entirely in the application layer.

ALTER TABLE distribution_accounts
  ALTER COLUMN access_token_encrypted  TYPE TEXT,
  ALTER COLUMN refresh_token_encrypted TYPE TEXT;

-- Drop the SQL-layer crypto helpers — encryption lives in application code.
DROP FUNCTION IF EXISTS encrypt_token(TEXT, TEXT);
DROP FUNCTION IF EXISTS decrypt_token(BYTEA);
