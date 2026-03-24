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
