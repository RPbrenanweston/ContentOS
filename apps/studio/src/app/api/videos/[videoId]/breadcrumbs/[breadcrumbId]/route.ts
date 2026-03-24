import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { updateBreadcrumbSchema } from '@/lib/utils/validation';
import { mapBreadcrumb } from '@/lib/utils/mappers';

interface RouteParams {
  params: Promise<{ videoId: string; breadcrumbId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { breadcrumbId } = await params;
    const body = await request.json();
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
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to update breadcrumb' } },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { breadcrumbId } = await params;
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
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete breadcrumb' } },
      { status: 500 }
    );
  }
}
