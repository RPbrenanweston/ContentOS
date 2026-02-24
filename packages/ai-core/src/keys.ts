/**
 * Key management and resolution
 */

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
    // TODO: Decrypt the key
    return {
      key: userKey.encrypted_key, // Should be decrypted
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
