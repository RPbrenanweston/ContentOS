import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { createServiceClient } from './admin';
import type { TokenSet } from '@/lib/platforms/types';

// ─── Encryption Config ──────────────────────────────────
//
// TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes / 256 bits).
// Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

const ALGORITHM = 'aes-256-gcm' as const;
const IV_LENGTH = 16; // 128-bit IV for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

function getEncryptionKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  return Buffer.from(hex, 'hex');
}

// ─── Encrypt / Decrypt ──────────────────────────────────

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a colon-delimited string: `iv_hex:authTag_hex:ciphertext_hex`
 *
 * NOTE: The distribution_accounts migration (010) defines encrypted token
 * columns as BYTEA. This function produces a text string. If the migration
 * strictly enforces BYTEA, those columns should be changed to TEXT. The
 * migration file itself is not modified here.
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * Expects the `iv_hex:authTag_hex:ciphertext_hex` format from encryptToken.
 */
export function decryptToken(encrypted: string): string {
  const key = getEncryptionKey();
  const parts = encrypted.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format: expected iv:authTag:ciphertext');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

// ─── Store / Retrieve ───────────────────────────────────

/**
 * Encrypt and store tokens for a distribution account.
 * Uses the service-role client to bypass RLS.
 */
export async function storeAccountTokens(params: {
  accountId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // unix timestamp (seconds)
  scopes: string[];
}): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('distribution_accounts')
    .update({
      access_token_encrypted: encryptToken(params.accessToken),
      refresh_token_encrypted: params.refreshToken
        ? encryptToken(params.refreshToken)
        : null,
      token_expires_at: new Date(params.expiresAt * 1000).toISOString(),
      token_scopes: params.scopes,
      last_verified_at: new Date().toISOString(),
      consecutive_failures: 0,
    })
    .eq('id', params.accountId);

  if (error) {
    throw new Error(`Failed to store tokens for account ${params.accountId}: ${error.message}`);
  }
}

/**
 * Retrieve and decrypt tokens for a distribution account.
 * Returns null if the account is not found or tokens cannot be decrypted.
 */
export async function retrieveAccountTokens(accountId: string): Promise<TokenSet | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('distribution_accounts')
    .select('access_token_encrypted, refresh_token_encrypted, token_expires_at, token_scopes, platform_config')
    .eq('id', accountId)
    .single();

  if (error || !data) {
    return null;
  }

  if (!data.access_token_encrypted) {
    return null;
  }

  try {
    const accessToken = decryptToken(data.access_token_encrypted);
    const refreshToken = data.refresh_token_encrypted
      ? decryptToken(data.refresh_token_encrypted)
      : undefined;

    return {
      accessToken,
      refreshToken,
      expiresAt: data.token_expires_at
        ? new Date(data.token_expires_at).getTime()
        : 0,
      tokenType: 'Bearer',
      scope: Array.isArray(data.token_scopes)
        ? data.token_scopes.join(' ')
        : undefined,
      extras: typeof data.platform_config === 'object' && data.platform_config !== null
        ? (data.platform_config as Record<string, string>)
        : undefined,
    };
  } catch {
    // Decryption failure — key rotation, corruption, or wrong key
    return null;
  }
}
