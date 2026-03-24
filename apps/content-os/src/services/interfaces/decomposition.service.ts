/**
 * @crumb
 * id: content-segment-interface
 * AREA: DAT
 * why: Define contract for content decomposition—segment extraction and analysis results
 * in: ContentNode {id, body, language}, transcript (optional)
 * out: DecompositionResult {segments[], summary, suggestedAssetTypes[]}
 * err: No errors typed—implementation must handle invalid nodes
 * hazard: Interface lacks validation—implementations may accept null/undefined values causing downstream failures
 * hazard: DecompositionResult does not specify segment boundary validation—implementations could return overlapping or unordered segments
 * edge: IMPLEMENTED_BY decomposition.service.ts (concrete implementation)
 * edge: READS ContentNode domain type; CreateSegmentParams domain type
 * edge: CALLED_BY decomposition.service.ts (interface consumer)
 * edge: SERVES asset-generator.service.ts (receives segment data for asset generation)
 * prompt: Verify segment ordering invariants (startMs < endMs, non-overlapping); validate summary character limits; test empty segment arrays
 */

import type { ContentNode, CreateSegmentParams } from '@/domain';

export interface DecompositionResult {
  segments: Omit<CreateSegmentParams, 'contentNodeId'>[];
  summary: string;
  suggestedAssetTypes: string[];
}

export interface IDecompositionService {
  decompose(
    node: ContentNode,
    transcript?: string,
  ): Promise<DecompositionResult>;
}
