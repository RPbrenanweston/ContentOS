import { type SupabaseClient } from '@supabase/supabase-js';
import type {
  CreatePerformanceMetricParams,
  PerformanceMetric,
} from '@/domain';

type PerformanceMetricRow = {
  id: string;
  distribution_job_id: string;
  impressions: number;
  views: number;
  clicks: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagement_rate: number | null;
  fetched_at: string;
  created_at: string;
};

function toEntity(row: PerformanceMetricRow): PerformanceMetric {
  return {
    id: row.id,
    distributionJobId: row.distribution_job_id,
    impressions: row.impressions,
    views: row.views,
    clicks: row.clicks,
    likes: row.likes,
    comments: row.comments,
    shares: row.shares,
    saves: row.saves,
    engagementRate: row.engagement_rate,
    fetchedAt: row.fetched_at,
    createdAt: row.created_at,
  };
}

function toRow(params: CreatePerformanceMetricParams): Record<string, unknown> {
  const row: Record<string, unknown> = {
    distribution_job_id: params.distributionJobId,
  };
  if (params.impressions !== undefined) row.impressions = params.impressions;
  if (params.views !== undefined) row.views = params.views;
  if (params.clicks !== undefined) row.clicks = params.clicks;
  if (params.likes !== undefined) row.likes = params.likes;
  if (params.comments !== undefined) row.comments = params.comments;
  if (params.shares !== undefined) row.shares = params.shares;
  if (params.saves !== undefined) row.saves = params.saves;
  if (params.engagementRate !== undefined) row.engagement_rate = params.engagementRate;
  return row;
}

export class PerformanceMetricRepo {
  constructor(private readonly db: SupabaseClient) {}

  async create(params: CreatePerformanceMetricParams): Promise<PerformanceMetric> {
    const { data, error } = await this.db
      .from('performance_metrics')
      .insert(toRow(params))
      .select()
      .single();

    if (error) throw error;
    return toEntity(data as PerformanceMetricRow);
  }

  async findByJobId(jobId: string): Promise<PerformanceMetric[]> {
    const { data, error } = await this.db
      .from('performance_metrics')
      .select()
      .eq('distribution_job_id', jobId)
      .order('fetched_at', { ascending: false });

    if (error) throw error;
    return (data as PerformanceMetricRow[]).map(toEntity);
  }
}
