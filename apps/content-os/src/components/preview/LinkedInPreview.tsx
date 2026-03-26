'use client';

// @crumb linkedin-preview
// UI | preview | linkedin-mockup
// why: Render a LinkedIn-accurate post preview with professional card layout and 3000 char limit indicator

import { PLATFORM_CONSTRAINTS } from './platform-constraints';
import { CharCount, CharBar } from './CharCount';

interface LinkedInPreviewProps {
  text: string;
  imageUrl?: string | null;
  authorName?: string;
}

const LIMIT = PLATFORM_CONSTRAINTS.linkedin.charLimit!;

export function LinkedInPreview({
  text,
  imageUrl,
  authorName = 'Your Name',
}: LinkedInPreviewProps) {
  const charCount = text.length;
  const displayText = text.slice(0, LIMIT);
  const isOver = charCount > LIMIT;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden font-sans">
      {/* LinkedIn chrome */}
      <div className="bg-[#0A66C2] h-1 w-full" />

      {/* Post header */}
      <div className="p-3 flex items-start gap-2">
        <div className="w-10 h-10 rounded-full bg-[#0A66C2] flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold">
          {authorName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-gray-900 leading-tight">{authorName}</div>
          <div className="text-[11px] text-gray-500 leading-tight">Your headline here</div>
          <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
            <span>Just now</span>
            <span>·</span>
            <span>🌐</span>
          </div>
        </div>
      </div>

      {/* Post body */}
      <div className="px-3 pb-2">
        <p
          className={`text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
            isOver ? 'text-red-700' : 'text-gray-900'
          }`}
        >
          {displayText}
          {isOver && (
            <span className="text-red-500 font-medium">
              {text.slice(LIMIT)}
            </span>
          )}
        </p>
      </div>

      {/* Link preview card or image */}
      {imageUrl && (
        <div
          className="mx-3 mb-2 border border-gray-200 rounded overflow-hidden"
          style={{ aspectRatio: PLATFORM_CONSTRAINTS.linkedin.imageAspectRatio }}
        >
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Engagement bar */}
      <div className="px-3 pb-2 border-t border-gray-100 pt-2 flex items-center gap-4 text-[11px] text-gray-500">
        <span>👍 Like</span>
        <span>💬 Comment</span>
        <span>↗️ Share</span>
      </div>

      {/* Char count */}
      <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between gap-2">
        <CharBar current={charCount} limit={LIMIT} />
        <CharCount current={charCount} limit={LIMIT} />
      </div>
    </div>
  );
}
