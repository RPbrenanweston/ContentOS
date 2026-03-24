// @crumb breadcrumb-list-crud
// API | temporal markers | video segmentation
// why: Provide endpoints to list breadcrumbs for a video and create new breadcrumbs with temporal clamping
// in:[GET videoId] [POST videoId + body with timestampSeconds, note, tags] out:[breadcrumb array] [created breadcrumb] err:[DB_ERROR, VALIDATION_ERROR, INTERNAL_ERROR]
// hazard: Timestamp clamping uses ±10 second window hardcoded—no configuration for different video types or contexts
// hazard: Order index auto-assigned by existing count without checking for race conditions in concurrent POST requests
// edge:../mappers -> CALLS mapBreadcrumb to format breadcrumb responses
// edge:../videos/[videoId]/route.ts -> RELATES (breadcrumbs belong to parent video)
// prompt: Consider making ±10 second window configurable; use database-level ordering or timestamp-based ordering to avoid race conditions

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createBreadcrumbSchema } from '@/lib/utils/validation';
import { mapBreadcrumb } from '@/lib/utils/mappers';

interface RouteParams {
  params: Promise<{ videoId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { videoId } = await params;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('studio_breadcrumbs')
      .select('*')
      .eq('video_id', videoId)
      .order('timestamp_seconds', { ascending: true });

    if (error) {
      return NextResponse.json(
        { data: null, error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: (data ?? []).map(mapBreadcrumb) });
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to list breadcrumbs' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { videoId } = await params;
    const body = await request.json();
    const parsed = createBreadcrumbSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') } },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { timestampSeconds, note, tags } = parsed.data;

    // Fetch video duration for clamping
    const { data: video } = await supabase
      .from('studio_videos')
      .select('duration_seconds')
      .eq('id', videoId)
      .single();

    const duration = video?.duration_seconds ? Number(video.duration_seconds) : null;
    const startTime = Math.max(0, timestampSeconds - 10);
    const endTime = duration != null
      ? Math.min(duration, timestampSeconds + 10)
      : timestampSeconds + 10;

    // Get next order index
    const { count } = await supabase
      .from('studio_breadcrumbs')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', videoId);

    const { data, error } = await supabase
      .from('studio_breadcrumbs')
      .insert({
        video_id: videoId,
        timestamp_seconds: timestampSeconds,
        start_time_seconds: startTime,
        end_time_seconds: endTime,
        note: note ?? null,
        tags: tags ?? [],
        order_index: count ?? 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { data: null, error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: mapBreadcrumb(data) }, { status: 201 });
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to create breadcrumb' } },
      { status: 500 }
    );
  }
}
