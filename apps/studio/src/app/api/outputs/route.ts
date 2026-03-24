import { NextRequest, NextResponse } from 'next/server';
import { generateOutputSchema } from '@/lib/utils/validation';
import { createOutputJob } from '@/lib/services/output.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create output';
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
