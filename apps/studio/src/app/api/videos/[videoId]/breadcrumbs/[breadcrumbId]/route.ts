// @crumb breadcrumb-detail-crud
// API | temporal marker mutation | note and tag management
// why: Support updating individual breadcrumb timestamps, notes, tags, and ordering; support deletion
// in:[PATCH breadcrumbId + body with startTimeSeconds/endTimeSeconds/note/tags/orderIndex] [DELETE breadcrumbId] out:[updated breadcrumb] [deleted confirmation] err:[DB_ERROR, VALIDATION_ERROR, INTERNAL_ERROR]
// hazard: No validation that startTimeSeconds < endTimeSeconds or that ranges don't exceed video duration
// hazard: orderIndex updates not synchronized—manual updates can create gaps or duplicate indices in ordered list
// edge:../route.ts -> RELATES (PATCH/DELETE operate on individual breadcrumbs from parent list)
// edge:../mappers -> CALLS mapBreadcrumb to format response
// prompt: Add constraint validation for time ranges; consider using transactional reordering when orderIndex changes

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { updateBreadcrumbSchema } from '@/lib/utils/validation';
import { mapBreadcrumb } from '@/lib/utils/mappers';
import { withApiHandler } from '@/lib/api-handler';

export const PATCH = withApiHandler(async (ctx) => {
  const { breadcrumbId } = ctx.params;
  const body = await ctx.request.json();
  const parsed = updateBreadcrumbSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') } },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const updates: Record<string, unknown> = {};

  if (parsed.data.startTimeSeconds != null) updates.start_time_seconds = parsed.data.startTimeSeconds;
  if (parsed.data.endTimeSeconds != null) updates.end_time_seconds = parsed.data.endTimeSeconds;
  if (parsed.data.note !== undefined) updates.note = parsed.data.note;
  if (parsed.data.tags !== undefined) updates.tags = parsed.data.tags;
  if (parsed.data.orderIndex != null) updates.order_index = parsed.data.orderIndex;

  const { data, error } = await supabase
    .from('studio_breadcrumbs')
    .update(updates)
    .eq('id', breadcrumbId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: mapBreadcrumb(data) });
});

export const DELETE = withApiHandler(async (ctx) => {
  const { breadcrumbId } = ctx.params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from('studio_breadcrumbs')
    .delete()
    .eq('id', breadcrumbId);

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { deleted: true } });
});
