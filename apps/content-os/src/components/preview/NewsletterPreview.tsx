'use client';

// @crumb newsletter-preview
// UI | preview | newsletter-mockup (Substack / Medium / Ghost / Beehiiv)
// why: Shared long-form newsletter preview for blog-style platforms with no hard char limit

interface NewsletterPreviewProps {
  text: string;
  title?: string;
  imageUrl?: string | null;
  authorName?: string;
  platform: 'substack' | 'medium' | 'ghost' | 'beehiiv';
}

const PLATFORM_META: Record<string, { color: string; label: string; chrome: string }> = {
  substack: { color: '#FF6719', label: 'Substack', chrome: 'bg-[#FF6719]' },
  medium: { color: '#000000', label: 'Medium', chrome: 'bg-black' },
  ghost: { color: '#15171A', label: 'Ghost', chrome: 'bg-[#15171A]' },
  beehiiv: { color: '#5B21B6', label: 'Beehiiv', chrome: 'bg-[#5B21B6]' },
};

export function NewsletterPreview({
  text,
  title = 'Article Title',
  imageUrl,
  authorName = 'Your Name',
  platform,
}: NewsletterPreviewProps) {
  const meta = PLATFORM_META[platform];
  // Show excerpt (first 600 chars) with a "Continue reading" affordance
  const excerpt = text.length > 600 ? text.slice(0, 600) + '…' : text;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden font-serif">
      <div className={`h-1 w-full ${meta.chrome}`} />

      {/* Publication header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-[11px] font-sans font-semibold" style={{ color: meta.color }}>
          {meta.label}
        </span>
        <span className="text-[11px] font-sans text-gray-400">Subscribe</span>
      </div>

      {/* Hero image */}
      {imageUrl && (
        <div className="w-full" style={{ aspectRatio: '16 / 9' }}>
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Article content */}
      <div className="px-5 py-4 max-w-[520px]">
        <h1 className="text-[18px] font-bold leading-snug text-gray-900 mb-2">{title}</h1>

        <div className="flex items-center gap-2 text-[11px] font-sans text-gray-500 mb-3">
          <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[9px] text-gray-700">
            {authorName.charAt(0).toUpperCase()}
          </div>
          <span>{authorName}</span>
          <span>·</span>
          <span>Just now</span>
        </div>

        <p className="text-[13px] leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
          {excerpt}
        </p>

        {text.length > 600 && (
          <button
            className="mt-3 text-[12px] font-sans font-medium border border-gray-300 px-3 py-1 rounded text-gray-700 hover:bg-gray-50"
            style={{ fontFamily: 'sans-serif' }}
          >
            Continue reading
          </button>
        )}
      </div>

      {/* Footer note — no hard limit */}
      <div className="px-4 py-1.5 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-sans">
        <span>No character limit</span>
        <span>{text.length.toLocaleString()} chars · ~{Math.ceil(text.split(/\s+/).length / 250)} min read</span>
      </div>
    </div>
  );
}
