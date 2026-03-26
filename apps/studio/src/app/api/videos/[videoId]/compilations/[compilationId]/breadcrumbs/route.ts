// @crumb compilation-breadcrumb-crud
// API | compilation composition | breadcrumb sequencing
// why: Support adding, reordering, and removing breadcrumbs from a compilation with independent order management
// in:[POST compilationId + body with breadcrumbId/orderIndex] [PATCH compilationId + body with breadcrumbIds array] [DELETE compilationId + body with breadcrumbId] out:[created link] [reordered links] [deleted confirmation] err:[VALIDATION_ERROR, DB_ERROR, INTERNAL_ERROR]
// hazard: PATCH deletes and re-inserts all links—vulnerable to race conditions if concurrent PATCH/POST/DELETE on same compilation
// hazard: No validation that breadcrumbIds exist before insert—foreign key constraint will fail but with cryptic error
// edge:../route.ts -> RELATES (breadcrumb management for parent compilation)
// edge:../../breadcrumbs/route.ts -> RELATES (breadcrumbs belong to parent video)
// prompt: Implement advisory locks or version timestamps for concurrent mutation safety; validate breadcrumbId existence pre-insert

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withApiHandler } from '@/lib/api-handler';

export const POST = withApiHandler(async (ctx) => {
  const { compilationId } = ctx.params;
  const body = await ctx.request.json();
  const { breadcrumbId, orderIndex } = body;

  if (!breadcrumbId) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'breadcrumbId is required' } },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('studio_compilation_breadcrumbs')
    .insert({
      compilation_id: compilationId,
      breadcrumb_id: breadcrumbId,
      order_index: orderIndex ?? 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: {
      id: data.id,
      compilationId: data.compilation_id,
      breadcrumbId: data.breadcrumb_id,
      orderIndex: data.order_index,
    },
  }, { status: 201 });
});

export const PATCH = withApiHandler(async (ctx) => {
  const { compilationId } = ctx.params;
  const body = await ctx.request.json();
  const { breadcrumbIds } = body;

  if (!Array.isArray(breadcrumbIds)) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'breadcrumbIds array is required' } },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Delete existing links
  await supabase
    .from('studio_compilation_breadcrumbs')
    .delete()
    .eq('compilation_id', compilationId);

  // Re-insert in new order
  if (breadcrumbIds.length > 0) {
    const links = breadcrumbIds.map((bcId: string, i: number) => ({
      compilation_id: compilationId,
      breadcrumb_id: bcId,
      order_index: i,
    }));

    const { data, error } = await supabase
      .from('studio_compilation_breadcrumbs')
      .insert(links)
      .select();

    if (error) {
      return NextResponse.json(
        { data: null, error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: (data ?? []).map((row) => ({
        id: row.id,
        compilationId: row.compilation_id,
        breadcrumbId: row.breadcrumb_id,
        orderIndex: row.order_index,
      })),
    });
  }

  return NextResponse.json({ data: [] });
});

export const DELETE = withApiHandler(async (ctx) => {
  const { compilationId } = ctx.params;
  const body = await ctx.request.json();
  const { breadcrumbId } = body;

  if (!breadcrumbId) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'breadcrumbId is required' } },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from('studio_compilation_breadcrumbs')
    .delete()
    .eq('compilation_id', compilationId)
    .eq('breadcrumb_id', breadcrumbId);

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { deleted: true } });
});
