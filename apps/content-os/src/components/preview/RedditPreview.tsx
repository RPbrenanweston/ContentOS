'use client';

// @crumb reddit-preview
// UI | preview | reddit-mockup
// why: Render Reddit post preview with upvote/downvote chrome and subreddit context

import { PLATFORM_CONSTRAINTS } from './platform-constraints';

interface RedditPreviewProps {
  text: string;
  title?: string;
  imageUrl?: string | null;
  authorName?: string;
  subreddit?: string;
}

const LIMIT = PLATFORM_CONSTRAINTS.reddit.charLimit!;

export function RedditPreview({
  text,
  title = 'Post title',
  imageUrl,
  authorName = 'u/yourhandle',
  subreddit = 'r/yoursubreddit',
}: RedditPreviewProps) {
  const charCount = text.length;
  const isOver = charCount > LIMIT;

  return (
    <div className="bg-[#F6F7F8] rounded-lg border border-gray-200 shadow-sm overflow-hidden font-sans">
      <div className="bg-[#FF4500] h-1 w-full" />

      <div className="flex">
        {/* Upvote column */}
        <div className="w-10 bg-gray-50 flex flex-col items-center py-3 gap-1 border-r border-gray-200">
          <button className="text-[#FF4500] text-lg leading-none">▲</button>
          <span className="text-[11px] font-bold text-gray-700">1</span>
          <button className="text-blue-400 text-lg leading-none">▼</button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-3">
          {/* Meta */}
          <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-1 flex-wrap">
            <span className="font-semibold text-gray-900">{subreddit}</span>
            <span>·</span>
            <span>Posted by {authorName}</span>
            <span>·</span>
            <span>Just now</span>
          </div>

          {/* Title */}
          <h3 className="text-[14px] font-semibold text-gray-900 mb-2 leading-tight">
            {title}
          </h3>

          {/* Image */}
          {imageUrl && (
            <div className="mb-2 rounded overflow-hidden max-h-[300px]">
              <img src={imageUrl} alt="" className="w-full object-cover" />
            </div>
          )}

          {/* Body text */}
          {text && (
            <div className={`text-[12px] leading-relaxed whitespace-pre-wrap break-words max-h-[200px] overflow-hidden relative ${isOver ? 'text-red-700' : 'text-gray-800'}`}>
              {text}
              {charCount > 500 && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#F6F7F8] to-transparent" />
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-500">
            <span>💬 0 Comments</span>
            <span>↗️ Share</span>
            <span>⭐ Save</span>
          </div>
        </div>
      </div>

      {/* Char info — Reddit limit is very high, just show raw count */}
      <div className="px-3 py-1.5 border-t border-gray-200 bg-white flex items-center justify-between text-[10px] text-gray-400">
        <span>40,000 char limit</span>
        <span className={charCount > LIMIT ? 'text-red-500 font-medium' : ''}>{charCount.toLocaleString()} chars</span>
      </div>
    </div>
  );
}
