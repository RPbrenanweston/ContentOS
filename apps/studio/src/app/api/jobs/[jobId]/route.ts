// @crumb job-status-query
// API | async work tracking | background task state
// why: Provide endpoint to poll job status including progress and error messages for async output generation
// in:[GET jobId] out:[job object with status, progress, errorMessage] err:[NOT_FOUND, INTERNAL_ERROR]
// hazard: No polling rate limit—clients can hammer endpoint causing database load
// hazard: Error messages returned raw without sanitization—stack traces or secrets could leak
// hazard: No user authorization check—any client with a jobId can query status (privacy issue)
// edge:../outputs/route.ts -> RELATES (jobs created by output generation endpoint)
// prompt: Add x-ratelimit headers; sanitize error messages; verify requester owns job via user_id before returning

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withApiHandler } from '@/lib/api-handler';

export const GET = withApiHandler(async (ctx) => {
  const { jobId } = ctx.params;
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
});
