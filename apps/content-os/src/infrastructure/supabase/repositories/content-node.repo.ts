// @crumb content-node-repository
// DAT | CRUD | Serialization | Filtering
// why: Encapsulate content node database operations with typed row/entity mapping and multi-filter pagination
// in:[CreateContentNodeParams|UpdateContentNodeParams] out:[ContentNode entities with pagination] err:[DatabaseError|NotFoundError]
// hazard: Unfiltered user_id queries can expose other users' content if RLS fails
// hazard: Type casting without validation on toEntity could corrupt domain model
// edge:../client.ts -> READS
// edge:../../../domain -> READS
// edge:../../app/api/content/route.ts -> CALLS
// prompt: Always validate user_id matches auth context before list/delete; verify RLS policy active on table

import { type SupabaseClient } from '@supabase/supabase-js';
import type {
  ContentNode,
  ContentNodeStatus,
  ContentNodeType,
  CreateContentNodeParams,
  UpdateContentNodeParams,
} from '@/domain';
import { NotFoundError } from '@/lib/errors';

type ContentNodeRow = {
  id: string;
  user_id: string;
  title: string;
  content_type: string;
  status: string;
  body_text: string | null;
  body_html: string | null;
  source_url: string | null;
  source_mime_type: string | null;
  duration_ms: number | null;
  word_count: number | null;
  summary: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function toEntity(row: ContentNodeRow): ContentNode {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    contentType: row.content_type as ContentNodeType,
    status: row.status as ContentNodeStatus,
    bodyText: row.body_text,
    bodyHtml: row.body_html,
    sourceUrl: row.source_url,
    sourceMimeType: row.source_mime_type,
    durationMs: row.duration_ms,
    wordCount: row.word_count,
    summary: row.summary,
    tags: row.tags,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(params: CreateContentNodeParams | UpdateContentNodeParams): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ('userId' in params && params.userId !== undefined) row.user_id = params.userId;
  if ('title' in params && params.title !== undefined) row.title = params.title;
  if ('contentType' in params && params.contentType !== undefined) row.content_type = params.contentType;
  if ('status' in params && params.status !== undefined) row.status = params.status;
  if ('bodyText' in params && params.bodyText !== undefined) row.body_text = params.bodyText;
  if ('bodyHtml' in params && params.bodyHtml !== undefined) row.body_html = params.bodyHtml;
  if ('sourceUrl' in params && params.sourceUrl !== undefined) row.source_url = params.sourceUrl;
  if ('sourceMimeType' in params && params.sourceMimeType !== undefined) row.source_mime_type = params.sourceMimeType;
  if ('durationMs' in params && params.durationMs !== undefined) row.duration_ms = params.durationMs;
  if ('wordCount' in params && params.wordCount !== undefined) row.word_count = params.wordCount;
  if ('summary' in params && params.summary !== undefined) row.summary = params.summary;
  if ('tags' in params && params.tags !== undefined) row.tags = params.tags;
  if ('metadata' in params && params.metadata !== undefined) row.metadata = params.metadata;
  return row;
}

export class ContentNodeRepo {
  constructor(private readonly db: SupabaseClient) {}

  async create(params: CreateContentNodeParams): Promise<ContentNode> {
    const { data, error } = await this.db
      .from('content_nodes')
      .insert(toRow(params))
      .select()
      .single();

    if (error) throw error;
    return toEntity(data as ContentNodeRow);
  }

  async findById(id: string): Promise<ContentNode> {
    const { data, error } = await this.db
      .from('content_nodes')
      .select()
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundError('ContentNode', id);
    return toEntity(data as ContentNodeRow);
  }

  async list(filters: {
    userId: string;
    status?: ContentNodeStatus;
    type?: ContentNodeType;
    page?: number;
    limit?: number;
  }): Promise<{ nodes: ContentNode[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.db
      .from('content_nodes')
      .select('*', { count: 'exact' })
      .eq('user_id', filters.userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.type) query = query.eq('content_type', filters.type);

    const { data, error, count } = await query;

    if (error) throw error;
    return {
      nodes: (data as ContentNodeRow[]).map(toEntity),
      total: count ?? 0,
    };
  }

  async update(id: string, params: UpdateContentNodeParams): Promise<ContentNode> {
    const { data, error } = await this.db
      .from('content_nodes')
      .update(toRow(params))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundError('ContentNode', id);
    return toEntity(data as ContentNodeRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db
      .from('content_nodes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
