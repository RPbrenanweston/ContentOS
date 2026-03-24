import { type SupabaseClient } from '@supabase/supabase-js';
import type {
  ContentSegment,
  CreateSegmentParams,
  SegmentType,
} from '@/domain';

type ContentSegmentRow = {
  id: string;
  content_node_id: string;
  segment_type: string;
  title: string | null;
  body: string;
  start_ms: number | null;
  end_ms: number | null;
  sort_order: number;
  confidence: number | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function toEntity(row: ContentSegmentRow): ContentSegment {
  return {
    id: row.id,
    contentNodeId: row.content_node_id,
    segmentType: row.segment_type as SegmentType,
    title: row.title,
    body: row.body,
    startMs: row.start_ms,
    endMs: row.end_ms,
    sortOrder: row.sort_order,
    confidence: row.confidence,
    tags: row.tags,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(params: CreateSegmentParams): Record<string, unknown> {
  const row: Record<string, unknown> = {
    content_node_id: params.contentNodeId,
    segment_type: params.segmentType,
    body: params.body,
    sort_order: params.sortOrder,
  };
  if (params.title !== undefined) row.title = params.title;
  if (params.startMs !== undefined) row.start_ms = params.startMs;
  if (params.endMs !== undefined) row.end_ms = params.endMs;
  if (params.confidence !== undefined) row.confidence = params.confidence;
  if (params.tags !== undefined) row.tags = params.tags;
  if (params.metadata !== undefined) row.metadata = params.metadata;
  return row;
}

export class ContentSegmentRepo {
  constructor(private readonly db: SupabaseClient) {}

  async createMany(segments: CreateSegmentParams[]): Promise<ContentSegment[]> {
    const rows = segments.map(toRow);

    const { data, error } = await this.db
      .from('content_segments')
      .insert(rows)
      .select();

    if (error) throw error;
    return (data as ContentSegmentRow[]).map(toEntity);
  }

  async findByNodeId(nodeId: string, type?: SegmentType): Promise<ContentSegment[]> {
    let query = this.db
      .from('content_segments')
      .select()
      .eq('content_node_id', nodeId)
      .order('sort_order', { ascending: true });

    if (type) query = query.eq('segment_type', type);

    const { data, error } = await query;

    if (error) throw error;
    return (data as ContentSegmentRow[]).map(toEntity);
  }

  async deleteByNodeId(nodeId: string): Promise<void> {
    const { error } = await this.db
      .from('content_segments')
      .delete()
      .eq('content_node_id', nodeId);

    if (error) throw error;
  }
}
