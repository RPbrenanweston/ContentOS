import type { PlatformType } from '@/domain';
import type { PlatformCapabilities } from './types';

/**
 * Static capabilities for each platform.
 * Derived from API research: Twitter v2, LinkedIn Marketing, Meta Graph,
 * TikTok Content Posting, YouTube Data v3, Bluesky AT Protocol, etc.
 */
const PLATFORM_CAPABILITIES: Record<PlatformType, PlatformCapabilities> = {
  twitter: {
    maxTextLength: 280, // 25,000 for Premium
    maxImages: 4,
    maxVideos: 1,
    maxVideoSize: 512 * 1024 * 1024,
    maxImageSize: 5 * 1024 * 1024,
    maxVideoDuration: 140,
    supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    supportedVideoFormats: ['video/mp4'],
    supportsPolls: true,
    supportsScheduling: false,
    supportsCarousel: false,
    supportsThreads: true,
    supportsAltText: true,
    mediaUploadPattern: 'binary',
    requiresPKCE: true,
    authType: 'oauth2',
  },
  linkedin: {
    maxTextLength: 3000,
    maxImages: 9,
    maxVideos: 1,
    maxVideoSize: 5 * 1024 * 1024 * 1024,
    maxImageSize: 10 * 1024 * 1024,
    maxVideoDuration: 600,
    supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif'],
    supportedVideoFormats: ['video/mp4'],
    supportsPolls: true,
    supportsScheduling: false,
    supportsCarousel: false, // Sponsored only
    supportsThreads: false,
    supportsAltText: true,
    mediaUploadPattern: 'binary',
    requiresPKCE: false,
    authType: 'oauth2',
  },
  instagram: {
    maxTextLength: 2200,
    maxImages: 10,
    maxVideos: 1,
    maxVideoSize: 4 * 1024 * 1024 * 1024,
    maxImageSize: 8 * 1024 * 1024,
    maxVideoDuration: 900,
    supportedImageFormats: ['image/jpeg'],
    supportedVideoFormats: ['video/mp4', 'video/quicktime'],
    supportsPolls: false,
    supportsScheduling: false,
    supportsCarousel: true,
    supportsThreads: false,
    supportsAltText: true,
    mediaUploadPattern: 'container', // URL-based + container publish
    requiresPKCE: false,
    authType: 'oauth2',
  },
  facebook: {
    maxTextLength: 63206,
    maxImages: 10,
    maxVideos: 1,
    maxVideoSize: 10 * 1024 * 1024 * 1024,
    maxImageSize: 10 * 1024 * 1024,
    maxVideoDuration: 14400,
    supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp'],
    supportedVideoFormats: ['video/mp4'],
    supportsPolls: true,
    supportsScheduling: true, // 10 min to 30 days
    supportsCarousel: false,
    supportsThreads: false,
    supportsAltText: false,
    mediaUploadPattern: 'binary',
    requiresPKCE: false,
    authType: 'oauth2',
  },
  threads: {
    maxTextLength: 500,
    maxImages: 20,
    maxVideos: 1,
    maxVideoSize: 1024 * 1024 * 1024,
    maxImageSize: 8 * 1024 * 1024,
    maxVideoDuration: 300,
    supportedImageFormats: ['image/jpeg', 'image/png'],
    supportedVideoFormats: ['video/mp4', 'video/quicktime'],
    supportsPolls: false,
    supportsScheduling: false,
    supportsCarousel: true,
    supportsThreads: true,
    supportsAltText: true,
    mediaUploadPattern: 'container',
    requiresPKCE: false,
    authType: 'oauth2',
  },
  tiktok: {
    maxTextLength: 2200,
    maxImages: 35,
    maxVideos: 1,
    maxVideoSize: 4 * 1024 * 1024 * 1024,
    maxImageSize: 20 * 1024 * 1024,
    maxVideoDuration: 3600,
    supportedImageFormats: ['image/jpeg', 'image/png', 'image/webp'],
    supportedVideoFormats: ['video/mp4', 'video/quicktime'],
    supportsPolls: false,
    supportsScheduling: false,
    supportsCarousel: false,
    supportsThreads: false,
    supportsAltText: false,
    mediaUploadPattern: 'binary', // Also supports URL pull
    requiresPKCE: false,
    authType: 'oauth2',
  },
  youtube: {
    maxTextLength: 5000, // Description
    maxImages: 0, // Video only
    maxVideos: 1,
    maxVideoSize: 256 * 1024 * 1024 * 1024,
    maxImageSize: 0,
    maxVideoDuration: 43200,
    supportedImageFormats: [],
    supportedVideoFormats: ['video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/webm'],
    supportsPolls: false,
    supportsScheduling: true,
    supportsCarousel: false,
    supportsThreads: false,
    supportsAltText: false,
    mediaUploadPattern: 'binary', // Resumable
    requiresPKCE: false,
    authType: 'oauth2',
  },
  bluesky: {
    maxTextLength: 300, // Graphemes, not chars
    maxImages: 4,
    maxVideos: 1,
    maxVideoSize: 50 * 1024 * 1024,
    maxImageSize: 1024 * 1024,
    maxVideoDuration: 60,
    supportedImageFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    supportedVideoFormats: ['video/mp4'],
    supportsPolls: false,
    supportsScheduling: false,
    supportsCarousel: false,
    supportsThreads: true,
    supportsAltText: true,
    mediaUploadPattern: 'binary',
    requiresPKCE: false,
    authType: 'session', // AT Protocol JWT, not OAuth
  },
  reddit: {
    maxTextLength: 40000,
    maxImages: 20,
    maxVideos: 1,
    maxVideoSize: 1024 * 1024 * 1024,
    maxImageSize: 20 * 1024 * 1024,
    maxVideoDuration: 900,
    supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif'],
    supportedVideoFormats: ['video/mp4'],
    supportsPolls: true,
    supportsScheduling: false,
    supportsCarousel: true,
    supportsThreads: false,
    supportsAltText: false,
    mediaUploadPattern: 'binary',
    requiresPKCE: false,
    authType: 'oauth2',
  },
  medium: {
    maxTextLength: 100000,
    maxImages: 50,
    maxVideos: 0,
    maxVideoSize: 0,
    maxImageSize: 25 * 1024 * 1024,
    maxVideoDuration: 0,
    supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif'],
    supportedVideoFormats: [],
    supportsPolls: false,
    supportsScheduling: false,
    supportsCarousel: false,
    supportsThreads: false,
    supportsAltText: false,
    mediaUploadPattern: 'url',
    requiresPKCE: false,
    authType: 'oauth2', // Integration token
  },
  substack: {
    maxTextLength: 100000,
    maxImages: 50,
    maxVideos: 0,
    maxVideoSize: 0,
    maxImageSize: 10 * 1024 * 1024,
    maxVideoDuration: 0,
    supportedImageFormats: ['image/jpeg', 'image/png'],
    supportedVideoFormats: [],
    supportsPolls: false,
    supportsScheduling: false,
    supportsCarousel: false,
    supportsThreads: false,
    supportsAltText: false,
    mediaUploadPattern: 'url',
    requiresPKCE: false,
    authType: 'oauth2', // No public API — limited
  },
  ghost: {
    maxTextLength: 500000,
    maxImages: 100,
    maxVideos: 0,
    maxVideoSize: 0,
    maxImageSize: 50 * 1024 * 1024,
    maxVideoDuration: 0,
    supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'],
    supportedVideoFormats: [],
    supportsPolls: false,
    supportsScheduling: true,
    supportsCarousel: false,
    supportsThreads: false,
    supportsAltText: true,
    mediaUploadPattern: 'binary',
    requiresPKCE: false,
    authType: 'oauth2', // Admin API key
  },
  beehiiv: {
    maxTextLength: 500000,
    maxImages: 50,
    maxVideos: 0,
    maxVideoSize: 0,
    maxImageSize: 10 * 1024 * 1024,
    maxVideoDuration: 0,
    supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif'],
    supportedVideoFormats: [],
    supportsPolls: false,
    supportsScheduling: true,
    supportsCarousel: false,
    supportsThreads: false,
    supportsAltText: false,
    mediaUploadPattern: 'url',
    requiresPKCE: false,
    authType: 'oauth2', // API key
  },
};

