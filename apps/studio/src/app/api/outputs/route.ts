// @crumb output-creation
// API | job dispatch | async generation trigger
// why: Validate output generation requests and dispatch async jobs for breadcrumb or compilation transcription; GET lists outputs with pagination
// in:[GET query params limit/offset | POST body with type, breadcrumbId/compilationId] out:[output list | job object with id and initial status] err:[VALIDATION_ERROR, INTERNAL_ERROR]
// hazard: No authorization check—any client can request output generation for any breadcrumb/compilation consuming resources
// hazard: Error messages from service are propagated raw—stack traces leak via INTERNAL_ERROR
// hazard: Type parameter unconstrained in schema—unknown output types could be dispatched to queue
// edge:../jobs/[jobId]/route.ts -> RELATES (job status queries for returned jobId)
// edge:./[outputId]/route.ts -> RELATES (fetch generated output once job completes)
// edge:@/lib/pagination -> USES for limit/offset pagination
// prompt: Add user ownership validation before job dispatch; constrain type to enum; sanitize service errors

import { NextResponse } from 'next/server';
import { generateOutputSchema } from '@/lib/utils/validation';
import { createOutputJob } from '@/lib/services/output.service';
import { withApiHandler } from '@/lib/api-handler';
import { parsePagination } from '@/lib/pagination';
import { createServerClient } from '@/lib/supabase/server';

export const GET = withApiHandler(async (ctx) => {
  const supabase = createServerClient();
  const { limit, offset } = parsePagination(ctx.request.nextUrl.searchParams);

  const { data, error, count } = await supabase
    .from('output_jobs')
    .select('*', { count: 'exact' })
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    );
  }

  const headers = new Headers();
  headers.set('x-total-count', String(count ?? 0));
  return NextResponse.json({ data: data ?? [] }, { headers });
});

export const POST = withApiHandler(async (ctx) => {
  const body = await ctx.request.json();
  const parsed = generateOutputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') } },
      { status: 400 }
    );
  }

  const result = await createOutputJob({
    type: parsed.data.type,
    breadcrumbId: parsed.data.breadcrumbId,
    compilationId: parsed.data.compilationId,
  });

  return NextResponse.json({ data: result }, { status: 201 });
});
