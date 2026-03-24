// @crumb asset-crud-detail
// API | asset-management | mutation-endpoint
// why: CRUD operations on individual derived assets (variants); GET retrieves for edit/preview, PATCH updates content after user edits, DELETE removes rejected variants
// in:[assetId:string, body:updateDerivedAssetSchema] out:[DerivedAsset|204-no-content] err:[not-found, validation-failed]
// hazard: No ID format validation on assetId parameter; missing UUID/slug format check before repo lookup
// hazard: PATCH validation delegates entirely to updateDerivedAssetSchema; if schema missing fields, partial updates succeed silently
// hazard: DELETE has no cascade protection; orphaned references in content nodes if asset deletion succeeds but foreign key constraints don't exist
// hazard: No optimistic concurrency control; simultaneous PATCH requests can cause lost updates
// edge:../../domain/derived-asset.ts -> REFERENCES
// edge:../../infrastructure/supabase/repositories/asset.repo.ts -> MUTATES
// edge:../route.ts -> SIBLING (list endpoint)
// prompt: Add ID format validation (UUID/slug); validate all PATCH fields against domain rules before repo call; implement auth/authorization checks; add cascade delete validation; add version/ETag for concurrency control

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';
import { updateDerivedAssetSchema } from '@/lib/validation';
import { NotFoundError } from '@/lib/errors';

// GET /api/assets/[id]
export const GET = withApiHandler(async (ctx) => {
  const { params } = ctx;
  const id = params.id;
  const supabase = createServiceClient();
  const { assetRepo } = getServices(supabase);

  const asset = await assetRepo.findById(id);
  return NextResponse.json(asset);
});

// PATCH /api/assets/[id] — Edit asset content
export const PATCH = withApiHandler<z.infer<typeof updateDerivedAssetSchema>>(async (ctx) => {
  const { params, body } = ctx;
  const id = params.id;

  const supabase = createServiceClient();
  const { assetRepo } = getServices(supabase);

  const asset = await assetRepo.update(id, body);
  return NextResponse.json(asset);
}, { schema: updateDerivedAssetSchema });

// DELETE /api/assets/[id]
export const DELETE = withApiHandler(async (ctx) => {
  const { params } = ctx;
  const id = params.id;
  const supabase = createServiceClient();
  const { assetRepo } = getServices(supabase);

  await assetRepo.delete(id);
  return new NextResponse(null, { status: 204 });
});
