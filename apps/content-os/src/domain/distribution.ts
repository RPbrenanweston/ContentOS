/**
 * @crumb
 * id: distribution-account-entity
 * AREA: DAT
 * why: Define DistributionAccount and DistributionJob entities—track platform OAuth credentials and publishing job lifecycle
 * in: CreateDistributionAccountParams {userId, platform, accountName, externalAccountId, profileImageUrl?}; CreateDistributionJobParams {derivedAssetId, distributionAccountId, scheduledAt?, metadata?}
 * out: DistributionAccount {id, userId, platform, accountName, externalAccountId, profileImageUrl?, isActive, metadata}; DistributionJob {id, derivedAssetId, distributionAccountId, status, scheduledAt?, publishedAt?, externalPostId?, externalPostUrl?, errorMessage?, retryCount, metadata}
 * err: No errors typed—externalAccountId immutable but no audit trail on platform token rotation; status transitions not validated
 * hazard: isActive flag bypassed in job publishing—deactivated accounts still accept new jobs, orphaning assets in queue
 * hazard: retryCount unbounded—no maximum retry ceiling, dead jobs retry indefinitely consuming queue slots
 * edge: CREATED_BY distribution.service.ts (syncAccounts() for accounts; publish() creates jobs)
 * edge: SERVES distribution.service.ts (job status queries, cancellation); queue.service.ts (slot assignment)
 * edge: READS enums.ts (Platform, JobStatus)
 * prompt: Test retryCount ceiling behavior; verify isActive prevents new job creation; test status transitions (pending→scheduled→publishing→published or failed)
 */

import type { Platform, JobStatus } from './enums';

export interface DistributionAccount {
  id: string;
  userId: string;
  platform: Platform;
  accountName: string;
  externalAccountId: string;
  profileImageUrl: string | null;
  platformAvatarUrl: string | null;
  platformDisplayName: string | null;
  platformUsername: string | null;
  consecutiveFailures: number;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDistributionAccountParams {
  userId: string;
  platform: Platform;
  accountName: string;
  externalAccountId: string;
  profileImageUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface DistributionJob {
  id: string;
  derivedAssetId: string;
  distributionAccountId: string;
  status: JobStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  externalPostId: string | null;
  externalPostUrl: string | null;
  errorMessage: string | null;
  retryCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDistributionJobParams {
  derivedAssetId: string;
  distributionAccountId: string;
  scheduledAt?: string;
  metadata?: Record<string, unknown>;
}
