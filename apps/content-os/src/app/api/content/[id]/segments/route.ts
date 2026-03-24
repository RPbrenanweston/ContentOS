import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';
import type { SegmentType } from '@/domain';

// GET /api/content/[id]/segments — List segments for a content node
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const type = request.nextUrl.searchParams.get('type') as SegmentType | null;

    const supabase = createServiceClient();
    const { segmentRepo } = getServices(supabase);

    const segments = await segmentRepo.findByNodeId(id, type ?? undefined);
    return NextResponse.json(segments);
  } catch (error) {
    console.error('GET /api/content/[id]/segments error:', error);
    return NextResponse.json(
      { error: 'Failed to list segments' },
      { status: 500 },
    );
  }
}
