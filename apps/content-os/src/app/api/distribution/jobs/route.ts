// @crumb distribution-jobs-list
// API | route-handler | job-status-query
// why: Retrieve distribution job history for an asset; tracks posting status, metrics, and platform-specific delivery state across accounts
// in:[assetId query param] out:[DistributionJob[]] err:[missing-assetId, asset-not-found]
// hazard: assetId required but no format validation; accepts any string, fails silently if malformed UUID
// hazard: No pagination limit; jobRepo.findByAssetId could return thousands of jobs, memory-spiking and timing out response
// hazard: Joins multiple platforms but doesn't validate all platform data is present; missing metrics on failed posts could crash rendering
// hazard: No auth check; any assetId reveals posting history, metrics, platform credentials metadata exposure risk
// hazard: No filtering by owner; user can query jobs for other users' assets if they guess assetId
// edge:../../../infrastructure/supabase/repositories/distribution-job.repo.ts -> QUERIES
// edge:../publish/route.ts -> RELATED (creates these jobs)
// edge:../accounts/route.ts -> REFERENCES-ACCOUNTS
// prompt: Add assetId format validation; implement pagination with maxResults limit; add auth check for asset ownership; validate all job records have required metrics fields before response
//
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';

// GET /api/distribution/jobs — List distribution jobs
export async function GET(request: NextRequest) {
  try {
    const assetId = request.nextUrl.searchParams.get('assetId');
    if (!assetId) {
      return NextResponse.json(
        { error: 'assetId query parameter required' },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { jobRepo } = getServices(supabase);

    const jobs = await jobRepo.findByAssetId(assetId);
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('GET /api/distribution/jobs error:', error);
    return NextResponse.json({ error: 'Failed to list jobs' }, { status: 500 });
  }
}
