import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';
import { updateDerivedAssetSchema } from '@/lib/validation';
import { NotFoundError } from '@/lib/errors';

// GET /api/assets/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const { assetRepo } = getServices(supabase);

    const asset = await assetRepo.findById(id);
    return NextResponse.json(asset);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('GET /api/assets/[id] error:', error);
    return NextResponse.json({ error: 'Failed to get asset' }, { status: 500 });
  }
}

// PATCH /api/assets/[id] — Edit asset content
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateDerivedAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { assetRepo } = getServices(supabase);

    const asset = await assetRepo.update(id, parsed.data);
    return NextResponse.json(asset);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('PATCH /api/assets/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }
}

// DELETE /api/assets/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const { assetRepo } = getServices(supabase);

    await assetRepo.delete(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/assets/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}
