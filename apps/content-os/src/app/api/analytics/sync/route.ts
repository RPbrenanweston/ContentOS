// @crumb analytics-sync-trigger
// API | metrics-sync | job-trigger
// why: Triggers external analytics platform synchronization for published jobs; surfaces platform-specific metrics (impressions, engagement) back to metrics database
// in:[POST:jobId] out:[JSON-sync-result] err:[invalid-body, fetch-failure]
// hazard: Incomplete implementation--production cron loop marked TODO; without batch sync, historical job metrics never synchronized
// hazard: Missing error handling on fetchMetrics call; external API failures silently return undefined, breaking metrics aggregation
// hazard: No ID format validation on jobId; invalid IDs passed to distributionService could cause cascading errors
// hazard: No idempotency key or duplicate-check; multiple requests for same jobId trigger redundant external API calls
// edge:../../infrastructure/supabase/client.ts -> USES
// edge:../../services/container.ts -> USES
// edge:../../services/distribution.ts -> USES
// prompt: Implement batch sync loop for all published jobs; add validation and error handling on fetchMetrics response; validate jobId format before external call; implement idempotency/deduplication


import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';
import { batchSyncAnalytics } from '@/lib/jobs/analytics-sync.job';

// POST /api/analytics/sync — Trigger metrics sync for published jobs
// In production, this runs automatically via a pg-boss cron job (every 30 min).
// This endpoint remains available for manual/on-demand triggers.
export const POST = withApiHandler(async (ctx) => {
  const { request } = ctx;
  const body = await request.json().catch(() => ({}));
  const jobId = body.jobId as string | undefined;

  // Single-job sync: fetch metrics for a specific job by ID
  if (jobId) {
    const supabase = createServiceClient();
    const { distributionService } = getServices(supabase);
    const metrics = await distributionService.fetchMetrics(jobId);
    return NextResponse.json({ synced: 1, metrics });
  }

  // Batch sync: delegate to shared function (also used by pg-boss worker)
  const result = await batchSyncAnalytics();
  return NextResponse.json(result);
});
