// @crumb videos-list-crud
// API | video inventory | persistence
// why: Provide endpoints for querying all videos and creating new videos for a user
// in:[GET query params limit/offset | POST body with sourceType, sourceUrl, fileUrl, title, durationSeconds] out:[JSON array of videos | created video object] err:[DB_ERROR, VALIDATION_ERROR, INTERNAL_ERROR]
// hazard: Missing validation of sourceUrl/fileUrl format before database insert
// edge:../mappers -> CALLS to map database rows to API response format
// edge:../validation -> CALLS createVideoSchema for input validation
// edge:@/lib/pagination -> USES for limit/offset pagination
// prompt: Verify sourceUrl and fileUrl are valid URLs before database persist

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createVideoSchema } from '@/lib/utils/validation';
import { mapVideo } from '@/lib/utils/mappers';
import { withApiHandler } from '@/lib/api-handler';
import { parsePagination } from '@/lib/pagination';

export const GET = withApiHandler(async (ctx) => {
  const supabase = createServerClient();
  const { limit, offset } = parsePagination(ctx.request.nextUrl.searchParams);

  const { data, error, count } = await supabase
    .from('studio_videos')
    .select('*', { count: 'exact' })
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  const headers = new Headers();
  headers.set('x-total-count', String(count ?? 0));
  return NextResponse.json({ data: (data ?? []).map(mapVideo) }, { headers });
});

export const POST = withApiHandler(async (ctx) => {
  const body = await ctx.request.json();
  const parsed = createVideoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues.map((i) => i.message).join('; '),
        },
      },
      { status: 400 }
    );
  }

  const { sourceType, sourceUrl, fileUrl, title, durationSeconds } = parsed.data;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('studio_videos')
    .insert({
      user_id: ctx.userId,
      source_type: sourceType,
      source_url: sourceUrl ?? null,
      file_url: fileUrl ?? null,
      title,
      duration_seconds: durationSeconds ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: mapVideo(data) }, { status: 201 });
});
