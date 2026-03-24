/**
 * pg-boss queue adapter for async content processing.
 *
 * Manages job queues for:
 * - content-decompose: AI content analysis + segment extraction
 * - clip-extract: FFmpeg video clip generation
 * - distribution-publish: Social media publishing
 * - metrics-sync: Performance data collection
 */

import PgBoss from 'pg-boss';

let boss: PgBoss | null = null;

export async function getQueue(): Promise<PgBoss> {
  if (boss) return boss;

  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error('SUPABASE_DB_URL required for pg-boss queue');
  }

  boss = new PgBoss({
    connectionString,
    schema: 'pgboss',
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
    expireInHours: 24,
    archiveCompletedAfterSeconds: 86400, // 1 day
    deleteAfterDays: 7,
  });

  boss.on('error', (error) => {
    console.error('[pg-boss] Queue error:', error);
  });

  await boss.start();
  return boss;
}

// Queue names
export const QUEUES = {
  CONTENT_DECOMPOSE: 'content-decompose',
  CLIP_EXTRACT: 'clip-extract',
  DISTRIBUTION_PUBLISH: 'distribution-publish',
  METRICS_SYNC: 'metrics-sync',
} as const;

// Job payload types
export interface ContentDecomposeJob {
  nodeId: string;
  userId: string;
}

export interface ClipExtractJob {
  nodeId: string;
  segmentId: string;
  sourceUrl: string;
  startMs: number;
  endMs: number;
}

export interface DistributionPublishJob {
  jobId: string;
  assetId: string;
  accountId: string;
}

export interface MetricsSyncJob {
  distributionJobId: string;
}

export async function stopQueue(): Promise<void> {
  if (boss) {
    await boss.stop();
    boss = null;
  }
}