/** Platform display metadata */
const PLATFORM_META: Record<PlatformType, { name: string; brandColor: string }> = {
  twitter: { name: 'X / Twitter', brandColor: '#000000' },
  linkedin: { name: 'LinkedIn', brandColor: '#0A66C2' },
  instagram: { name: 'Instagram', brandColor: '#E4405F' },
  facebook: { name: 'Facebook', brandColor: '#1877F2' },
  threads: { name: 'Threads', brandColor: '#000000' },
  tiktok: { name: 'TikTok', brandColor: '#000000' },
  youtube: { name: 'YouTube', brandColor: '#FF0000' },
  bluesky: { name: 'Bluesky', brandColor: '#0085FF' },
  reddit: { name: 'Reddit', brandColor: '#FF4500' },
  medium: { name: 'Medium', brandColor: '#000000' },
  substack: { name: 'Substack', brandColor: '#FF6719' },
  ghost: { name: 'Ghost', brandColor: '#15171A' },
  beehiiv: { name: 'beehiiv', brandColor: '#F6C549' },
};

export function getCapabilities(platform: PlatformType): PlatformCapabilities {
  return PLATFORM_CAPABILITIES[platform];
}

export function getPlatformMeta(platform: PlatformType) {
  return PLATFORM_META[platform];
}

export function getAllPlatforms(): PlatformType[] {
  return Object.keys(PLATFORM_CAPABILITIES) as PlatformType[];
}

export function getSocialPlatforms(): PlatformType[] {
  return ['twitter', 'linkedin', 'instagram', 'facebook', 'threads', 'tiktok', 'youtube', 'bluesky', 'reddit'];
}

export function getNewsletterPlatforms(): PlatformType[] {
  return ['medium', 'substack', 'ghost', 'beehiiv'];
}
