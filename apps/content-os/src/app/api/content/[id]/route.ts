// @crumb content-detail-crud
// API | route-handler | single-record-operations
// why: Handles GET/PATCH/DELETE for individual content nodes; orchestrates segment loading for detail view and cascading deletes for data integrity
// in:[/api/content/[id]] out:[JSON-node-with-segments|204-success] err:[404-not-found|validation-error|delete-cascade-failure]
// hazard: No validation on node ID format; malformed UUIDs silently pass to repo layer
// hazard: DELETE cascades without checking reference counts; orphaned assets possible if external systems reference deleted content
// hazard: PATCH validation delegates entirely to schema; no business logic checks for conflicting status transitions (e.g., published -> draft)
// hazard: GET segments loaded without pagination; large documents with thousands of segments cause memory spike
// hazard: Error responses expose internal schema validation details that could inform attack strategies
// edge:../../services/container.ts -> USES (getServices, dependency injection)
// edge:../../infrastructure/supabase/client.ts -> USES (createServiceClient)
// edge:../../lib/validation.ts -> USES (updateContentNodeSchema)
// edge:../../lib/errors.ts -> USES (NotFoundError)
// edge:../route.ts -> RELATED (sibling GET/POST list endpoint)
// prompt: Add ID format validation before repo calls; check reference counts before DELETE cascade; implement segment pagination with maxResults limit; reduce error details in 4xx responses
// prompt: Consider optimistic locking for PATCH to prevent concurrent edit conflicts; add audit logging for DELETE operations
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';
import { updateContentNodeSchema } from '@/lib/validation';
import { NotFoundError } from '@/lib/errors';

// GET /api/content/[id] — Get content node with segments
export const GET = withApiHandler(async (ctx) => {
  const { params } = ctx;
  const id = params.id;
  const supabase = createServiceClient();
  const { contentNodeRepo, segmentRepo } = getServices(supabase);

  const node = await contentNodeRepo.findById(id);
  const segments = await segmentRepo.findByNodeId(id);

  return NextResponse.json({ ...node, segments });
});

// PATCH /api/content/[id] — Update content node
export const PATCH = withApiHandler<z.infer<typeof updateContentNodeSchema>>(async (ctx) => {
  const { params, body } = ctx;
  const id = params.id;

  const supabase = createServiceClient();
  const { contentNodeRepo } = getServices(supabase);

  const node = await contentNodeRepo.update(id, body);
  return NextResponse.json(node);
}, { schema: updateContentNodeSchema });

// DELETE /api/content/[id] — Delete content node (cascades)
export const DELETE = withApiHandler(async (ctx) => {
  const { params } = ctx;
  const id = params.id;
  const supabase = createServiceClient();
  const { contentNodeRepo } = getServices(supabase);

  await contentNodeRepo.delete(id);
  return new NextResponse(null, { status: 204 });
});
