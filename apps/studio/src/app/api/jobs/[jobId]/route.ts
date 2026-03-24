import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId } = await params;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('studio_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Job not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        id: data.id,
        outputId: data.output_id,
        status: data.status,
        progress: data.progress,
        errorMessage: data.error_message,
      },
    });
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch job status' } },
      { status: 500 }
    );
  }
}
