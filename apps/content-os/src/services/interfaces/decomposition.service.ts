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
