// @crumb adapt-variants
// UI | generation-ui | multi-platform-adaptation
// why: Enables creators to generate and review platform-specific content variants from a single original piece; orchestrates generative pipeline with selective publishing
// in:[/api/content/{id}, /api/assets?nodeId={id}] out:[JSX-grid-ui] err:[fetch-failure, generation-timeout]
// hazard: No error state handling for failed variant generation; failed API calls silently log but don't update UI (user thinks generation is pending indefinitely)
// hazard: loadAssets and handleGenerate don't validate response schemas; malformed API responses could crash component
// hazard: selectedAssetId can become stale if asset is deleted externally; no sync mechanism to clear selection
// edge:../../components/assets/asset-card.tsx -> USES
// edge:../../components/assets/generate-panel.tsx -> USES
// edge:../../components/distribution/publish-panel.tsx -> USES
// edge:../page.tsx -> NAVIGATES-TO (back to editor)
// edge:/api/assets -> API-ENDPOINT
// prompt: Add error boundaries for generation/load failures; validate API response schemas; implement external asset deletion listener; add generation timeout fallback

'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { AssetCard } from '@/components/assets/asset-card';
import { GeneratePanel } from '@/components/assets/generate-panel';
import { PublishPanel } from '@/components/distribution/publish-panel';
import { PreviewPanel } from '@/components/preview';
import type { DerivedAsset, AssetType, Platform, ContentNode } from '@/domain';

/**
 * Adapt page — where the creator generates platform variants
 * from their original piece. Replaces "The Assembly Line" with
 * a calmer, creator-first approach.
 */
export default function AdaptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [node, setNode] = useState<ContentNode | null>(null);
  const [assets, setAssets] = useState<DerivedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const loadAssets = useCallback(async () => {
    try {
      const [nodeRes, assetsRes] = await Promise.all([
        fetch(`/api/content/${id}`),
        fetch(`/api/assets?nodeId=${id}`),
      ]);
      const nodeData = await nodeRes.json();
      const assetsData = await assetsRes.json();
      setNode(nodeData);
      setAssets(assetsData.assets ?? []);
    } catch (e) {
      console.error('Failed to load:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const handleGenerate = async (params: {
    assetType: AssetType;
    platform?: Platform;
  }) => {
    setGenerating(true);
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentNodeId: id,
          assetType: params.assetType,
          platform: params.platform,
        }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const asset = await res.json();
      setAssets((prev) => [asset, ...prev]);
    } catch (e) {
      console.error('Generation failed:', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdate = async (assetId: string, body: string) => {
    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setAssets((prev) => prev.map((a) => (a.id === assetId ? updated : a)));
    } catch (e) {
      console.error('Update failed:', e);
    }
  };

  const handleApprove = async (assetId: string) => {
    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (!res.ok) throw new Error('Approve failed');
      const updated = await res.json();
      setAssets((prev) => prev.map((a) => (a.id === assetId ? updated : a)));
    } catch (e) {
      console.error('Approve failed:', e);
    }
  };

  const handleDelete = async (assetId: string) => {
    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header — clean, informative */}
      <div className="h-14 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <a
            href={`/content/${id}`}
            className="text-muted hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </a>
          <div>
            <h1 className="text-[15px] font-semibold text-foreground">
              Adapt: {node?.title ?? ''}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-ui-sm">
            {assets.length} {assets.length === 1 ? 'variant' : 'variants'}
          </span>
          <button
            onClick={() => setShowPreview((v) => !v)}
            className={`text-[11px] font-medium border px-2 py-1 rounded transition-colors ${
              showPreview
                ? 'border-primary-accent text-primary-accent bg-primary-accent/5'
                : 'border-border text-muted hover:border-muted'
            }`}
          >
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
        </div>
      </div>

      {/* 3-column layout — softer styling */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Generate options */}
        <div className="w-[240px] border-r border-border overflow-y-auto bg-surface">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">Adapt for</span>
          </div>
          <GeneratePanel
            contentNodeId={id}
            onGenerate={handleGenerate}
            generating={generating}
          />
        </div>

        {/* Middle: Variant cards */}
        <div className="flex-1 overflow-y-auto p-6">
          {assets.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-sm">
                <p className="text-muted text-sm">
                  Choose a platform and format to create your first variant.
                  Each one will be adapted from your original piece.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              {generating && (
                <div className="flex items-center gap-3 p-4 bg-primary-accent/5 rounded-lg border border-primary-accent/20">
                  <div className="w-4 h-4 border-2 border-primary-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-primary-accent font-medium">
                    Adapting your piece...
                  </span>
                </div>
              )}
              {assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onUpdate={handleUpdate}
                  onApprove={handleApprove}
                  onDelete={handleDelete}
                  onPublish={(assetId) => setSelectedAssetId(assetId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Preview Panel — shown when preview toggled */}
        {showPreview && (
          <div className="w-[380px] border-l border-border flex flex-col">
            <div className="px-4 py-3 border-b border-border flex-shrink-0">
              <span className="text-sm font-medium text-foreground">Platform Preview</span>
            </div>
            <div className="flex-1 overflow-hidden p-3">
              <PreviewPanel
                text={
                  assets.length > 0
                    ? (assets[0].body ?? node?.bodyText ?? '')
                    : (node?.bodyText ?? '')
                }
                title={node?.title ?? undefined}
              />
            </div>
          </div>
        )}

        {/* Right: Share / Queue */}
        <div className="w-[260px] border-l border-border overflow-y-auto bg-surface">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">Share</span>
          </div>
          {selectedAssetId ? (
            <div className="p-4">
              <PublishPanel
                assetId={selectedAssetId}
                onPublished={() => setSelectedAssetId(null)}
              />
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {assets.filter((a) => a.status === 'approved').length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span>
                    {assets.filter((a) => a.status === 'approved').length} approved
                  </span>
                </div>
              )}
              {assets.filter((a) => a.status === 'draft').length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-muted" />
                  <span>
                    {assets.filter((a) => a.status === 'draft').length} awaiting review
                  </span>
                </div>
              )}
              {assets.length === 0 && (
                <p className="text-sm text-muted">
                  Select a variant to share it.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
