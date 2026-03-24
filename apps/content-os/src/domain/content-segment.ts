import type { SegmentType } from './enums';

export interface ContentSegment {
  id: string;
  contentNodeId: string;
  segmentType: SegmentType;
  title: string | null;
  body: string;
  startMs: number | null;
  endMs: number | null;
  sortOrder: number;
  confidence: number | null;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSegmentParams {
  contentNodeId: string;
  segmentType: SegmentType;
  title?: string;
  body: string;
  startMs?: number;
  endMs?: number;
  sortOrder: number;
  confidence?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}
