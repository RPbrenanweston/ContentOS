/**
 * @crumb
 * id: content-node-entity
 * AREA: DAT
 * why: Define ContentNode and creation/update contract—root entity for all content decomposition and asset generation
 * in: CreateContentNodeParams {title, contentType, bodyText?, sourceUrl?, tags?}; UpdateContentNodeParams {title?, status?, bodyText?, summary?, tags?}
 * out: ContentNode {id, userId, title, contentType, status, bodyText?, bodyHtml?, sourceUrl?, durationMs?, wordCount?, summary?, tags[], metadata, createdAt, updatedAt}
 * err: No errors typed—callers must handle validation of contentType enum and null safety for optional fields
 * hazard: metadata field accepts Record<string, unknown> without validation—malformed JSON or circular references could break serialization
 * hazard: bodyText and bodyHtml both optional but no constraint prevents both being null, creating zombie nodes
 * edge: SERVES decomposition.service.ts (input for content segmentation); distribution.service.ts (asset generation scope); media.service.ts (durationMs drives clip extraction)
 * edge: READS enums.ts (ContentNodeType, ContentNodeStatus)
 * edge: WRITES database via repository pattern (not shown in interface)
 * prompt: Test null/undefined handling on bodyText and bodyHtml; validate metadata serialization with edge cases; test status enum transitions from draft→processing→ready→published
 */

import type { ContentNodeType, ContentNodeStatus } from './enums';

export interface ContentNode {
  id: string;
  userId: string;
  title: string;
  contentType: ContentNodeType;
  status: ContentNodeStatus;
  bodyText: string | null;
  bodyHtml: string | null;
  sourceUrl: string | null;
  sourceMimeType: string | null;
  durationMs: number | null;
  wordCount: number | null;
  summary: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContentNodeParams {
  userId: string;
  title: string;
  contentType: ContentNodeType;
  status?: ContentNodeStatus;
  bodyText?: string;
  bodyHtml?: string;
  sourceUrl?: string;
  sourceMimeType?: string;
  durationMs?: number;
  tags?: string[];
}

export interface UpdateContentNodeParams {
  title?: string;
  status?: ContentNodeStatus;
  bodyText?: string;
  bodyHtml?: string;
  sourceUrl?: string;
  wordCount?: number;
  summary?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}
