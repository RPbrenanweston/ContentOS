/**
 * @crumb
 * id: asset-generation-interface
 * AREA: DAT
 * why: Define contract for platform-aware asset generation from content segments—support multiple formats and regeneration workflows
 * in: GenerateAssetParams {contentNodeId, assetType, sourceSegments[], platform, tone, maxLength, userId}
 * out: DerivedAsset (without id/timestamps) {body, title, assetType, platformHint, status}
 * err: No errors typed—implementation must catch AI client and validation errors
 * hazard: regenerate() lacks approval gate—implementations could accept contradictory feedback overwriting valid asset content
 * hazard: No lineage tracking between original and regenerated—cannot rollback to previous version if new version is rejected
 * edge: IMPLEMENTED_BY asset-generator.service.ts (concrete implementation)
 * edge: READS ContentSegment domain type; AssetType, Platform enums
 * edge: CALLED_BY decomposition.service.ts (receives suggested asset types)
 * edge: SERVES distribution.service.ts (provides assets for publishing)
 * prompt: Test tone parameter variations; verify maxLength enforcement across platforms; validate regeneration preserves assetType
 */

import type {
  AssetType,
  Platform,
  ContentSegment,
  DerivedAsset,
} from '@/domain';

export interface GenerateAssetParams {
  contentNodeId: string;
  assetType: AssetType;
  sourceSegments: ContentSegment[];
  platform?: Platform;
  tone?: string;
  maxLength?: number;
  userId: string;
}

export interface IAssetGeneratorService {
  generate(
    params: GenerateAssetParams,
  ): Promise<Omit<DerivedAsset, 'id' | 'createdAt' | 'updatedAt'>>;

  regenerate(
    assetId: string,
    feedback: string,
    userId: string,
  ): Promise<Omit<DerivedAsset, 'id' | 'createdAt' | 'updatedAt'>>;
}
