'use client';

// @crumb preview-panel
// UI | preview | multi-platform-preview-panel
// why: Tabbed panel showing how content will render on each target platform with live updates as text changes
// in:[text, title?, imageUrl?] out:[JSX tabbed preview UI] err:[none]
// hazard: imageUrl is unvalidated—passing a non-image URL will render a broken img tag silently
// edge:./LinkedInPreview.tsx -> USES
// edge:./TwitterPreview.tsx -> USES
// edge:./InstagramPreview.tsx -> USES
// edge:./ThreadsPreview.tsx -> USES
// edge:./RedditPreview.tsx -> USES
// edge:./NewsletterPreview.tsx -> USES
// edge:./platform-constraints.ts -> READS
// edge:../../app/content/[id]/assets/page.tsx -> POTENTIAL-INTEGRATION
// prompt: Wire into assets page as optional side panel; add scroll preservation between tab changes; consider lazy rendering off-screen previews

import { useState } from 'react';
import { LinkedInPreview } from './LinkedInPreview';
import { TwitterPreview } from './TwitterPreview';
import { InstagramPreview } from './InstagramPreview';
import { ThreadsPreview } from './ThreadsPreview';
import { RedditPreview } from './RedditPreview';
import { NewsletterPreview } from './NewsletterPreview';
import { PREVIEW_PLATFORMS, PLATFORM_CONSTRAINTS } from './platform-constraints';
import type { Platform } from '@/domain';

export interface PreviewPanelProps {
  text: string;
  title?: string;
  imageUrl?: string | null;
  authorName?: string;
  /** Optionally restrict which platforms are shown */
  platforms?: Platform[];
}

type SupportedPreviewPlatform =
  | 'linkedin'
  | 'x'
  | 'instagram'
  | 'threads'
  | 'reddit'
  | 'substack'
  | 'medium'
  | 'ghost'
  | 'beehiiv';

const NEWSLETTER_PLATFORMS = new Set(['substack', 'medium', 'ghost', 'beehiiv']);

function PlatformTab({
  platform,
  active,
  onClick,
}: {
  platform: string;
  active: boolean;
  onClick: () => void;
}) {
  const meta = PLATFORM_CONSTRAINTS[platform];
  if (!meta) return null;

  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-2 text-[11px] font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? 'border-current text-gray-900'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
      style={active ? { borderColor: meta.color, color: meta.color } : undefined}
    >
      {meta.label}
    </button>
  );
}

function renderPreview(
  platform: SupportedPreviewPlatform,
  props: PreviewPanelProps,
) {
  const { text, title, imageUrl, authorName } = props;

  switch (platform) {
    case 'linkedin':
      return (
        <LinkedInPreview
          text={text}
          imageUrl={imageUrl}
          authorName={authorName}
        />
      );
    case 'x':
      return (
        <TwitterPreview
          text={text}
          imageUrl={imageUrl}
          authorName={authorName}
        />
      );
    case 'instagram':
      return (
        <InstagramPreview
          text={text}
          imageUrl={imageUrl}
          authorName={authorName}
        />
      );
    case 'threads':
      return (
        <ThreadsPreview
          text={text}
          imageUrl={imageUrl}
          authorName={authorName}
        />
      );
    case 'reddit':
      return (
        <RedditPreview
          text={text}
          title={title}
          imageUrl={imageUrl}
          authorName={authorName ? `u/${authorName}` : undefined}
        />
      );
    case 'substack':
    case 'medium':
    case 'ghost':
    case 'beehiiv':
      return (
        <NewsletterPreview
          text={text}
          title={title}
          imageUrl={imageUrl}
          authorName={authorName}
          platform={platform}
        />
      );
    default:
      return null;
  }
}

export function PreviewPanel(props: PreviewPanelProps) {
  const visiblePlatforms = (
    props.platforms ?? PREVIEW_PLATFORMS
  ).filter((p): p is SupportedPreviewPlatform =>
    p in PLATFORM_CONSTRAINTS,
  ) as SupportedPreviewPlatform[];

  const [activePlatform, setActivePlatform] = useState<SupportedPreviewPlatform>(
    visiblePlatforms[0] ?? 'linkedin',
  );

  if (visiblePlatforms.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted">
        No platforms configured for preview.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 border border-border rounded-lg overflow-hidden">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-border bg-white">
        {visiblePlatforms.map((platform) => (
          <PlatformTab
            key={platform}
            platform={platform}
            active={activePlatform === platform}
            onClick={() => setActivePlatform(platform)}
          />
        ))}
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[420px] mx-auto">
          {renderPreview(activePlatform, props)}
        </div>
      </div>

      {/* Platform context footer */}
      <div className="px-4 py-2 border-t border-border bg-white flex items-center justify-between text-[10px] text-muted">
        <span>{PLATFORM_CONSTRAINTS[activePlatform]?.label ?? activePlatform}</span>
        {PLATFORM_CONSTRAINTS[activePlatform]?.charLimit ? (
          <span>{PLATFORM_CONSTRAINTS[activePlatform]!.charLimit!.toLocaleString()} char limit</span>
        ) : (
          <span>No character limit</span>
        )}
      </div>
    </div>
  );
}
