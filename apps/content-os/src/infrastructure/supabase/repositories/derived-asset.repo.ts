// @crumb derived-asset-repository
// DAT | Versioning | Media tracking
// why: Persist generated assets (cropped videos, rewritten posts) with media URLs and AI generation metadata
// in:[CreateDerivedAssetParams|UpdateDerivedAssetParams] out:[DerivedAsset with version tracking] err:[DatabaseError|NotFoundError]
// hazard: Media URLs pointing to external CDN could become stale or revoked without cleanup
// hazard: Version field not auto-incremented on update can create drift if manual increment fails
// edge:../client.ts -> READS
// edge:../../../domain -> READS
// edge:../../app/api/assets/route.ts -> CALLS
// prompt: Implement media URL expiration check on findByNodeId; ensure version auto-increments via trigger

import { type SupabaseClient } from '@supabase/supabase-js';
import type {
  AssetStatus,
  AssetType,
  CreateDerivedAssetParams,
  DerivedAsset,
  Platform,
  UpdateDerivedAssetParams,
} from '@/domain';
import { NotFoundError } from '@/lib/errors';

type DerivedAssetRow = {
  id: string;
  content_node_id: string;
  asset_type: string;
  status: string;
  title: string | null;
  body: string;
  platform_hint: string | null;
  media_url: string | null;
  source_segment_ids: string[];
  generation_prompt: string | null;
  ai_model: string | null;
  version: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function toEntity(row: DerivedAssetRow): DerivedAsset {
  return {
    id: row.id,
    contentNodeId: row.content_node_id,
    assetType: row.asset_type as AssetType,
    status: row.status as AssetStatus,
    title: row.title,
    body: row.body,
    platformHint: row.platform_hint as Platform | null,
    mediaUrl: row.media_url,
    sourceSegmentIds: row.source_segment_ids,
    generationPrompt: row.generation_prompt,
    aiModel: row.ai_model,
    version: row.version,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(params: CreateDerivedAssetParams | UpdateDerivedAssetParams): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ('contentNodeId' in params && params.contentNodeId !== undefined) row.content_node_id = params.contentNodeId;
  if ('assetType' in params && params.assetType !== undefined) row.asset_type = params.assetType;
  if ('status' in params && params.status !== undefined) row.status = params.status;
  if ('title' in params && params.title !== undefined) row.title = params.title;
  if ('body' in params && params.body !== undefined) row.body = params.body;
  if ('platformHint' in params && params.platformHint !== undefined) row.platform_hint = params.platformHint;
  if ('mediaUrl' in params && params.mediaUrl !== undefined) row.media_url = params.mediaUrl;
  if ('sourceSegmentIds' in params && params.sourceSegmentIds !== undefined) row.source_segment_ids = params.sourceSegmentIds;
  if ('generationPrompt' in params && params.generationPrompt !== undefined) row.generation_prompt = params.generationPrompt;
  if ('aiModel' in params && params.aiModel !== undefined) row.ai_model = params.aiModel;
  if ('metadata' in params && params.metadata !== undefined) row.metadata = params.metadata;
  return row;
}

export class DerivedAssetRepo {
  constructor(private readonly db: SupabaseClient) {}

  async create(params: CreateDerivedAssetParams): Promise<DerivedAsset> {
    const { data, error } = await this.db
      .from('derived_assets')
      .insert(toRow(params))
      .select()
      .single();

    if (error) throw error;
    return toEntity(data as DerivedAssetRow);
  }

  async findById(id: string): Promise<DerivedAsset> {
    const { data, error } = await this.db
      .from('derived_assets')
      .select()
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundError('DerivedAsset', id);
    return toEntity(data as DerivedAssetRow);
  }

  async findByNodeId(
    nodeId: string,
    filters?: { type?: AssetType; status?: AssetStatus },
  ): Promise<DerivedAsset[]> {
    let query = this.db
      .from('derived_assets')
      .select()
      .eq('content_node_id', nodeId)
      .order('created_at', { ascending: false });

    if (filters?.type) query = query.eq('asset_type', filters.type);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;

    if (error) throw error;
    return (data as DerivedAssetRow[]).map(toEntity);
  }

  async update(id: string, params: UpdateDerivedAssetParams): Promise<DerivedAsset> {
    const { data, error } = await this.db
      .from('derived_assets')
      .update(toRow(params))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundError('DerivedAsset', id);
    return toEntity(data as DerivedAssetRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db
      .from('derived_assets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
