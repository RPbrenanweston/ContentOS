// @crumb distribution-jobs-list
// API | route-handler | job-status-query
// why: Retrieve distribution job history for an asset; tracks posting status, metrics, and platform-specific delivery state across accounts
// in:[assetId query param] out:[DistributionJob[]] err:[missing-assetId, asset-not-found]
// hazard: assetId required but no format validation; accepts any string, fails silently if malformed UUID
// hazard: No pagination limit; jobRepo.findByAssetId could return thousands of jobs, memory-spiking and timing out response
// hazard: No filtering by owner; user can query jobs for other users' assets if they guess assetId
// edge:../../../infrastructure/supabase/repositories/distribution-job.repo.ts -> QUERIES
// edge:../publish/route.ts -> RELATED (creates these jobs)
// edge:../accounts/route.ts -> REFERENCES-ACCOUNTS
// prompt: Add assetId format validation; implement pagination with maxResults limit; add auth check for asset ownership; validate all job records have required metrics fields before response
//
import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';

// GET /api/distribution/jobs — List distribution jobs
export const GET = withApiHandler(async (ctx) => {
  const { request } = ctx;
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
});
