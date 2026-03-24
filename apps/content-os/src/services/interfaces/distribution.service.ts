/**
 * @crumb
 * id: publishing-orchestration-interface
 * AREA: DAT
 * why: Define contract for cross-platform asset publishing—job coordination and metrics aggregation
 * in: PublishParams {asset, accounts[], scheduledAt, mediaUrls[]}
 * out: DistributionJob[] {id, status, externalPostId, publishedAt}
 * err: No errors typed—implementation must handle adapter unavailability and partial failures
 * hazard: publish() returns array but contract permits partial success—caller cannot distinguish "all published" from "some failed"
 * hazard: fetchMetrics() lacks job state validation—implementations may return stale metrics from cancelled or failed jobs
 * edge: IMPLEMENTED_BY distribution.service.ts (concrete implementation)
 * edge: READS DistributionAccount, DistributionJob domain types
 * edge: CALLED_BY queue.service.ts (materialize and auto-fill operations feed into publishing)
 * edge: SERVES platform adapters (LinkedIn, X) via delegate pattern
 * prompt: Test job status transitions (pending→published, pending→failed); verify metrics return zero for non-published jobs; validate account list handles empty arrays
 */

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
