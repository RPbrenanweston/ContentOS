// @crumb asset-generation-api
// API | route-handler | ai-orchestration
// why: Generates AI-derived content variants (social posts, email, blog snippets) from source segments; orchestrates asset creation and persistence
// in:[request-body-json, segmentIds, platform, tone] out:[json-asset-response] err:[validation-error, no-segments-error, generation-error]
// hazard: userId extracted as TODO with hardcoded fallback UUID; production will fail when auth is implemented without updating this endpoint
// hazard: No timeout on assetGeneratorService.generate(); LLM calls could hang indefinitely, blocking request thread and consuming server resources
// hazard: segments filtering doesn't validate that filtered segments still match content type requirements; could generate asset from wrong content format
// hazard: No de-duplication check; identical asset requests could be generated multiple times concurrently, wasting API credits
// hazard: Error responses expose raw assetGeneratorService errors; may leak prompt text or API keys if logging includes full error objects
// edge:../../infrastructure/supabase/client.ts -> USES
// edge:../../services/container.ts -> USES
// edge:../../services/asset-generator.service.ts -> USES
// edge:../../domain/derived-asset.ts -> RESPONSE-TYPE
// prompt: Replace TODO userId with auth extraction; add generation timeout with fallback; validate segment content types; implement idempotency key for de-duplication; sanitize error responses

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';
import { createDerivedAssetSchema } from '@/lib/validation';

// POST /api/assets — Generate a derived asset via AI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createDerivedAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { segmentRepo, assetRepo, assetGeneratorService } = getServices(supabase);

    // Load source segments
    let segments;
    if (parsed.data.segmentIds?.length) {
      const allSegments = await segmentRepo.findByNodeId(parsed.data.contentNodeId);
      segments = allSegments.filter((s) => parsed.data.segmentIds!.includes(s.id));
    } else {
      segments = await segmentRepo.findByNodeId(parsed.data.contentNodeId);
    }

    if (segments.length === 0) {
      return NextResponse.json(
        { error: 'No segments found for this content node' },
        { status: 400 },
      );
    }

    // TODO: Extract userId from auth session
    const userId = body.userId ?? '00000000-0000-0000-0000-000000000000';

    // Generate the asset via AI
    const generated = await assetGeneratorService.generate({
      contentNodeId: parsed.data.contentNodeId,
      assetType: parsed.data.assetType,
      sourceSegments: segments,
      platform: parsed.data.platform,
      tone: parsed.data.tone,
      maxLength: parsed.data.maxLength,
      userId,
    });

    // Persist
    const asset = await assetRepo.create({
      contentNodeId: generated.contentNodeId,
      assetType: generated.assetType,
      title: generated.title ?? undefined,
      body: generated.body,
      platformHint: generated.platformHint ?? undefined,
      sourceSegmentIds: generated.sourceSegmentIds,
      generationPrompt: generated.generationPrompt ?? undefined,
      aiModel: generated.aiModel ?? undefined,
      metadata: generated.metadata,
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error('POST /api/assets error:', error);
    return NextResponse.json(
      { error: 'Failed to generate asset' },
      { status: 500 },
    );
  }
}

// GET /api/assets — List derived assets
export async function GET(request: NextRequest) {
  try {
    const nodeId = request.nextUrl.searchParams.get('nodeId');
    if (!nodeId) {
      return NextResponse.json(
        { error: 'nodeId query parameter required' },
        { status: 400 },
      );
    }

    const type = request.nextUrl.searchParams.get('type') as string | null;
    const status = request.nextUrl.searchParams.get('status') as string | null;

    const supabase = createServiceClient();
    const { assetRepo } = getServices(supabase);

    const assets = await assetRepo.findByNodeId(nodeId, {
      type: type as Parameters<typeof assetRepo.findByNodeId>[1] extends { type?: infer T } ? T : never,
      status: status as Parameters<typeof assetRepo.findByNodeId>[1] extends { status?: infer T } ? T : never,
    });

    return NextResponse.json({ assets, total: assets.length });
  } catch (error) {
    console.error('GET /api/assets error:', error);
    return NextResponse.json(
      { error: 'Failed to list assets' },
      { status: 500 },
    );
  }
}
