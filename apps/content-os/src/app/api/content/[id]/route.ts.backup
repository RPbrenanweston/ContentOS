import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';
import { updateContentNodeSchema } from '@/lib/validation';
import { NotFoundError } from '@/lib/errors';

// GET /api/content/[id] — Get content node with segments
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const { contentNodeRepo, segmentRepo } = getServices(supabase);

    const node = await contentNodeRepo.findById(id);
    const segments = await segmentRepo.findByNodeId(id);

    return NextResponse.json({ ...node, segments });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('GET /api/content/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to get content node' },
      { status: 500 },
    );
  }
}

// PATCH /api/content/[id] — Update content node
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateContentNodeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { contentNodeRepo } = getServices(supabase);

    const node = await contentNodeRepo.update(id, parsed.data);
    return NextResponse.json(node);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('PATCH /api/content/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update content node' },
      { status: 500 },
    );
  }
}

// DELETE /api/content/[id] — Delete content node (cascades)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const { contentNodeRepo } = getServices(supabase);

    await contentNodeRepo.delete(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/content/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete content node' },
      { status: 500 },
    );
  }
}
