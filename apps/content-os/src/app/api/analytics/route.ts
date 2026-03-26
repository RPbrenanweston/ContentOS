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

interface PartialError {
  metric: string;
  error: string;
  timestamp: string;
}

interface MetricAggregates {
  impressions: number;
  views: number;
  clicks: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

// GET /api/analytics — Get performance metrics with per-metric error isolation
// Query params: nodeId, assetId, jobId, from, to, limit, offset
// Returns partial results with error details for failed metrics
export const GET = withApiHandler(async (ctx) => {
  const { request, requestId } = ctx;
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get('jobId');
  const assetId = searchParams.get('assetId');
  const nodeId = searchParams.get('nodeId');
  const { limit, offset } = parsePagination(searchParams);

  const supabase = createServiceClient();
  const { metricRepo, jobRepo, assetRepo } = getServices(supabase);

  const partialErrors: PartialError[] = [];

  // Direct job metrics
  if (jobId) {
    try {
      const metrics = await metricRepo.findByJobId(jobId);
      const total = Array.isArray(metrics) ? metrics.length : 0;
      const headers = new Headers();
      headers.set('x-total-count', String(total));
      return NextResponse.json(
        {
          metrics,
          partial_errors: partialErrors.length > 0 ? partialErrors : undefined,
        },
        { headers },
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch job metrics';
      console.error(`[${requestId}] Job metrics error for jobId=${jobId}:`, errorMessage);
      partialErrors.push({
        metric: 'jobMetrics',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        {
          metrics: null,
          partial_errors: partialErrors,
        },
        { status: 200 }, // 200 because we have a partial response
      );
    }
  }

  // Aggregate metrics for an asset (across all its distribution jobs)
  if (assetId) {
    let jobs: unknown[] = [];
    try {
      jobs = await jobRepo.findByAssetId(assetId, { limit, offset });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch jobs for asset';
      console.error(`[${requestId}] Asset jobs fetch error for assetId=${assetId}:`, errorMessage);
      partialErrors.push({
        metric: 'assetJobs',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }

    let allMetrics: unknown[][] = [];
    try {
      allMetrics = await Promise.all(
        jobs.map((j: any) => metricRepo.findByJobId(j.id)),
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch metrics for asset jobs';
      console.error(`[${requestId}] Asset metrics aggregation error:`, errorMessage);
      partialErrors.push({
        metric: 'assetMetrics',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }

    const metrics = allMetrics.flat();
    const defaultTotals: MetricAggregates = {
      impressions: 0,
      views: 0,
      clicks: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
    };

    let totals = defaultTotals;

    try {
      totals = metrics.reduce(
        (acc: MetricAggregates, m: any) => ({
          impressions: acc.impressions + (m.impressions || 0),
          views: acc.views + (m.views || 0),
          clicks: acc.clicks + (m.clicks || 0),
          likes: acc.likes + (m.likes || 0),
          comments: acc.comments + (m.comments || 0),
          shares: acc.shares + (m.shares || 0),
          saves: acc.saves + (m.saves || 0),
        }),
        defaultTotals,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to aggregate asset metric totals';
      console.error(`[${requestId}] Asset totals aggregation error:`, errorMessage);
      partialErrors.push({
        metric: 'assetTotals',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }

    const headers = new Headers();
    headers.set('x-total-count', String(metrics.length));
    return NextResponse.json(
      {
        metrics: metrics.length > 0 ? metrics : null,
        totals: metrics.length > 0 ? totals : null,
        jobCount: (jobs as any[]).length,
        publishedCount: (jobs as any[]).filter((j: any) => j.status === 'published').length,
        partial_errors: partialErrors.length > 0 ? partialErrors : undefined,
      },
      { headers },
    );
  }

  // Aggregate metrics for a content node (across all derived assets)
  if (nodeId) {
    let assets: unknown[] = [];
    try {
      assets = await assetRepo.findByNodeId(nodeId, { limit, offset });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch assets for node';
      console.error(`[${requestId}] Node assets fetch error for nodeId=${nodeId}:`, errorMessage);
      partialErrors.push({
        metric: 'nodeAssets',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }

    let allJobs: unknown[][] = [];
    try {
      allJobs = await Promise.all(
        assets.map((a: any) => jobRepo.findByAssetId(a.id)),
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch jobs for node assets';
      console.error(`[${requestId}] Node jobs fetch error:`, errorMessage);
      partialErrors.push({
        metric: 'nodeJobs',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }

    const jobs = allJobs.flat();

    let allMetrics: unknown[][] = [];
    try {
      allMetrics = await Promise.all(
        jobs.map((j: any) => metricRepo.findByJobId(j.id)),
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch metrics for node jobs';
      console.error(`[${requestId}] Node metrics aggregation error:`, errorMessage);
      partialErrors.push({
        metric: 'nodeMetrics',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }

    const metrics = allMetrics.flat();
    const defaultTotals: MetricAggregates = {
      impressions: 0,
      views: 0,
      clicks: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
    };

    let totals = defaultTotals;

    try {
      totals = metrics.reduce(
        (acc: MetricAggregates, m: any) => ({
          impressions: acc.impressions + (m.impressions || 0),
          views: acc.views + (m.views || 0),
          clicks: acc.clicks + (m.clicks || 0),
          likes: acc.likes + (m.likes || 0),
          comments: acc.comments + (m.comments || 0),
          shares: acc.shares + (m.shares || 0),
          saves: acc.saves + (m.saves || 0),
        }),
        defaultTotals,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to aggregate node metric totals';
      console.error(`[${requestId}] Node totals aggregation error:`, errorMessage);
      partialErrors.push({
        metric: 'nodeTotals',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }

    const headers = new Headers();
    headers.set('x-total-count', String(metrics.length));
    return NextResponse.json(
      {
        metrics: metrics.length > 0 ? metrics : null,
        totals: metrics.length > 0 ? totals : null,
        assetCount: (assets as any[]).length,
        jobCount: jobs.length,
        publishedCount: (jobs as any[]).filter((j: any) => j.status === 'published').length,
        partial_errors: partialErrors.length > 0 ? partialErrors : undefined,
      },
      { headers },
    );
  }

  return NextResponse.json(
    { error: 'Provide jobId, assetId, or nodeId query parameter' },
    { status: 400 },
  );
});
