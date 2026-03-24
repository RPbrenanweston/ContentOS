import type { Platform, JobStatus } from './enums';

export interface DistributionAccount {
  id: string;
  userId: string;
  platform: Platform;
  accountName: string;
  externalAccountId: string;
  profileImageUrl: string | null;
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
