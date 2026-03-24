import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createCompilationSchema } from '@/lib/utils/validation';

interface RouteParams {
  params: Promise<{ videoId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { videoId } = await params;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('studio_compilations')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { data: null, error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 }
      );
    }

    const compilations = (data ?? []).map((row) => ({
      id: row.id,
      videoId: row.video_id,
      title: row.title,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ data: compilations });
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to list compilations' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { videoId } = await params;
    const body = await request.json();
    const parsed = createCompilationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') } },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { title, description, breadcrumbIds } = parsed.data;

    // Create compilation
    const { data: compilation, error } = await supabase
      .from('studio_compilations')
      .insert({
        video_id: videoId,
        title,
        description: description ?? null,
      })
      .select()
      .single();

    if (error || !compilation) {
      return NextResponse.json(
        { data: null, error: { code: 'DB_ERROR', message: error?.message ?? 'Failed to create' } },
        { status: 500 }
      );
    }

    // Link breadcrumbs if provided
    if (breadcrumbIds && breadcrumbIds.length > 0) {
      const links = breadcrumbIds.map((bcId, i) => ({
        compilation_id: compilation.id,
        breadcrumb_id: bcId,
        order_index: i,
      }));

      await supabase.from('studio_compilation_breadcrumbs').insert(links);
    }

    return NextResponse.json({
      data: {
        id: compilation.id,
        videoId: compilation.video_id,
        title: compilation.title,
        description: compilation.description,
        createdAt: compilation.created_at,
        updatedAt: compilation.updated_at,
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to create compilation' } },
      { status: 500 }
    );
  }
}
