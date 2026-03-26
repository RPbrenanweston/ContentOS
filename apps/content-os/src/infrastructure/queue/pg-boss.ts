// @crumb pg-boss-queue-singleton
// JOB | Initialization | Singleton pattern
// why: Provide lazy-loaded pg-boss instance with unified queue names and job type definitions
// in:[SUPABASE_DB_URL env var] out:[PgBoss singleton] err:[MissingEnvError|ConnectionError]
// hazard: Singleton pattern with null check can race if getQueue() called during startup
// hazard: retryLimit 5 with 30s initial delay + exponential backoff reaches ~16 min total window
// hazard: dead-letter queue (content-decompose-dlq) accumulates failed jobs indefinitely; add periodic purge
// edge:../../../infrastructure/queue/workers.ts -> CALLED_BY
// edge:../../../app/api/distribution/publish/route.ts -> CALLS
// edge:../../../app/api/analytics/sync/route.ts -> CALLS
// prompt: Add startup latch to prevent concurrent init; monitor DLQ depth; test stopQueue cleanup

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
import { logger } from '@/lib/logger';

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
    retryLimit: 5,
    retryDelay: 30,
    retryBackoff: true,
    deadLetter: 'content-decompose-dlq',
    expireInHours: 24,
    archiveCompletedAfterSeconds: 86400, // 1 day
    deleteAfterDays: 7,
  });

  boss.on('error', (error) => {
    logger.error('Queue error', { error: String(error) });
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
