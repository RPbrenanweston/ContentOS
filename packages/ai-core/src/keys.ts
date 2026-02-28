/**
 * Key management and resolution
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
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
  const key = createHash('sha256').update(encryptionKey).digest();

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
  const combined = Buffer.concat([iv, authTag, Buffer.from(ciphertext, 'base64')]);

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
  const key = createHash('sha256').update(encryptionKey).digest();

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
  } catch {
    // Auth tag validation failed or wrong key
    throw new InvalidKeyError('Failed to decrypt: invalid key or tampered data');
  }
}

/**
 * Save a BYOK API key for a user (encrypt and store)
 *
 * Upserts to ai_api_keys table - replaces existing key for same user+provider
 */
export async function saveKey(
  userId: string,
  provider: string,
  apiKey: string,
  supabase: SupabaseClient,
): Promise<void> {
  // Get encryption key from environment
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new InvalidKeyError('ENCRYPTION_KEY environment variable not set');
  }

  // Encrypt the API key
  const encryptedKey = encrypt(apiKey, encryptionKey);

  // Generate key hint from last 4 characters
  const keyHint = apiKey.length >= 4 ? `...${apiKey.slice(-4)}` : apiKey;

  // Upsert to database (handles duplicate user+provider)
  const { error } = await supabase.from('ai_api_keys').upsert(
    {
      user_id: userId,
      provider,
      encrypted_key: encryptedKey,
      key_hint: keyHint,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id,provider',
    },
  );

  if (error) {
    throw new Error(`Failed to save API key: ${error.message}`);
  }
}

/**
 * Delete (deactivate) a BYOK API key for a user
 *
 * Soft delete - sets is_active=false to maintain audit trail
 */
export async function deleteKey(
  userId: string,
  provider: string,
  supabase: SupabaseClient,
): Promise<void> {
  const { error } = await supabase
    .from('ai_api_keys')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('provider', provider);

  if (error) {
    throw new Error(`Failed to delete API key: ${error.message}`);
  }
}

function handleValidateKeyError(error: unknown): never {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status: number }).status === 401
  ) {
    throw new InvalidKeyError('Invalid API key');
  }
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Failed to validate API key: ${message}`);
}

/**
 * Validate an API key by making a minimal API call
 *
 * Supports: anthropic, openai, openrouter
 * Throws InvalidKeyError if key is invalid
 */
export async function validateKey(provider: string, apiKey: string): Promise<boolean> {
  if (provider === 'anthropic') {
    try {
      // Dynamic import() so vitest can mock the module (require() bypasses vi.mock)
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey });

      await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      });

      return true;
    } catch (error: unknown) {
      handleValidateKeyError(error);
    }
  }

  if (provider === 'openai') {
    try {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey });

      await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      });

      return true;
    } catch (error: unknown) {
      handleValidateKeyError(error);
    }
  }

  if (provider === 'openrouter') {
    try {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });

      await client.chat.completions.create({
        model: 'google/gemini-2.0-flash-001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      });

      return true;
    } catch (error: unknown) {
      handleValidateKeyError(error);
    }
  }

  throw new Error(`Unsupported provider for validation: ${provider}`);
}

/**
 * Resolve which API key to use (BYOK or managed)
 */
export async function resolveKey(
  userId: string,
  provider: string,
  supabase: SupabaseClient,
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

    // Update last_used_at timestamp (fire-and-forget)
    void Promise.resolve()
      .then(async () => {
        await supabase
          .from('ai_api_keys')
          .update({ last_used_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('provider', provider)
          .eq('is_active', true);
      })
      .catch((updateError) => {
        console.warn('Failed to update last_used_at for BYOK key:', updateError);
      });

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
