'use client';

// @crumb twitter-preview
// UI | preview | x-twitter-mockup
// why: Render X/Twitter post preview with 280 char limit, thread indicator for overflow content

import { PLATFORM_CONSTRAINTS, splitIntoThreadParts } from './platform-constraints';
import { CharCount, CharBar } from './CharCount';

interface TwitterPreviewProps {
  text: string;
  imageUrl?: string | null;
  authorName?: string;
  handle?: string;
}

const LIMIT = PLATFORM_CONSTRAINTS.x.charLimit!;

export function TwitterPreview({
  text,
  imageUrl,
  authorName = 'Your Name',
  handle = 'yourhandle',
}: TwitterPreviewProps) {
  const isThread = text.length > LIMIT;
  const parts = isThread ? splitIntoThreadParts(text, LIMIT) : [text];
  const firstPart = parts[0];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden font-sans">
      {/* Header bar */}
      <div className="bg-black h-1 w-full" />

      {/* Main tweet */}
      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="w-9 h-9 rounded-full bg-gray-900 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
            {authorName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[13px] font-bold text-gray-900">{authorName}</span>
              <span className="text-[12px] text-gray-500">@{handle}</span>
              <span className="text-[12px] text-gray-400">· now</span>
            </div>
            <p className="text-[13px] text-gray-900 leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
              {firstPart}
            </p>

            {imageUrl && !isThread && (
              <div
                className="mt-2 rounded-2xl overflow-hidden border border-gray-200"
                style={{ aspectRatio: PLATFORM_CONSTRAINTS.x.imageAspectRatio }}
              >
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Engagement row */}
            <div className="mt-2 flex items-center gap-5 text-[12px] text-gray-500">
              <span>💬 0</span>
              <span>🔁 0</span>
              <span>❤️ 0</span>
              <span>📊</span>
            </div>
          </div>
        </div>

        {/* Thread continuation preview */}
        {isThread && parts.length > 1 && (
          <div className="mt-3 pl-11 border-l-2 border-gray-200 ml-4">
            <div className="text-[11px] text-gray-400 mb-1">
              Thread — {parts.length} tweets
            </div>
            {parts.slice(1, 3).map((part, i) => (
              <div key={i} className="mb-2">
                <p className="text-[12px] text-gray-700 whitespace-pre-wrap break-words line-clamp-2">
                  {part}
                </p>
                {i < parts.slice(1, 3).length - 1 && (
                  <div className="h-px bg-gray-100 mt-2" />
                )}
              </div>
            ))}
            {parts.length > 3 && (
              <div className="text-[11px] text-blue-500">
                + {parts.length - 3} more tweets
              </div>
            )}
          </div>
        )}
      </div>

      {/* Char count for first tweet */}
      <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between gap-2">
        <div className="flex-1">
          <CharBar current={firstPart.length} limit={LIMIT} />
        </div>
        <CharCount current={firstPart.length} limit={LIMIT} />
        {isThread && (
          <span className="text-[10px] bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-mono">
            {parts.length} tweets
          </span>
        )}
      </div>
    </div>
  );
}
