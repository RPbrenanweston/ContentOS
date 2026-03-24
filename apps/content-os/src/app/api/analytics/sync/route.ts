// @crumb analytics-sync-trigger
// API | metrics-sync | job-trigger
// why: Triggers external analytics platform synchronization for published jobs; surfaces platform-specific metrics (impressions, engagement) back to metrics database
// in:[POST:jobId] out:[JSON-sync-result] err:[invalid-body, fetch-failure]
// hazard: Incomplete implementation—production cron loop marked TODO; without batch sync, historical job metrics never synchronized
// hazard: Missing error handling on fetchMetrics call; external API failures silently return undefined, breaking metrics aggregation
// hazard: No ID format validation on jobId; invalid IDs passed to distributionService could cause cascading errors
// hazard: Missing auth checks; any client can trigger metrics sync for any job without ownership verification
// hazard: Request body parsing ignores validation errors silently (catch () => {}); malformed requests accepted without error response
// hazard: No idempotency key or duplicate-check; multiple requests for same jobId trigger redundant external API calls
// edge:../../infrastructure/supabase/client.ts -> USES
// edge:../../services/container.ts -> USES
// edge:../../services/distribution.ts -> USES
// prompt: Implement batch sync loop for all published jobs; add validation and error handling on fetchMetrics response; validate jobId format before external call; add auth checks for job ownership; implement idempotency/deduplication


import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';

// POST /api/analytics/sync — Trigger metrics sync for published jobs
// In production, this would be called by a pg-boss cron job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const jobId = body.jobId as string | undefined;

    const supabase = createServiceClient();
    const { distributionService } = getServices(supabase);

    if (jobId) {
      const metrics = await distributionService.fetchMetrics(jobId);
      return NextResponse.json({ synced: 1, metrics });
    }

    // TODO: In production, iterate all published jobs and sync metrics
    return NextResponse.json({
      message: 'Metrics sync placeholder — provide jobId to sync a specific job',
      synced: 0,
    });
  } catch (error) {
    console.error('POST /api/analytics/sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
