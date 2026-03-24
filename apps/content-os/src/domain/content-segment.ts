/**
 * @crumb
 * id: content-segment-entity
 * AREA: DAT
 * why: Define ContentSegment and creation contract—granular content divisions from transcript boundaries or manual decomposition
 * in: CreateSegmentParams {contentNodeId, segmentType, title?, body, startMs?, endMs?, sortOrder, confidence?, tags?}
 * out: ContentSegment {id, contentNodeId, segmentType, title?, body, startMs?, endMs?, sortOrder, confidence?, tags[], metadata, createdAt, updatedAt}
 * err: No errors typed—segmentType enum validation deferred to caller; timestamp boundary validation missing
 * hazard: startMs/endMs optional but no constraint prevents endMs < startMs—asset-generator will fail silently on invalid ranges
 * hazard: sortOrder integer allows duplicates or negative values—no uniqueness constraint breaks ordering invariants in asset generation
 * edge: CREATED_BY decomposition.service.ts (segments from transcript analysis or manual annotation)
 * edge: SERVES asset-generator.service.ts (sourceSegmentIds drive asset generation scope); media.service.ts (startMs/endMs define clip boundaries)
 * edge: READS enums.ts (SegmentType)
 * prompt: Test sortOrder handling with duplicates and negative numbers; verify startMs < endMs invariant across all segments; test confidence range [0,1] boundary behavior
 */

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
