/**
 * Key management and resolution
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { InvalidKeyError } from './errors';

/**
 * Resolved key with source information
 */
export interface ResolvedKey {
  key: string;
  source: 'byok' | 'managed';
}

/**
 * Encrypt plaintext using AES-256-GCM
 *
 * Format: IV (12 bytes) + Auth Tag (16 bytes) + Ciphertext
 * Returns base64-encoded string
 */
export function encrypt(plaintext: string, encryptionKey: string): string {
  // Derive 32-byte key from encryption key (SHA-256 hash)
  const crypto = require('node:crypto');
  const key = crypto.createHash('sha256').update(encryptionKey).digest();

  // Generate random 12-byte IV (recommended for GCM)
  const iv = randomBytes(12);

  // Create cipher
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  // Encrypt plaintext
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  // Get auth tag (16 bytes for GCM)
  const authTag = cipher.getAuthTag();

  // Prepend IV and auth tag to ciphertext
  // Format: IV (12 bytes) + AuthTag (16 bytes) + Ciphertext
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(ciphertext, 'base64')
  ]);

  return combined.toString('base64');
}

/**
 * Decrypt ciphertext using AES-256-GCM
 *
 * Expects format: IV (12 bytes) + Auth Tag (16 bytes) + Ciphertext
 * Input must be base64-encoded string
 */
export function decrypt(encryptedData: string, encryptionKey: string): string {
  // Derive 32-byte key from encryption key (SHA-256 hash)
  const crypto = require('node:crypto');
  const key = crypto.createHash('sha256').update(encryptionKey).digest();

  // Decode base64
  const combined = Buffer.from(encryptedData, 'base64');

  // Extract IV (first 12 bytes)
  const iv = combined.subarray(0, 12);

  // Extract auth tag (next 16 bytes)
  const authTag = combined.subarray(12, 28);

  // Extract ciphertext (remaining bytes)
  const ciphertext = combined.subarray(28);

  // Create decipher
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  try {
    // Decrypt ciphertext
    let plaintext = decipher.update(ciphertext, undefined, 'utf8');
    plaintext += decipher.final('utf8');
    return plaintext;
  } catch (error) {
    // Auth tag validation failed or wrong key
    throw new InvalidKeyError('Failed to decrypt: invalid key or tampered data');
  }
}

/**
 * Resolve which API key to use (BYOK or managed)
 */
export async function resolveKey(
  userId: string,
  provider: string,
  supabase: SupabaseClient
): Promise<ResolvedKey> {
  // Check for active BYOK key
  const { data: userKey, error } = await supabase
    .from('ai_api_keys')
    .select('encrypted_key')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_active', true)
    .single();

  if (userKey && !error) {
    // Decrypt BYOK key using encryption key from environment
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new InvalidKeyError('ENCRYPTION_KEY environment variable not set');
    }

    const decryptedKey = decrypt(userKey.encrypted_key, encryptionKey);
    return {
      key: decryptedKey,
      source: 'byok',
    };
  }

  // Fall back to managed key from environment
  const managedKey = process.env[`${provider.toUpperCase()}_API_KEY`];
  if (!managedKey) {
    throw new InvalidKeyError(`No API key found for provider: ${provider}`);
  }

  return {
    key: managedKey,
    source: 'managed',
  };
}
