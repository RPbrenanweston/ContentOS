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
