// @crumb video-detail-crud
// API | video state | associated breadcrumbs
// why: Support fetching video details with breadcrumbs, updating video metadata, and deleting videos
// in:[GET videoId] [PATCH videoId + body with title/durationSeconds] [DELETE videoId] out:[video + breadcrumbs array] [updated video] [deleted confirmation] err:[NOT_FOUND, DB_ERROR, VALIDATION_ERROR, INTERNAL_ERROR]
// hazard: Breadcrumbs auto-fetched with each GET but without pagination—can grow unbounded for long videos
// hazard: PATCH allows updating durationSeconds without validating against actual media or breadcrumb ranges
// edge:../mappers -> CALLS mapVideo, mapBreadcrumb to format responses
// edge:./breadcrumbs/route.ts -> RELATES (GET fetches breadcrumbs for this video)
// prompt: Consider paginating breadcrumbs array; validate durationSeconds against actual video duration if available

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, MVP_USER_ID } from '@/lib/supabase/server';
import { mapVideo, mapBreadcrumb } from '@/lib/utils/mappers';

interface RouteContext {
  params: Promise<{ videoId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { videoId } = await context.params;
    const supabase = createServerClient();

    const { data: video, error: videoError } = await supabase
      .from('studio_videos')
      .select('*')
      .eq('id', videoId)
      .eq('user_id', MVP_USER_ID)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Video not found' } },
        { status: 404 }
      );
    }

    const { data: breadcrumbs, error: breadcrumbError } = await supabase
      .from('studio_breadcrumbs')
      .select('*')
      .eq('video_id', videoId)
      .order('timestamp_seconds', { ascending: true });

    if (breadcrumbError) {
      return NextResponse.json(
        { data: null, error: { code: 'DB_ERROR', message: breadcrumbError.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        ...mapVideo(video),
        breadcrumbs: (breadcrumbs ?? []).map(mapBreadcrumb),
      },
    });
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch video' } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { videoId } = await context.params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.durationSeconds !== undefined) updates.duration_seconds = body.durationSeconds;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('studio_videos')
      .update(updates)
      .eq('id', videoId)
      .eq('user_id', MVP_USER_ID)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Video not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: mapVideo(data) });
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to update video' } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { videoId } = await context.params;
    const supabase = createServerClient();

    const { error } = await supabase
      .from('studio_videos')
      .delete()
      .eq('id', videoId)
      .eq('user_id', MVP_USER_ID);

    if (error) {
      return NextResponse.json(
        { data: null, error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { deleted: true } });
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete video' } },
      { status: 500 }
    );
  }
}
