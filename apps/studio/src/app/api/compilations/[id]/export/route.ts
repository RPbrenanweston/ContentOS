// @crumb compilation-export-to-content-os
// API | cross-app bridge | content-os ingestion
// why: Export a Studio compilation (with linked breadcrumbs/clips) into Content OS as a content_node + derived_assets—enables distribution workflow
// in:[POST compilationId] out:[{ contentNodeId, assetCount }] err:[NOT_FOUND, DB_ERROR, EXPORT_ERROR]
// hazard: Both apps share one Supabase instance—service role key bypasses RLS on content_nodes and derived_assets tables
// hazard: No idempotency guard—calling export twice creates duplicate content_nodes for same compilation
// edge:../../videos/[videoId]/compilations/[compilationId]/route.ts -> READS (compilation + breadcrumbs source data)
// edge:apps/content-os/src/domain/content-node.ts -> WRITES (creates content_node row)
// edge:apps/content-os/src/domain/derived-asset.ts -> WRITES (creates derived_asset rows per clip)
// prompt: Add idempotency via compilation_id in content_node metadata; validate compilation exists before export; consider transaction wrapping

import { NextResponse } from 'next/server';
import { createServerClient, MVP_USER_ID } from '@/lib/supabase/server';
import { withApiHandler } from '@/lib/api-handler';

export const POST = withApiHandler(async (ctx) => {
  const { id: compilationId } = ctx.params;
  const supabase = createServerClient();

  // 1. Load the compilation
  const { data: compilation, error: compError } = await supabase
    .from('studio_compilations')
    .select('*')
    .eq('id', compilationId)
    .single();

  if (compError || !compilation) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Compilation not found' } },
      { status: 404 },
    );
  }

  // 2. Load linked breadcrumbs (ordered)
  const { data: links } = await supabase
    .from('studio_compilation_breadcrumbs')
    .select('*, studio_breadcrumbs(*)')
    .eq('compilation_id', compilationId)
    .order('order_index', { ascending: true });

  const breadcrumbs = (links ?? [])
    .map((link: Record<string, unknown>) => link.studio_breadcrumbs as Record<string, unknown> | null)
    .filter(Boolean) as Array<Record<string, unknown>>;

  // 3. Load any outputs (rendered clips) associated with this compilation
  const { data: outputs } = await supabase
    .from('output_jobs')
    .select('*')
    .eq('compilation_id', compilationId)
    .eq('status', 'ready');

  // Also load clip outputs linked to individual breadcrumbs in this compilation
  const breadcrumbIds = breadcrumbs.map((bc) => bc.id as string);
  let clipOutputs: Array<Record<string, unknown>> = [];
  if (breadcrumbIds.length > 0) {
    const { data: bcOutputs } = await supabase
      .from('output_jobs')
      .select('*')
      .in('breadcrumb_id', breadcrumbIds)
      .eq('status', 'ready');
    clipOutputs = bcOutputs ?? [];
  }

  // 4. Create a content_node in Content OS tables
  // Determine source URL: use the compilation output URL if available, otherwise the video source
  const compilationOutput = (outputs ?? []).find(
    (o: Record<string, unknown>) => o.type === 'compilation',
  );
  const sourceUrl = (compilationOutput?.file_url as string | undefined) ?? null;

  // Compute total duration from breadcrumbs
  const totalDurationMs = breadcrumbs.reduce(
    (sum: number, bc) =>
      sum + (Number(bc.end_time_seconds) - Number(bc.start_time_seconds)) * 1000,
    0,
  );

  const { data: contentNode, error: nodeError } = await supabase
    .from('content_nodes')
    .insert({
      user_id: MVP_USER_ID,
      title: compilation.title,
      content_type: 'video' as const,
      status: 'draft' as const,
      source_url: sourceUrl,
      duration_ms: totalDurationMs > 0 ? totalDurationMs : null,
      body_text: compilation.description ?? null,
      tags: [],
      metadata: {
        studio_compilation_id: compilationId,
        studio_video_id: compilation.video_id,
        exported_at: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (nodeError || !contentNode) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'EXPORT_ERROR',
          message: `Failed to create content node: ${nodeError?.message ?? 'Unknown error'}`,
        },
      },
      { status: 500 },
    );
  }

  // 5. Create derived_assets for each clip output
  let assetCount = 0;
  const assetInserts = clipOutputs
    .filter((o) => o.file_url)
    .map((output) => ({
      content_node_id: contentNode.id,
      asset_type: 'clip' as const,
      status: 'draft' as const,
      title: `Clip from breadcrumb`,
      body: '',
      media_url: output.file_url as string,
      source_segment_ids: [],
      version: 1,
      metadata: {
        studio_output_id: output.id,
        studio_breadcrumb_id: output.breadcrumb_id,
      },
    }));

  if (assetInserts.length > 0) {
    const { data: assets, error: assetError } = await supabase
      .from('derived_assets')
      .insert(assetInserts)
      .select();

    if (assetError) {
      // Content node was created but assets failed—log but don't fail entirely
      console.error('Failed to create derived assets:', assetError.message);
    } else {
      assetCount = assets?.length ?? 0;
    }
  }

  return NextResponse.json(
    {
      data: {
        contentNodeId: contentNode.id,
        assetCount,
      },
    },
    { status: 201 },
  );
});
