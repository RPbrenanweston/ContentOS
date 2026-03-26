// @crumb asset-generation-api
// API | route-handler | ai-orchestration
// why: Generates AI-derived content variants (social posts, email, blog snippets) from source segments; orchestrates asset creation and persistence
// in:[request-body-json, segmentIds, platform, tone] out:[json-asset-response] err:[validation-error, no-segments-error, generation-error]
// hazard: No timeout on assetGeneratorService.generate(); LLM calls could hang indefinitely, blocking request thread and consuming server resources
// hazard: segments filtering doesn't validate that filtered segments still match content type requirements; could generate asset from wrong content format
// hazard: No de-duplication check; identical asset requests could be generated multiple times concurrently, wasting API credits
// edge:../../infrastructure/supabase/client.ts -> USES
// edge:../../services/container.ts -> USES
// edge:../../services/asset-generator.service.ts -> USES
// edge:../../domain/derived-asset.ts -> RESPONSE-TYPE
// prompt: Add generation timeout with fallback; validate segment content types; implement idempotency key for de-duplication; sanitize error responses

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';
import { createDerivedAssetSchema } from '@/lib/validation';

// POST /api/assets — Generate a derived asset via AI
export const POST = withApiHandler<z.infer<typeof createDerivedAssetSchema>>(async (ctx) => {
  const { userId, body } = ctx;

  const supabase = createServiceClient();
  const { segmentRepo, assetRepo, assetGeneratorService } = getServices(supabase);

  // Load source segments
  let segments;
  if (body.segmentIds?.length) {
    const allSegments = await segmentRepo.findByNodeId(body.contentNodeId);
    segments = allSegments.filter((s) => body.segmentIds!.includes(s.id));
  } else {
    segments = await segmentRepo.findByNodeId(body.contentNodeId);
  }

  if (segments.length === 0) {
    return NextResponse.json(
      { error: 'No segments found for this content node' },
      { status: 400 },
    );
  }

  // Generate the asset via AI
  const generated = await assetGeneratorService.generate({
    contentNodeId: body.contentNodeId,
    assetType: body.assetType,
    sourceSegments: segments,
    platform: body.platform,
    tone: body.tone,
    maxLength: body.maxLength,
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
}, { schema: createDerivedAssetSchema });

// GET /api/assets — List derived assets
export const GET = withApiHandler(async (ctx) => {
  const { request } = ctx;
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
});
