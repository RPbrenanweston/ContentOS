/**
 * @crumb
 * id: derived-asset-entity
 * AREA: DAT
 * why: Define DerivedAsset and creation/update contract—output of asset-generator service ready for distribution
 * in: CreateDerivedAssetParams {contentNodeId, assetType, title?, body, platformHint?, mediaUrl?, sourceSegmentIds?, generationPrompt?, aiModel?}; UpdateDerivedAssetParams {status?, title?, body?, mediaUrl?, metadata?}
 * out: DerivedAsset {id, contentNodeId, assetType, status, title?, body, platformHint?, mediaUrl?, sourceSegmentIds[], generationPrompt?, aiModel?, version, metadata, createdAt, updatedAt}
 * err: No errors typed—status enum validation deferred to caller; mediaUrl URL validation missing
 * hazard: version field not incremented on update—concurrent regenerations could overwrite without version conflict detection
 * hazard: sourceSegmentIds array unbounded—no maximum size, could cause storage bloat for assets spanning entire content nodes
 * edge: CREATED_BY asset-generator.service.ts (generate() method produces new assets; regenerate() updates with feedback)
 * edge: SERVES distribution.service.ts (assets ready for publishing); queue.service.ts (asset-to-slot mapping)
 * edge: READS enums.ts (AssetType, AssetStatus, Platform)
 * prompt: Test version increment logic on regenerate; verify sourceSegmentIds array size constraints; test status transitions (generating→draft→approved→published or failed)
 */

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
