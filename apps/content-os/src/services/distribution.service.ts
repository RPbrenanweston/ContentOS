/**
 * @crumb
 * id: distribution-orchestration
 * AREA: DOM
 * why: Coordinate publishing across platforms—manage job lifecycle and adapter delegation
 * in: PublishParams {asset, accounts[], scheduledAt, mediaUrls}
 * out: DistributionJob[] {status, externalPostId, externalPostUrl, publishedAt}
 * err: ProcessingError on adapter unavailability; DistributionError on platform-specific failures
 * hazard: Missing or dead adapters cause partial failures—no rollback mechanism for partial publishes
 * hazard: Scheduled jobs lack retry strategy—failures stuck in 'failed' state indefinitely
 * edge: CALLS LinkedIn and X adapters via platform-adapter registry
 * edge: WRITES distribution_jobs table
 * edge: READS distribution_accounts for platform metadata
 * prompt: Test missing adapters; verify job status transitions; test cancellation side effects
 */

/**
 * Distribution service — orchestrates publishing across platforms.
 *
 * Creates one DistributionJob per account, delegates to platform adapters,
 * and manages job lifecycle (pending → scheduled → publishing → published).
 */

import type {
  DistributionAccount,
  DistributionJob,
} from '@/domain';
import type {
  IDistributionService,
  PublishParams,
} from './interfaces/distribution.service';
import {
  getAdapter,
  getAvailableAdapters,
  registerAdapter,
  type PlatformCredentials,
} from '@/infrastructure/distribution/platform-adapter';
import { LinkedInAdapter } from '@/infrastructure/distribution/platforms/linkedin.adapter';
import { XAdapter } from '@/infrastructure/distribution/platforms/x.adapter';
import type { DistributionJobRepo } from '@/infrastructure/supabase/repositories/distribution-job.repo';
import type { DistributionAccountRepo } from '@/infrastructure/supabase/repositories/distribution-account.repo';
import type { PerformanceMetricRepo } from '@/infrastructure/supabase/repositories/performance-metric.repo';

// Register available adapters on module load
registerAdapter(new LinkedInAdapter());
registerAdapter(new XAdapter());

export class DistributionServiceImpl implements IDistributionService {
  constructor(
    private jobRepo: DistributionJobRepo,
    private accountRepo: DistributionAccountRepo,
    private metricRepo: PerformanceMetricRepo,
  ) {}

  async publish(params: PublishParams): Promise<DistributionJob[]> {
    const jobs: DistributionJob[] = [];

    for (const account of params.accounts) {
      // Create job record
      const job = await this.jobRepo.create({
        derivedAssetId: params.asset.id,
        distributionAccountId: account.id,
        scheduledAt: params.scheduledAt?.toISOString(),
      });

      if (params.scheduledAt) {
        // Scheduled for later — update status and move on
        const updated = await this.jobRepo.updateStatus(job.id, 'scheduled');
        jobs.push(updated);
        continue;
      }

      // Publish immediately
      const adapter = getAdapter(account.platform);
      if (!adapter) {
        const failed = await this.jobRepo.updateStatus(job.id, 'failed', {
          errorMessage: `No adapter available for platform: ${account.platform}`,
        });
        jobs.push(failed);
        continue;
      }

      const credentials = this.buildCredentials(account);
      await this.jobRepo.updateStatus(job.id, 'publishing');

      try {
        const result = await adapter.createPost(credentials, {
          text: params.asset.body,
          mediaUrls: params.mediaUrls,
        });

        if (result.status === 'published') {
          const published = await this.jobRepo.updateStatus(job.id, 'published', {
            externalPostId: result.externalPostId,
            externalPostUrl: result.externalUrl,
            publishedAt: new Date().toISOString(),
          });
          jobs.push(published);
        } else {
          const failed = await this.jobRepo.updateStatus(job.id, 'failed', {
            errorMessage: result.errorMessage,
          });
          jobs.push(failed);
        }
      } catch (error) {
        const failed = await this.jobRepo.updateStatus(job.id, 'failed', {
          errorMessage: error instanceof Error ? error.message : 'Unknown publishing error',
        });
        jobs.push(failed);
      }
    }

    return jobs;
  }

  async getJobStatus(jobId: string): Promise<DistributionJob> {
    return this.jobRepo.findById(jobId);
  }

  async cancelJob(jobId: string): Promise<void> {
    await this.jobRepo.updateStatus(jobId, 'cancelled');
  }

  async syncAccounts(userId: string): Promise<DistributionAccount[]> {
    // Returns currently stored accounts
    // In a full implementation, this would also refresh token status
    return this.accountRepo.findByUserId(userId);
  }

  async fetchMetrics(
    jobId: string,
  ): Promise<{ impressions: number; clicks: number; likes: number }> {
    const job = await this.jobRepo.findById(jobId);
    if (!job.externalPostId || job.status !== 'published') {
      return { impressions: 0, clicks: 0, likes: 0 };
    }

    // Find the account to get platform info
    const accounts = await this.accountRepo.findByUserId(''); // TODO: get from job context
    const account = accounts.find((a) => a.id === job.distributionAccountId);
    if (!account) {
      return { impressions: 0, clicks: 0, likes: 0 };
    }

    const adapter = getAdapter(account.platform);
    if (!adapter) {
      return { impressions: 0, clicks: 0, likes: 0 };
    }

    const credentials = this.buildCredentials(account);

    try {
      const metrics = await adapter.getMetrics(credentials, job.externalPostId);

      // Persist metrics
      await this.metricRepo.create({
        distributionJobId: jobId,
        impressions: metrics.impressions,
        views: metrics.views,
        clicks: metrics.clicks,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        saves: metrics.saves,
      });

      return {
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        likes: metrics.likes,
      };
    } catch {
      return { impressions: 0, clicks: 0, likes: 0 };
    }
  }

  /** Get list of platforms that have adapters */
  getAvailablePlatforms(): { platform: string; displayName: string }[] {
    return getAvailableAdapters().map((a) => ({
      platform: a.platform,
      displayName: a.displayName,
    }));
  }

  private buildCredentials(account: DistributionAccount): PlatformCredentials {
    const meta = account.metadata ?? {};
    return {
      accessToken: (meta.accessToken as string) ?? '',
      refreshToken: (meta.refreshToken as string) ?? undefined,
      expiresAt: (meta.expiresAt as string) ?? undefined,
      platformAccountId: account.externalAccountId,
      metadata: meta,
    };
  }
}
