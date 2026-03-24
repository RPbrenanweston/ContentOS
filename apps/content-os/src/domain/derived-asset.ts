import type { AssetType, AssetStatus, Platform } from './enums';

export interface DerivedAsset {
  id: string;
  contentNodeId: string;
  assetType: AssetType;
  status: AssetStatus;
  title: string | null;
  body: string;
  platformHint: Platform | null;
  mediaUrl: string | null;
  sourceSegmentIds: string[];
  generationPrompt: string | null;
  aiModel: string | null;
  version: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDerivedAssetParams {
  contentNodeId: string;
  assetType: AssetType;
  title?: string;
  body: string;
  platformHint?: Platform;
  mediaUrl?: string;
  sourceSegmentIds?: string[];
  generationPrompt?: string;
  aiModel?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateDerivedAssetParams {
  status?: AssetStatus;
  title?: string;
  body?: string;
  mediaUrl?: string;
  metadata?: Record<string, unknown>;
}
