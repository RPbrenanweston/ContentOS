'use client';

import Link from 'next/link';
import type { InspirationItem, InspirationHighlight } from '@/domain';

interface InspirationCardProps {
  item: InspirationItem;
  previewHighlights?: InspirationHighlight[];
  onRate?: (rating: number) => void;
  onArchive?: () => void;
}

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const sourceIcon: Record<string, string> = {
  article: '📄',
  tweet: '🐦',
  youtube: '▶',
  substack: '✉',
  linkedin: '🔗',
  pdf: '📕',
  image: '🖼',
  manual: '✎',
};

export function InspirationCard({
  item,
  previewHighlights,
  onRate,
  onArchive,
}: InspirationCardProps) {
  const preview =
    previewHighlights && previewHighlights.length > 0
      ? previewHighlights
          .filter((h) => h.highlightType === 'key_idea')
          .slice(0, 2)
          .map((h) => h.content)
          .join(' · ')
      : item.bodyMarkdown?.slice(0, 200) ?? '';

  const isReady = item.status === 'ready';

  return (
    <Link
      href={`/inspiration/${item.id}`}
      className="block border border-border hover:bg-surface transition-colors p-4 h-full"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{sourceIcon[item.sourceType] ?? '?'}</span>
          <span className="font-button text-[10px] text-muted uppercase">
            {item.sourceType}
          </span>
        </div>
        <span className="font-small text-muted text-[11px]">
          {relativeTime(item.capturedAt)}
        </span>
      </div>

      <h3
        className="text-foreground font-medium leading-snug mb-1"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {item.title ?? item.sourceUrl ?? 'Untitled'}
      </h3>

      {(item.author || item.publishedAt) && (
        <div className="font-small text-muted text-[11px] mb-2">
          {item.author ?? ''}
          {item.author && item.publishedAt ? ' · ' : ''}
          {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : ''}
        </div>
      )}

      {preview && (
        <p
          className="text-muted text-[13px] leading-relaxed mb-3"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {preview}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isReady && (
            <span className="inline-block px-2 py-0.5 border font-button text-[10px] text-muted border-muted">
              {item.status.toUpperCase()}
            </span>
          )}
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-block px-2 py-0.5 border border-border font-small text-[10px] text-muted"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
          {onRate && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onRate(item.userRating === 1 ? 0 : 1);
                }}
                className={`font-button text-xs px-1 ${
                  item.userRating === 1 ? 'text-primary' : 'text-muted'
                }`}
                aria-label="Like"
              >
                ★
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onRate(item.userRating === 2 ? 0 : 2);
                }}
                className={`font-button text-xs px-1 ${
                  item.userRating === 2 ? 'text-primary' : 'text-muted'
                }`}
                aria-label="Love"
              >
                ★★
              </button>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
