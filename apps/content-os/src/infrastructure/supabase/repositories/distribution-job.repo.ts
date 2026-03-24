import { type SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateDistributionJobParams,
  DistributionJob,
  JobStatus,
} from '@/domain';
import { NotFoundError } from '@/lib/errors';

type DistributionJobRow = {
  id: string;
  derived_asset_id: string;
  distribution_account_id: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  external_post_id: string | null;
  external_post_url: string | null;
  error_message: string | null;
  retry_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function toEntity(row: DistributionJobRow): DistributionJob {
  return {
    id: row.id,
    derivedAssetId: row.derived_asset_id,
    distributionAccountId: row.distribution_account_id,
    status: row.status as JobStatus,
    scheduledAt: row.scheduled_at,
    publishedAt: row.published_at,
    externalPostId: row.external_post_id,
    externalPostUrl: row.external_post_url,
    errorMessage: row.error_message,
    retryCount: row.retry_count,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(params: CreateDistributionJobParams): Record<string, unknown> {
  const row: Record<string, unknown> = {
    derived_asset_id: params.derivedAssetId,
    distribution_account_id: params.distributionAccountId,
  };
  if (params.scheduledAt !== undefined) row.scheduled_at = params.scheduledAt;
  if (params.metadata !== undefined) row.metadata = params.metadata;
  return row;
}

export class DistributionJobRepo {
  constructor(private readonly db: SupabaseClient) {}

  async create(params: CreateDistributionJobParams): Promise<DistributionJob> {
    const { data, error } = await this.db
      .from('distribution_jobs')
      .insert(toRow(params))
      .select()
      .single();

    if (error) throw error;
    return toEntity(data as DistributionJobRow);
  }

  async findById(id: string): Promise<DistributionJob> {
    const { data, error } = await this.db
      .from('distribution_jobs')
      .select()
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundError('DistributionJob', id);
    return toEntity(data as DistributionJobRow);
  }

  async findByAssetId(assetId: string): Promise<DistributionJob[]> {
    const { data, error } = await this.db
      .from('distribution_jobs')
      .select()
      .eq('derived_asset_id', assetId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as DistributionJobRow[]).map(toEntity);
  }

  async updateStatus(
    id: string,
    status: JobStatus,
    extra?: {
      publishedAt?: string;
      externalPostId?: string;
      externalPostUrl?: string;
      errorMessage?: string;
    },
  ): Promise<DistributionJob> {
    const updates: Record<string, unknown> = { status };
    if (extra?.publishedAt !== undefined) updates.published_at = extra.publishedAt;
    if (extra?.externalPostId !== undefined) updates.external_post_id = extra.externalPostId;
    if (extra?.externalPostUrl !== undefined) updates.external_post_url = extra.externalPostUrl;
    if (extra?.errorMessage !== undefined) updates.error_message = extra.errorMessage;

    const { data, error } = await this.db
      .from('distribution_jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundError('DistributionJob', id);
    return toEntity(data as DistributionJobRow);
  }
}
