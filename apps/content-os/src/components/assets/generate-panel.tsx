// @crumb generate-panel
// UI | Generation request | Form control | Asset type selection
// why: User interface for requesting AI generation of derived assets with type and optional platform targeting
// in:[onGenerate callback, generating bool] out:[calls onGenerate with {assetType, platform}] err:[invalid selection, callback failure]
// hazard: Platform selection uses toggle but field is optional—inconsistent state if user expects platform to filter asset types
// hazard: Generating state disables button but doesn't show progress—user can't tell if generation is stuck or pending
// edge:./asset-card.tsx -> CALLS [GENERATE button routes to this panel in asset context]
// edge:../../domain/derived-asset.ts -> READS [AssetType, Platform enums]
// edge:../../services/asset-generator.service.ts -> CALLS [onGenerate triggers generation service]
// prompt: Clarify platform field optionality in UI. Show generation progress with spinner. Validate generation duration timeout.

'use client';

import { useState } from 'react';
import type { AssetType, Platform } from '@/domain';

interface GeneratePanelProps {
  contentNodeId: string;
  onGenerate: (params: {
    assetType: AssetType;
    platform?: Platform;
    segmentIds?: string[];
  }) => void;
  generating: boolean;
}

const assetTypes: { value: AssetType; label: string }[] = [
  { value: 'social_post', label: 'SOCIAL POST' },
  { value: 'thread', label: 'THREAD' },
  { value: 'blog_summary', label: 'SUMMARY' },
  { value: 'email_draft', label: 'EMAIL' },
  { value: 'carousel', label: 'CAROUSEL' },
  { value: 'clip', label: 'CLIP' },
];

const platforms: { value: Platform; label: string }[] = [
  { value: 'linkedin', label: 'LINKEDIN' },
  { value: 'x', label: 'X' },
  { value: 'youtube', label: 'YOUTUBE' },
  { value: 'tiktok', label: 'TIKTOK' },
  { value: 'instagram', label: 'INSTAGRAM' },
  { value: 'newsletter', label: 'EMAIL' },
];

export function GeneratePanel({ onGenerate, generating }: GeneratePanelProps) {
  const [selectedType, setSelectedType] = useState<AssetType>('social_post');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | ''>('');

  return (
    <div className="p-3 space-y-3">
      <div className="font-button text-xs text-muted">ASSET TYPE</div>
      <div className="grid grid-cols-2 gap-1">
        {assetTypes.map((t) => (
          <button
            key={t.value}
            onClick={() => setSelectedType(t.value)}
            className={`px-2 py-1 border font-button text-[10px] transition-colors ${
              selectedType === t.value
                ? 'border-primary text-primary'
                : 'border-border text-muted hover:border-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="font-button text-xs text-muted">PLATFORM</div>
      <div className="grid grid-cols-2 gap-1">
        {platforms.map((p) => (
          <button
            key={p.value}
            onClick={() => setSelectedPlatform(selectedPlatform === p.value ? '' : p.value)}
            className={`px-2 py-1 border font-button text-[10px] transition-colors ${
              selectedPlatform === p.value
                ? 'border-primary text-primary'
                : 'border-border text-muted hover:border-muted'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <button
        onClick={() =>
          onGenerate({
            assetType: selectedType,
            platform: selectedPlatform || undefined,
          })
        }
        disabled={generating}
        className="w-full py-2 bg-primary text-background font-button text-xs hover:bg-transparent hover:text-primary border border-primary transition-colors disabled:opacity-50"
      >
        {generating ? 'GENERATING...' : 'GENERATE ASSET'}
      </button>
    </div>
  );
}
