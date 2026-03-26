'use client';

// @crumb instagram-preview
// UI | preview | instagram-mockup
// why: Render Instagram post preview with square image aspect ratio and 2200 char caption limit

import { PLATFORM_CONSTRAINTS, truncateAt } from './platform-constraints';
import { CharCount, CharBar } from './CharCount';

interface InstagramPreviewProps {
  text: string;
  imageUrl?: string | null;
  authorName?: string;
}

const LIMIT = PLATFORM_CONSTRAINTS.instagram.charLimit!;
const CAPTION_PREVIEW = 125; // chars shown before "more"

export function InstagramPreview({
  text,
  imageUrl,
  authorName = 'yourhandle',
}: InstagramPreviewProps) {
  const charCount = text.length;
  const isOver = charCount > LIMIT;
  const captionPreview = text.length > CAPTION_PREVIEW
    ? text.slice(0, CAPTION_PREVIEW) + '... more'
    : text;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden font-sans">
      {/* Instagram gradient bar */}
      <div
        className="h-1 w-full"
        style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
      />

      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex-shrink-0 p-0.5"
            style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366)' }}
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-gray-900">
              {authorName.charAt(0).toUpperCase()}
            </div>
          </div>
          <span className="text-[13px] font-semibold text-gray-900">{authorName}</span>
        </div>
        <span className="text-gray-500 text-lg">···</span>
      </div>

      {/* Image area — 1:1 */}
      <div
        className="w-full bg-gray-100 flex items-center justify-center"
        style={{ aspectRatio: PLATFORM_CONSTRAINTS.instagram.imageAspectRatio }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="text-gray-400 text-[11px]">1:1 image area</div>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 pt-2 flex items-center gap-4 text-xl">
        <span>🤍</span>
        <span>💬</span>
        <span>✈️</span>
        <span className="ml-auto">🔖</span>
      </div>

      {/* Caption */}
      <div className="px-3 pt-1 pb-2">
        <p className={`text-[12px] leading-snug ${isOver ? 'text-red-700' : 'text-gray-900'}`}>
          <span className="font-semibold">{authorName} </span>
          {captionPreview}
        </p>
      </div>

      {/* Char count */}
      <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between gap-2">
        <CharBar current={charCount} limit={LIMIT} />
        <CharCount current={charCount} limit={LIMIT} />
      </div>
    </div>
  );
}
