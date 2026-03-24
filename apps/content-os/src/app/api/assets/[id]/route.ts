// @crumb asset-crud-detail
// API | asset-management | mutation-endpoint
// why: CRUD operations on individual derived assets (variants); GET retrieves for edit/preview, PATCH updates content after user edits, DELETE removes rejected variants
// in:[assetId:string, body:updateDerivedAssetSchema] out:[DerivedAsset|204-no-content] err:[not-found, validation-failed]
// hazard: No ID format validation on assetId parameter; missing UUID/slug format check before repo lookup
// hazard: PATCH validation delegates entirely to updateDerivedAssetSchema; if schema missing fields, partial updates succeed silently
// hazard: DELETE has no cascade protection; orphaned references in content nodes if asset deletion succeeds but foreign key constraints don't exist
// hazard: GET/PATCH/DELETE all lack auth checks; anyone can read/modify/delete any asset with valid UUID
// hazard: Error responses expose schema validation details (parsed.error.flatten()) to client; could leak internal validation rules
// hazard: No optimistic concurrency control; simultaneous PATCH requests can cause lost updates
// edge:../../domain/derived-asset.ts -> REFERENCES
// edge:../../infrastructure/supabase/repositories/asset.repo.ts -> MUTATES
// edge:../route.ts -> SIBLING (list endpoint)
// prompt: Add ID format validation (UUID/slug); validate all PATCH fields against domain rules before repo call; implement auth/authorization checks; add cascade delete validation; sanitize error responses; add version/ETag for concurrency control

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
