// @crumb distribution-account-repository
// DAT | OAuth credentials | Platform abstraction
// why: Store linked social media accounts with soft-delete (deactivation) and external platform credentials
// in:[CreateDistributionAccountParams] out:[DistributionAccount records] err:[DatabaseError|NotFoundError]
// hazard: Storing oauth tokens in metadata without encryption exposes refresh tokens to DB breach
// hazard: Deactivate-only (no hard delete) risks stale account reactivation with revoked credentials
// edge:../client.ts -> READS
// edge:../../../domain -> READS
// edge:../../app/api/distribution/accounts/route.ts -> CALLS
// edge:../distribution/platform-adapter.ts -> RELATES
// prompt: Encrypt oauth_token fields before storage; audit credentials before reactivation; test token refresh

import { type SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateDistributionAccountParams,
  DistributionAccount,
  Platform,
} from '@/domain';
import { NotFoundError } from '@/lib/errors';
import { encryptToken, decryptToken } from '@/lib/token-encryption';

type DistributionAccountRow = {
  id: string;
  user_id: string;
  platform: string;
  account_name: string;
  external_account_id: string;
  profile_image_url: string | null;
  platform_avatar_url: string | null;
  platform_display_name: string | null;
  platform_username: string | null;
  consecutive_failures: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/** OAuth token field names that require encryption at rest */
const OAUTH_TOKEN_FIELDS = ['oauth_token', 'access_token', 'refresh_token'] as const;

/**
 * Encrypt known OAuth token fields within a metadata object before persistence.
 * Non-token fields are stored as-is.
 */
function encryptMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const encrypted: Record<string, unknown> = { ...metadata };
  for (const field of OAUTH_TOKEN_FIELDS) {
    const value = encrypted[field];
    if (typeof value === 'string' && value.length > 0) {
      encrypted[field] = encryptToken(value);
    }
  }
  return encrypted;
}

/**
 * Decrypt known OAuth token fields within a metadata object after retrieval.
 * Fields that were not encrypted (or failed decryption) are returned as-is.
 */
function decryptMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const decrypted: Record<string, unknown> = { ...metadata };
  for (const field of OAUTH_TOKEN_FIELDS) {
    const value = decrypted[field];
    if (typeof value === 'string' && value.length > 0) {
      try {
        decrypted[field] = decryptToken(value);
      } catch {
        // Value was stored unencrypted (legacy row) — leave as-is
      }
    }
  }
  return decrypted;
}

function toEntity(row: DistributionAccountRow): DistributionAccount {
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform as Platform,
    accountName: row.account_name,
    externalAccountId: row.external_account_id,
    profileImageUrl: row.profile_image_url,
    platformAvatarUrl: row.platform_avatar_url,
    platformDisplayName: row.platform_display_name,
    platformUsername: row.platform_username,
    consecutiveFailures: row.consecutive_failures,
    isActive: row.is_active,
    metadata: row.metadata ? decryptMetadata(row.metadata) : row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(params: CreateDistributionAccountParams): Record<string, unknown> {
  const row: Record<string, unknown> = {
    user_id: params.userId,
    platform: params.platform,
    account_name: params.accountName,
    external_account_id: params.externalAccountId,
  };
  if (params.profileImageUrl !== undefined) row.profile_image_url = params.profileImageUrl;
  if (params.metadata !== undefined) row.metadata = encryptMetadata(params.metadata as Record<string, unknown>);
  return row;
}

export class DistributionAccountRepo {
  constructor(private readonly db: SupabaseClient) {}

  async create(params: CreateDistributionAccountParams): Promise<DistributionAccount> {
    const { data, error } = await this.db
      .from('distribution_accounts')
      .insert(toRow(params))
      .select()
      .single();

    if (error) throw error;
    return toEntity(data as DistributionAccountRow);
  }

  async findByUserId(userId: string): Promise<DistributionAccount[]> {
    const { data, error } = await this.db
      .from('distribution_accounts')
      .select()
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as DistributionAccountRow[]).map(toEntity);
  }

  async findById(id: string): Promise<DistributionAccount> {
    const { data, error } = await this.db
      .from('distribution_accounts')
      .select()
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundError('DistributionAccount', id);
    return toEntity(data as DistributionAccountRow);
  }

  async deactivate(id: string): Promise<void> {
    const { error } = await this.db
      .from('distribution_accounts')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  }
}
