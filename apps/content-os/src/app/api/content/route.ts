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
