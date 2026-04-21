/**
 * @crumb
 * id: inspiration-entity
 * AREA: DAT
 * why: Define InspirationItem, InspirationHighlight and ContentInspirationRef—capture/source layer that feeds content ideation and references downstream ContentNodes
 * in: CreateInspirationItemParams {userId, sourceUrl?, sourceType, capturedVia?, title?, bodyMarkdown?, ...}; UpdateInspirationItemParams {userRating?, tags?, archivedAt?, title?}; CreateInspirationHighlightParams {inspirationItemId, userId, highlightType, content, rationale?, sourceOffset?, position?, userCreated?}
 * out: InspirationItem, InspirationHighlight, ContentInspirationRef interfaces plus union types for source/status/captured-via/highlight type
 * err: No errors typed—callers must validate enum unions and URL normalization invariants (lowercase host, strip trailing slash, drop utm_*)
 * hazard: sourceUrlNormalized is client-computed; divergent normalization between capture paths will silently defeat dedup index (user_id, source_url_normalized)
 * hazard: userRating is constrained smallint (-1..2) but no default—nullable rating means "unrated" collides with explicit -1 ("disliked") at consumer layer
 * edge: FEEDS content-node.ts (ContentInspirationRef references content_nodes on the way out)
 * edge: READS enums via local unions (not shared enums.ts—inspiration unions kept local to this file to avoid coupling capture layer to content enums)
 * edge: ENFORCED_BY validation.ts (captureInspirationSchema, updateInspirationSchema, createHighlightSchema, updateHighlightSchema)
 * prompt: Test URL normalization parity across share_sheet, extension, manual, email paths; verify userRating null vs -1 semantics; test highlight position collisions within the same inspiration_item_id; validate tags array default empty not null
 */

export type InspirationSourceType =
  | 'article'
  | 'tweet'
  | 'youtube'
  | 'substack'
  | 'linkedin'
  | 'pdf'
  | 'image'
  | 'manual';

export type InspirationStatus =
  | 'pending'
  | 'fetching'
  | 'processing'
  | 'ready'
  | 'error';

export type InspirationCapturedVia =
  | 'share_sheet'
  | 'extension'
  | 'manual'
  | 'email';

export type InspirationHighlightType =
  | 'key_idea'
  | 'hook'
  | 'quote'
  | 'structure_note'
  | 'tonal_marker'
  | 'vocabulary_note'
  | 'user_highlight';

export interface InspirationItem {
  id: string;
  userId: string;
  sourceUrl: string | null;
  sourceUrlNormalized: string | null;
  sourceType: InspirationSourceType;
  title: string | null;
  author: string | null;
  authorHandle: string | null;
  publishedAt: string | null;
  capturedAt: string;
  capturedVia: InspirationCapturedVia | null;
  bodyMarkdown: string | null;
  bodyHtml: string | null;
  mediaUrl: string | null;
  raw: Record<string, unknown> | null;
  status: InspirationStatus;
  error: string | null;
  userRating: number | null;
  tags: string[];
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InspirationHighlight {
  id: string;
  inspirationItemId: string;
  userId: string;
  highlightType: InspirationHighlightType;
  content: string;
  rationale: string | null;
  sourceOffset: number | null;
  position: number;
  userCreated: boolean;
  createdAt: string;
}

export interface ContentInspirationRef {
  contentNodeId: string;
  inspirationItemId: string;
  highlightId: string | null;
  userId: string;
  insertedAt: string;
}

export interface CreateInspirationItemParams {
  userId: string;
  sourceUrl?: string;
  sourceUrlNormalized?: string;
  sourceType: InspirationSourceType;
  title?: string;
  author?: string;
  authorHandle?: string;
  publishedAt?: string;
  capturedVia?: InspirationCapturedVia;
  bodyMarkdown?: string;
  bodyHtml?: string;
  mediaUrl?: string;
  raw?: Record<string, unknown>;
  status?: InspirationStatus;
  tags?: string[];
}

export interface UpdateInspirationItemParams {
  title?: string;
  userRating?: number | null;
  tags?: string[];
  archivedAt?: string | null;
  status?: InspirationStatus;
  error?: string | null;
}

export interface CreateInspirationHighlightParams {
  inspirationItemId: string;
  userId: string;
  highlightType: InspirationHighlightType;
  content: string;
  rationale?: string;
  sourceOffset?: number;
  position?: number;
  userCreated?: boolean;
}
