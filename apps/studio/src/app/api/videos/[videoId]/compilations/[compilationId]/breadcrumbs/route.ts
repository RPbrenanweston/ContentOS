import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ videoId: string; compilationId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { compilationId } = await params;
    const body = await request.json();
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
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to add breadcrumb to compilation' } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { compilationId } = await params;
    const body = await request.json();
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
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to reorder breadcrumbs' } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { compilationId } = await params;
    const body = await request.json();
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
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to remove breadcrumb from compilation' } },
      { status: 500 }
    );
  }
}
