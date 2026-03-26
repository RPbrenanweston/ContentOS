'use client';

// @crumb threads-preview
// UI | preview | threads-mockup
// why: Render Threads post preview with 500 char limit and thread-style layout

import { PLATFORM_CONSTRAINTS, splitIntoThreadParts } from './platform-constraints';
import { CharCount, CharBar } from './CharCount';

interface ThreadsPreviewProps {
  text: string;
  imageUrl?: string | null;
  authorName?: string;
  handle?: string;
}

const LIMIT = PLATFORM_CONSTRAINTS.threads.charLimit!;

export function ThreadsPreview({
  text,
  imageUrl,
  authorName = 'Your Name',
  handle = 'yourhandle',
}: ThreadsPreviewProps) {
  const isThread = text.length > LIMIT;
  const parts = isThread ? splitIntoThreadParts(text, LIMIT) : [text];
  const firstPart = parts[0];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden font-sans">
      <div className="bg-black h-1 w-full" />

      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-gray-900 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
              {authorName.charAt(0).toUpperCase()}
            </div>
            {isThread && <div className="w-0.5 bg-gray-300 flex-1 mt-1 min-h-[24px]" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-semibold text-gray-900">{handle}</span>
              <span className="text-[12px] text-gray-400">· now</span>
            </div>
            <p className="text-[13px] text-gray-900 leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
              {firstPart}
            </p>
            {imageUrl && !isThread && (
              <div
                className="mt-2 rounded-xl overflow-hidden border border-gray-200"
                style={{ aspectRatio: '1 / 1' }}
              >
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="mt-2 flex items-center gap-4 text-[12px] text-gray-500">
              <span>🤍</span>
              <span>💬</span>
              <span>🔁</span>
              <span>✈️</span>
            </div>
          </div>
        </div>

        {/* Thread continuation */}
        {isThread && parts.length > 1 && (
          <div className="mt-2 flex items-start gap-2">
            <div className="w-9 flex justify-center">
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-[10px] text-gray-600">
                {authorName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[11px] text-gray-400 mb-0.5">{handle}</div>
              <p className="text-[12px] text-gray-700 whitespace-pre-wrap break-words line-clamp-3">
                {parts[1]}
              </p>
              {parts.length > 2 && (
                <div className="text-[11px] text-blue-500 mt-1">
                  + {parts.length - 2} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between gap-2">
        <div className="flex-1">
          <CharBar current={firstPart.length} limit={LIMIT} />
        </div>
        <CharCount current={firstPart.length} limit={LIMIT} />
        {isThread && (
          <span className="text-[10px] bg-gray-100 text-gray-600 border border-gray-200 px-1.5 py-0.5 rounded font-mono">
            {parts.length} posts
          </span>
        )}
      </div>
    </div>
  );
}
