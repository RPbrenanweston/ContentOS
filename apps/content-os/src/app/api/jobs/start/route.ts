// @crumb jobs-start-trigger
// API | job-management | worker-start
// why: Provide an HTTP endpoint to initialize pg-boss workers; enables deployment-time or on-demand worker startup
// in:[GET] out:[JSON {started, scheduledJobs}] err:[worker-start-failure]
// hazard: Must be protected by auth in production -- currently relies on withApiHandler's x-user-id extraction
// hazard: If DATABASE_URL is not set, this route returns 500 with a clear message
// edge:../../lib/jobs/analytics-sync.job.ts -> USES

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { startAnalyticsSyncWorker } from '@/lib/jobs/analytics-sync.job';

// GET /api/jobs/start -- Initialize pg-boss workers and cron schedules.
// Idempotent: pg-boss deduplicates schedules and the worker singleton
// prevents duplicate instances.
export const GET = withApiHandler(async () => {
  try {
    await startAnalyticsSyncWorker();

    return NextResponse.json({
      started: true,
      scheduledJobs: ['analytics-sync'],
    });
  } catch (error) {
    console.error('[jobs/start] Failed to start workers:', error);
    return NextResponse.json(
      {
        started: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
});
