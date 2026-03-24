import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';

// GET /api/analytics — Get performance metrics
// Query params: nodeId, assetId, jobId, from, to
export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get('jobId');
    const assetId = request.nextUrl.searchParams.get('assetId');
    const nodeId = request.nextUrl.searchParams.get('nodeId');

    const supabase = createServiceClient();
    const { metricRepo, jobRepo, assetRepo } = getServices(supabase);

    // Direct job metrics
    if (jobId) {
      const metrics = await metricRepo.findByJobId(jobId);
      return NextResponse.json({ metrics });
    }

    // Aggregate metrics for an asset (across all its distribution jobs)
    if (assetId) {
      const jobs = await jobRepo.findByAssetId(assetId);
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

      return NextResponse.json({
        metrics,
        totals,
        jobCount: jobs.length,
        publishedCount: jobs.filter((j) => j.status === 'published').length,
      });
    }

    // Aggregate metrics for a content node (across all derived assets)
    if (nodeId) {
      const assets = await assetRepo.findByNodeId(nodeId);
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

      return NextResponse.json({
        metrics,
        totals,
        assetCount: assets.length,
        jobCount: jobs.length,
        publishedCount: jobs.filter((j) => j.status === 'published').length,
      });
    }

    return NextResponse.json(
      { error: 'Provide jobId, assetId, or nodeId query parameter' },
      { status: 400 },
    );
  } catch (error) {
    console.error('GET /api/analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
