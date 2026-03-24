// @crumb content-crud-api
// API | route-handler | data-persistence
// why: Handles creation and listing of content nodes; primary write/read endpoint for editorial content with validation and error handling
// in:[request-body-json, query-params] out:[json-response] err:[validation-error, db-error, auth-error]
// hazard: userId extracted as TODO with hardcoded fallback UUID; production will fail when auth is implemented without updating this endpoint
// hazard: No pagination cursor validation; client can request unbounded page counts, potentially causing slow queries
// hazard: safeParse succeeds but doesn't guarantee schema match for complex nested types; downstream code may receive unexpected shapes
// hazard: Error responses expose raw error objects to client; may leak internal system details
// hazard: No rate limiting on POST; attacker could spam content creation without throttling
// edge:../../infrastructure/supabase/client.ts -> USES
// edge:../../services/container.ts -> USES
// edge:../../lib/validation.ts -> USES
// edge:../../domain/content-node.ts -> RESPONSE-TYPE
// prompt: Replace TODO userId with proper auth extraction; add pagination bounds validation; refine error responses (never expose raw error); add rate limiting middleware; validate schema completeness

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';
import { createContentNodeSchema, listContentNodesSchema } from '@/lib/validation';

// POST /api/content — Create a content node
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createContentNodeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { contentNodeRepo } = getServices(supabase);

    // TODO: Extract userId from auth session
    const userId = body.userId ?? '00000000-0000-0000-0000-000000000000';

    const node = await contentNodeRepo.create({
      userId,
      title: parsed.data.title,
      contentType: parsed.data.contentType,
      bodyText: parsed.data.bodyText,
      bodyHtml: parsed.data.bodyHtml,
      tags: parsed.data.tags,
    });

    return NextResponse.json(node, { status: 201 });
  } catch (error) {
    console.error('POST /api/content error:', error);
    return NextResponse.json(
      { error: 'Failed to create content node' },
      { status: 500 },
    );
  }
}

// GET /api/content — List content nodes
export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = listContentNodesSchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { contentNodeRepo } = getServices(supabase);

    // TODO: Extract userId from auth session
    const userId = request.nextUrl.searchParams.get('userId') ?? '00000000-0000-0000-0000-000000000000';

    const result = await contentNodeRepo.list({
      userId,
      status: parsed.data.status,
      type: parsed.data.type,
      page: parsed.data.page,
      limit: parsed.data.limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/content error:', error);
    return NextResponse.json(
      { error: 'Failed to list content nodes' },
      { status: 500 },
    );
  }
}
