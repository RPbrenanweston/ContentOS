// @crumb video-source-resolver
// DOM | url-parsing | youtube-metadata
// why: Extracts video ID from multiple YouTube URL formats and builds embed URLs; gateway between user input and video storage/playback strategy
// in:[url string] out:[ResolvedVideoSource with sourceType youtubeId embedUrl] err:[Invalid regex match, missing window object in SSR]
// hazard: YOUTUBE_REGEX accepts 11-char alphanumeric strings without validation—could match invalid IDs that fail silently on embed
// hazard: getYouTubeEmbedUrl uses window.location.origin in client-side code without SSR guard (will throw in Node)
// edge:../../types/domain.ts -> RELATES (ResolvedVideoSource used in Video interface)
// edge:../utils/mappers.ts -> RELATES (sourceType resolved here used in mapVideo)
// prompt: Add iframe URL validation against YouTube API; wrap window reference in typeof check for full SSR safety

/**
 * Video source resolver — handles YouTube URL parsing and metadata extraction.
 * For MVP, YouTube videos use embedded iframes (no download/clip extraction).
 */

const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export interface ResolvedVideoSource {
  sourceType: 'upload' | 'youtube';
  youtubeId: string | null;
  embedUrl: string | null;
  title: string;
}

export function isYouTubeUrl(url: string): boolean {
  return YOUTUBE_REGEX.test(url);
}

export function extractYouTubeId(url: string): string | null {
  const match = url.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;
}

export function resolveVideoSource(url: string): ResolvedVideoSource {
  if (isYouTubeUrl(url)) {
    const youtubeId = extractYouTubeId(url);
    return {
      sourceType: 'youtube',
      youtubeId,
      embedUrl: youtubeId ? getYouTubeEmbedUrl(youtubeId) : null,
      title: `YouTube Video ${youtubeId}`,
    };
  }

  return {
    sourceType: 'upload',
    youtubeId: null,
    embedUrl: null,
    title: 'Uploaded Video',
  };
}
