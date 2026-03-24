// @crumb analytics-metrics-aggregation
// API | metrics-aggregation | aggregator
// why: Aggregates performance metrics across jobs, assets, and content nodes; surfaces publish performance and engagement data for insights dashboard
// in:[query:jobId|assetId|nodeId|from|to] out:[JSON-metrics-array] err:[missing-param, fetch-failure]
// hazard: N+1 query problem--Promise.all chains could trigger cascading lookups per asset or job without pagination or batch optimizations
// hazard: No ID format validation on jobId, assetId, nodeId; invalid IDs could cause silent failures or unexpected repo behavior
// hazard: Missing auth checks; any client can request metrics for any jobId/assetId/nodeId without ownership verification
// hazard: Aggregation reduce logic assumes all metric objects have identical shape; missing or extra fields could break totals calculation
// hazard: No pagination on metrics aggregation results; large datasets (1000+ metrics) could exhaust memory or timeout
// edge:../../infrastructure/supabase/client.ts -> USES
// edge:../../services/container.ts -> USES
// edge:../../lib/pagination.ts -> USES
// edge:/api/jobs, /api/assets -> IMPLIED-DEPENDENCIES
// prompt: Add ID format validation (UUID checks) before repo queries; add auth middleware to verify asset ownership; reconcile metric object schema expectations; sanitize error responses


import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';
import { parsePagination } from '@/lib/pagination';

// GET /api/analytics — Get performance metrics
// Query params: nodeId, assetId, jobId, from, to, limit, offset
export const GET = withApiHandler(async (ctx) => {
  const { request } = ctx;
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get('jobId');
  const assetId = searchParams.get('assetId');
  const nodeId = searchParams.get('nodeId');
  const { limit, offset } = parsePagination(searchParams);

  const supabase = createServiceClient();
  const { metricRepo, jobRepo, assetRepo } = getServices(supabase);

  // Direct job metrics
  if (jobId) {
    const metrics = await metricRepo.findByJobId(jobId, { limit, offset });
    const total = Array.isArray(metrics) ? metrics.length : 0;
    const headers = new Headers();
    headers.set('x-total-count', String(total));
    return NextResponse.json({ metrics }, { headers });
  }

  // Aggregate metrics for an asset (across all its distribution jobs)
  if (assetId) {
    const jobs = await jobRepo.findByAssetId(assetId, { limit, offset });
    const allMetrics = await Promise.all(
      jobs.map((j) => metricRepo.findByJobId(j.id)),
    );
    const metrics = allMetrics.flat();

    // Aggregate totals
    const totals = metrics.reduce(
      (acc, m) => ({
        impressions: acc.impressions + m.impressions,
        views: acc.views + m.views,
        clicks: acc.clicks + m.clicks,
        likes: acc.likes + m.likes,
        comments: acc.comments + m.comments,
        shares: acc.shares + m.shares,
        saves: acc.saves + m.saves,
      }),
      { impressions: 0, views: 0, clicks: 0, likes: 0, comments: 0, shares: 0, saves: 0 },
    );

    const headers = new Headers();
    headers.set('x-total-count', String(metrics.length));
    return NextResponse.json({
      metrics,
      totals,
      jobCount: jobs.length,
      publishedCount: jobs.filter((j) => j.status === 'published').length,
    }, { headers });
  }

  // Aggregate metrics for a content node (across all derived assets)
  if (nodeId) {
    const assets = await assetRepo.findByNodeId(nodeId, { limit, offset });
    const allJobs = await Promise.all(
      assets.map((a) => jobRepo.findByAssetId(a.id)),
    );
    const jobs = allJobs.flat();
    const allMetrics = await Promise.all(
      jobs.map((j) => metricRepo.findByJobId(j.id)),
    );
    const metrics = allMetrics.flat();

    const totals = metrics.reduce(
      (acc, m) => ({
        impressions: acc.impressions + m.impressions,
        views: acc.views + m.views,
        clicks: acc.clicks + m.clicks,
        likes: acc.likes + m.likes,
        comments: acc.comments + m.comments,
        shares: acc.shares + m.shares,
        saves: acc.saves + m.saves,
      }),
      { impressions: 0, views: 0, clicks: 0, likes: 0, comments: 0, shares: 0, saves: 0 },
    );

    const headers = new Headers();
    headers.set('x-total-count', String(metrics.length));
    return NextResponse.json({
      metrics,
      totals,
      assetCount: assets.length,
      jobCount: jobs.length,
      publishedCount: jobs.filter((j) => j.status === 'published').length,
    }, { headers });
  }

  return NextResponse.json(
    { error: 'Provide jobId, assetId, or nodeId query parameter' },
    { status: 400 },
  );
});
