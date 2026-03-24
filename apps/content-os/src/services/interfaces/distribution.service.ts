import type {
  DerivedAsset,
  DistributionAccount,
  DistributionJob,
} from '@/domain';

export interface PublishParams {
  asset: DerivedAsset;
  accounts: DistributionAccount[];
  scheduledAt?: Date;
  mediaUrls?: string[];
}

export interface IDistributionService {
  publish(params: PublishParams): Promise<DistributionJob[]>;
  getJobStatus(jobId: string): Promise<DistributionJob>;
  cancelJob(jobId: string): Promise<void>;
  syncAccounts(userId: string): Promise<DistributionAccount[]>;
  fetchMetrics(
    jobId: string,
  ): Promise<{ impressions: number; clicks: number; likes: number }>;
}
