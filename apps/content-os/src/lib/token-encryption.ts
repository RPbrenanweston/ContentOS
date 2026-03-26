// @crumb token-encryption
// LIB | security | OAuth token protection
// why: AES-256-GCM encryption/decryption for OAuth tokens at rest; mirrors the pattern in packages/ai-core/src/keys.ts for consistency
// in:[token:string] out:[encrypted:string] | in:[encrypted:string] out:[token:string]
// hazard: Encryption key rotation invalidates all existing ciphertext — implement a key-version prefix before rotating
// hazard: ENCRYPTION_KEY falling back to SUPABASE_SERVICE_KEY is a last resort; prefer an explicit dedicated key in production
// edge:../infrastructure/supabase/repositories/distribution-account.repo.ts -> USES
// prompt: Add key-version header to ciphertext format to support zero-downtime key rotation; never log decrypted tokens

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Resolve the 32-byte encryption key.
 *
 * Priority:
 *   1. ENCRYPTION_KEY env var (preferred — dedicated secret)
 *   2. SUPABASE_SERVICE_KEY env var (fallback — already a strong secret)
 *
 * The raw value is hashed with SHA-256 so any string length works as input.
 */
function resolveEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!raw) {
    throw new Error(
      'No encryption key available. Set ENCRYPTION_KEY (or SUPABASE_SERVICE_KEY as fallback) in environment.',
    );
  }
  return createHash('sha256').update(raw).digest();
}

/**
 * Encrypt a token string using AES-256-GCM.
 *
 * Output format (base64): IV (12 bytes) + AuthTag (16 bytes) + Ciphertext
 */
export function encryptToken(token: string): string {
  const key = resolveEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let ciphertext = cipher.update(token, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, authTag, Buffer.from(ciphertext, 'base64')]);
  return combined.toString('base64');
}

/**
 * Decrypt a token string previously encrypted with `encryptToken`.
 *
 * Expects base64 input in the format: IV (12 bytes) + AuthTag (16 bytes) + Ciphertext
 * Throws if the data has been tampered with or the wrong key is used.
 */
export function decryptToken(encrypted: string): string {
  const key = resolveEncryptionKey();
  const combined = Buffer.from(encrypted, 'base64');

  const iv = combined.subarray(0, 12);
  const authTag = combined.subarray(12, 28);
  const ciphertext = combined.subarray(28);

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  try {
    let plaintext = decipher.update(ciphertext, undefined, 'utf8');
    plaintext += decipher.final('utf8');
    return plaintext;
  } catch {
    throw new Error('Failed to decrypt token: invalid key or tampered ciphertext');
  }
}
