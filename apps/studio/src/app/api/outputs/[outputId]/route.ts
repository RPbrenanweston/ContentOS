// @crumb output-detail-fetch
// API | generated content retrieval | async result consumption
// why: Fetch completed output including text, file URL, and status for breadcrumb or compilation transcriptions
// in:[GET outputId] out:[output object with id, type, textContent, fileUrl, status, error, timestamps] err:[NOT_FOUND, INTERNAL_ERROR]
// hazard: No authorization check—any client with outputId can fetch generated content belonging to other users
// hazard: File URLs are public but unguarded—no audit of who accessed generated files
// hazard: Status field may be stale if job is still running—no cache invalidation strategy
// edge:../route.ts -> RELATES (outputs created by job dispatch endpoint)
// edge:../jobs/[jobId]/route.ts -> RELATES (job status drives output ready state)
// prompt: Add user ownership check via user_id before returning; add cache headers with short TTL; log output access

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
