import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ outputId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { outputId } = await params;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('studio_outputs')
      .select('*')
      .eq('id', outputId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Output not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        id: data.id,
        breadcrumbId: data.breadcrumb_id,
        compilationId: data.compilation_id,
        type: data.type,
        textContent: data.text_content,
        fileUrl: data.file_url,
        status: data.status,
        errorMessage: data.error_message,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch output' } },
      { status: 500 }
    );
  }
}
