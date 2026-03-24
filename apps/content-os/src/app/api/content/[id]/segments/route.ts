// @crumb content-segments-list
// API | route-handler | filtered-listing
// why: List content segments by parent node with optional type filtering; supports detail view population and segment UI with sorting and filtering
// in:[nodeId, type query param] out:[ContentSegment[] ordered by sortOrder] err:[404-not-found|invalid-type-filter]
// hazard: No pagination limit; unbounded segment query can timeout or memory-spike for 10k+ segment documents
// hazard: Type filter passed directly as string; invalid enum values silently cast or return empty result instead of 400 error
// edge:../route.ts -> RELATES (content detail)
// edge:../../infrastructure/supabase/repositories/content-segment.repo.ts -> CALLS
// prompt: Add pagination with maxResults limit (e.g., 500); validate type enum before repo call; add 400 response for invalid type filter

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';
import type { SegmentType } from '@/domain';

// GET /api/content/[id]/segments — List segments for a content node
export const GET = withApiHandler(async (ctx) => {
  const { params, request } = ctx;
  const id = params.id;
  const type = request.nextUrl.searchParams.get('type') as SegmentType | null;

  const supabase = createServiceClient();
  const { segmentRepo } = getServices(supabase);

  const segments = await segmentRepo.findByNodeId(id, type ?? undefined);
  return NextResponse.json(segments);
});
