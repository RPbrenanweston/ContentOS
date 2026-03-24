// @crumb compilation-detail-crud
// API | compilation state | breadcrumb join expansion
// why: Support fetching compilation with linked breadcrumbs and cascading delete of compilation and links
// in:[GET compilationId] [DELETE compilationId] out:[compilation + breadcrumbs array with full breadcrumb objects] [deleted confirmation] err:[NOT_FOUND, DB_ERROR, INTERNAL_ERROR]
// hazard: GET performs nested join with studio_breadcrumbs—N+1 potential if breadcrumbs array grows large
// hazard: DELETE only deletes compilation, not the studio_breadcrumbs records—orphaned records remain if constraints don't cascade
// edge:../route.ts -> RELATES (individual compilations from parent list)
// edge:./breadcrumbs/route.ts -> SERVES (breadcrumb link management for this compilation)
// prompt: Consider pagination or nested select limit for breadcrumbs array; verify cascade delete rules in schema

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ videoId: string; compilationId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { compilationId } = await params;
    const supabase = createServerClient();

    const { data: compilation, error } = await supabase
      .from('studio_compilations')
      .select('*')
      .eq('id', compilationId)
      .single();

    if (error || !compilation) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Compilation not found' } },
        { status: 404 }
      );
    }

    // Get linked breadcrumbs
    const { data: links } = await supabase
      .from('studio_compilation_breadcrumbs')
      .select('*, studio_breadcrumbs(*)')
      .eq('compilation_id', compilationId)
      .order('order_index', { ascending: true });

    return NextResponse.json({
      data: {
        id: compilation.id,
        videoId: compilation.video_id,
        title: compilation.title,
        description: compilation.description,
        createdAt: compilation.created_at,
        updatedAt: compilation.updated_at,
        breadcrumbs: (links ?? []).map((link) => ({
          id: link.id,
          compilationId: link.compilation_id,
          breadcrumbId: link.breadcrumb_id,
          orderIndex: link.order_index,
          breadcrumb: link.studio_breadcrumbs ? {
            id: link.studio_breadcrumbs.id,
            videoId: link.studio_breadcrumbs.video_id,
            timestampSeconds: Number(link.studio_breadcrumbs.timestamp_seconds),
            startTimeSeconds: Number(link.studio_breadcrumbs.start_time_seconds),
            endTimeSeconds: Number(link.studio_breadcrumbs.end_time_seconds),
            note: link.studio_breadcrumbs.note,
            tags: link.studio_breadcrumbs.tags,
            orderIndex: link.studio_breadcrumbs.order_index,
            createdAt: link.studio_breadcrumbs.created_at,
            updatedAt: link.studio_breadcrumbs.updated_at,
          } : null,
        })),
      },
    });
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch compilation' } },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { compilationId } = await params;
    const supabase = createServerClient();

    const { error } = await supabase
      .from('studio_compilations')
      .delete()
      .eq('id', compilationId);

    if (error) {
      return NextResponse.json(
        { data: null, error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { deleted: true } });
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete compilation' } },
      { status: 500 }
    );
  }
}
