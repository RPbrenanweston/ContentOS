// @crumb content-crud-api
// API | route-handler | data-persistence
// why: Handles creation and listing of content nodes; primary write/read endpoint for editorial content with validation and error handling
// in:[request-body-json, query-params] out:[json-response] err:[validation-error, db-error, auth-error]
// hazard: safeParse succeeds but doesn't guarantee schema match for complex nested types; downstream code may receive unexpected shapes
// hazard: No pagination cursor validation; client can request unbounded page counts, potentially causing slow queries
// hazard: No rate limiting on POST; attacker could spam content creation without throttling
// edge:../../infrastructure/supabase/client.ts -> USES
// edge:../../services/container.ts -> USES
// edge:../../lib/validation.ts -> USES
// edge:../../domain/content-node.ts -> RESPONSE-TYPE
// prompt: Add pagination bounds validation; add rate limiting middleware; validate schema completeness

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';
import { createContentNodeSchema, listContentNodesSchema } from '@/lib/validation';

// POST /api/content — Create a content node
export const POST = withApiHandler<z.infer<typeof createContentNodeSchema>>(async (ctx) => {
  const { userId, body } = ctx;

  const supabase = createServiceClient();
  const { contentNodeRepo } = getServices(supabase);

  const node = await contentNodeRepo.create({
    userId,
    title: body.title,
    contentType: body.contentType,
    bodyText: body.bodyText,
    bodyHtml: body.bodyHtml,
    tags: body.tags,
  });

  return NextResponse.json(node, { status: 201 });
}, { schema: createContentNodeSchema });

// GET /api/content — List content nodes
export const GET = withApiHandler(async (ctx) => {
  const { userId, request } = ctx;
  const queryParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = listContentNodesSchema.safeParse(queryParams);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Invalid query parameters' },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { contentNodeRepo } = getServices(supabase);

  const result = await contentNodeRepo.list({
    userId,
    status: parsed.data.status,
    type: parsed.data.type,
    page: parsed.data.page,
    limit: parsed.data.limit,
  });

  return NextResponse.json(result);
});
