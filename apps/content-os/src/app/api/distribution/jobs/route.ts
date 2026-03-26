// @crumb distribution-jobs-list
// API | route-handler | job-status-query
// why: Retrieve distribution job history for an asset; tracks posting status, metrics, and platform-specific delivery state across accounts
// in:[assetId query param, limit, offset] out:[DistributionJob[]] err:[missing-assetId, asset-not-found]
// hazard: assetId required but no format validation; accepts any string, fails silently if malformed UUID
// hazard: No filtering by owner; user can query jobs for other users' assets if they guess assetId
// edge:../../../infrastructure/supabase/repositories/distribution-job.repo.ts -> QUERIES
// edge:../publish/route.ts -> RELATED (creates these jobs)
// edge:../accounts/route.ts -> REFERENCES-ACCOUNTS
// edge:../../../lib/pagination.ts -> USES
// prompt: Add assetId format validation; add auth check for asset ownership; validate all job records have required metrics fields before response
//
import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';
import { parsePagination } from '@/lib/pagination';

// GET /api/distribution/jobs — List distribution jobs
export const GET = withApiHandler(async (ctx) => {
  const { request } = ctx;
  const searchParams = request.nextUrl.searchParams;
  const assetId = searchParams.get('assetId');
  if (!assetId) {
    return NextResponse.json(
      { error: 'assetId query parameter required' },
      { status: 400 },
    );
  }

  const { limit, offset } = parsePagination(searchParams);
  const supabase = createServiceClient();
  const { jobRepo } = getServices(supabase);

  const jobs = await jobRepo.findByAssetId(assetId, { limit, offset });
  const total = Array.isArray(jobs) ? jobs.length : 0;
  const headers = new Headers();
  headers.set('x-total-count', String(total));
  return NextResponse.json({ jobs }, { headers });
});
