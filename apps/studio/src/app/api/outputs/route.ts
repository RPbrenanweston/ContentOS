// @crumb output-creation
// API | job dispatch | async generation trigger
// why: Validate output generation requests and dispatch async jobs for breadcrumb or compilation transcription
// in:[POST body with type, breadcrumbId/compilationId] out:[job object with id and initial status] err:[VALIDATION_ERROR, INTERNAL_ERROR]
// hazard: No authorization check—any client can request output generation for any breadcrumb/compilation consuming resources
// hazard: Error messages from service are propagated raw—stack traces leak via INTERNAL_ERROR
// hazard: Type parameter unconstrained in schema—unknown output types could be dispatched to queue
// edge:../jobs/[jobId]/route.ts -> RELATES (job status queries for returned jobId)
// edge:./[outputId]/route.ts -> RELATES (fetch generated output once job completes)
// prompt: Add user ownership validation before job dispatch; constrain type to enum; sanitize service errors

import { NextResponse } from 'next/server';
import { generateOutputSchema } from '@/lib/utils/validation';
import { createOutputJob } from '@/lib/services/output.service';
import { withApiHandler } from '@/lib/api-handler';

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
