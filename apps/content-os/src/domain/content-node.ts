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
