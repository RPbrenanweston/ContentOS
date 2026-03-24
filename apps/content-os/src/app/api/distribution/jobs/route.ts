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
