// @crumb analytics-sync-pgboss-job
// JOB | cron | analytics-sync
// why: Automate metrics synchronization for all published distribution jobs on a 30-minute schedule via pg-boss
// in:[DATABASE_URL env var] out:[sync results logged] err:[connection-failure, query-failure, metric-fetch-failure]
// hazard: DATABASE_URL must point to the same Supabase PostgreSQL instance used by the app
// hazard: pg-boss creates its own schema (pgboss) in the database -- ensure the DB user has CREATE SCHEMA permission
// edge:../../infrastructure/supabase/client.ts -> USES
// edge:../../services/container.ts -> USES
// edge:../../app/api/analytics/sync/route.ts -> SHARES batchSyncAnalytics logic

import PgBoss from 'pg-boss';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';

const JOB_NAME = 'analytics-sync';
const CRON_SCHEDULE = '*/30 * * * *'; // Every 30 minutes

export interface BatchSyncResult {
  synced: number;
  errors: number;
  total: number;
}

/**
 * Shared batch sync logic used by both the API route (manual trigger)
 * and the pg-boss cron job (automated trigger).
 *
 * Fetches metrics for all published distribution jobs that have an
 * external_post_id. Errors on individual jobs are counted but do not
 * halt the batch.
 */
export async function batchSyncAnalytics(): Promise<BatchSyncResult> {
  const supabase = createServiceClient();
  const { distributionService } = getServices(supabase);

  const { data: publishedRows, error: queryError } = await supabase
    .from('distribution_jobs')
    .select('id, external_post_id')
    .eq('status', 'published')
    .not('external_post_id', 'is', null);

  if (queryError) {
    throw new Error(`Failed to query published jobs: ${queryError.message}`);
  }

  let synced = 0;
  let errors = 0;
  const total = publishedRows?.length ?? 0;

  for (const row of publishedRows ?? []) {
    try {
      await distributionService.fetchMetrics(row.id);
      synced++;
    } catch {
      errors++;
    }
  }

  return { synced, errors, total };
}

/**
 * Singleton pg-boss instance. Prevents multiple boss instances from
 * being created if startAnalyticsSyncWorker is called more than once.
 */
let bossInstance: PgBoss | null = null;

/**
 * Creates and starts a pg-boss instance, registers the analytics-sync
 * cron schedule, and attaches the worker handler.
 *
 * Safe to call multiple times -- pg-boss deduplicates schedules by name.
 */
export async function startAnalyticsSyncWorker(): Promise<PgBoss> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to start pg-boss workers');
  }

  if (bossInstance) {
    return bossInstance;
  }

  const boss = new PgBoss(connectionString);

  boss.on('error', (error) => {
    console.error('[pg-boss] Error:', error);
  });

  await boss.start();

  // Schedule the cron job. pg-boss deduplicates by name so this is
  // safe to call on every startup.
  await boss.schedule(JOB_NAME, CRON_SCHEDULE, {});

  // Register the worker that processes analytics-sync jobs.
  await boss.work(JOB_NAME, async (job) => {
    const startedAt = Date.now();
    console.log(`[analytics-sync] Job ${job.id} started`);

    try {
      const result = await batchSyncAnalytics();
      const duration = Date.now() - startedAt;
      console.log(
        `[analytics-sync] Job ${job.id} completed in ${duration}ms — ` +
        `synced: ${result.synced}, errors: ${result.errors}, total: ${result.total}`
      );
    } catch (error) {
      const duration = Date.now() - startedAt;
      console.error(
        `[analytics-sync] Job ${job.id} failed after ${duration}ms:`,
        error
      );
      throw error; // Re-throw so pg-boss marks the job as failed
    }
  });

  bossInstance = boss;
  console.log(`[pg-boss] Worker started. Scheduled "${JOB_NAME}" at "${CRON_SCHEDULE}"`);

  return boss;
}
