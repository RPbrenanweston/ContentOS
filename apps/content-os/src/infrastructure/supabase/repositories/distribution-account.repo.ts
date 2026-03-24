import { type SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateDistributionAccountParams,
  DistributionAccount,
  Platform,
} from '@/domain';
import { NotFoundError } from '@/lib/errors';

type DistributionAccountRow = {
  id: string;
  user_id: string;
  platform: string;
  account_name: string;
  external_account_id: string;
  profile_image_url: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function toEntity(row: DistributionAccountRow): DistributionAccount {
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform as Platform,
    accountName: row.account_name,
    externalAccountId: row.external_account_id,
    profileImageUrl: row.profile_image_url,
    isActive: row.is_active,
    metadata: row.metadata,
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
  if (params.metadata !== undefined) row.metadata = params.metadata;
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
