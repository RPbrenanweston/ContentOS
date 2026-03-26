// @crumb preview-platform-constraints
// UI | preview | platform-constraints
// why: Centralize platform-specific character limits, image ratios, and display rules for preview components
// in:[none] out:[PLATFORM_CONSTRAINTS record keyed by Platform] err:[none]

import type { Platform } from '@/domain';

export interface PlatformConstraints {
  label: string;
  charLimit: number | null;
  secondaryLimit?: number; // e.g. thread part limit
  imageAspectRatio: string; // CSS aspect-ratio value
  imageAspectLabel: string;
  supportsThread: boolean;
  supportsImages: boolean;
  color: string; // brand color for UI accents
  bgColor: string;
  maxImages?: number;
}

export const PLATFORM_CONSTRAINTS: Record<string, PlatformConstraints> = {
  linkedin: {
    label: 'LinkedIn',
    charLimit: 3000,
    imageAspectRatio: '1200 / 627',
    imageAspectLabel: '1.91:1',
    supportsThread: false,
    supportsImages: true,
    color: '#0A66C2',
    bgColor: '#EEF3F8',
    maxImages: 9,
  },
  x: {
    label: 'X / Twitter',
    charLimit: 280,
    secondaryLimit: 280,
    imageAspectRatio: '16 / 9',
    imageAspectLabel: '16:9',
    supportsThread: true,
    supportsImages: true,
    color: '#000000',
    bgColor: '#F7F9F9',
    maxImages: 4,
  },
  instagram: {
    label: 'Instagram',
    charLimit: 2200,
    imageAspectRatio: '1 / 1',
    imageAspectLabel: '1:1',
    supportsThread: false,
    supportsImages: true,
    color: '#E1306C',
    bgColor: '#FAFAFA',
    maxImages: 10,
  },
  threads: {
    label: 'Threads',
    charLimit: 500,
    imageAspectRatio: '1 / 1',
    imageAspectLabel: '1:1',
    supportsThread: true,
    supportsImages: true,
    color: '#000000',
    bgColor: '#FAFAFA',
    maxImages: 10,
  },
  reddit: {
    label: 'Reddit',
    charLimit: 40000,
    imageAspectRatio: '16 / 9',
    imageAspectLabel: 'Variable',
    supportsThread: false,
    supportsImages: true,
    color: '#FF4500',
    bgColor: '#F6F7F8',
  },
  substack: {
    label: 'Substack',
    charLimit: null,
    imageAspectRatio: '16 / 9',
    imageAspectLabel: '16:9',
    supportsThread: false,
    supportsImages: true,
    color: '#FF6719',
    bgColor: '#FFFFFF',
  },
  medium: {
    label: 'Medium',
    charLimit: null,
    imageAspectRatio: '16 / 9',
    imageAspectLabel: '16:9',
    supportsThread: false,
    supportsImages: true,
    color: '#000000',
    bgColor: '#FFFFFF',
  },
  ghost: {
    label: 'Ghost',
    charLimit: null,
    imageAspectRatio: '16 / 9',
    imageAspectLabel: '16:9',
    supportsThread: false,
    supportsImages: true,
    color: '#15171A',
    bgColor: '#FFFFFF',
  },
  beehiiv: {
    label: 'Beehiiv',
    charLimit: null,
    imageAspectRatio: '16 / 9',
    imageAspectLabel: '16:9',
    supportsThread: false,
    supportsImages: true,
    color: '#5B21B6',
    bgColor: '#FAFAFA',
  },
} satisfies Partial<Record<Platform, PlatformConstraints>>;

export const PREVIEW_PLATFORMS: Platform[] = [
  'linkedin',
  'x',
  'instagram',
  'threads',
  'reddit',
  'substack',
  'medium',
  'ghost',
  'beehiiv',
];

/**
 * Split text into thread parts at charLimit boundaries,
 * breaking on word boundaries where possible.
 */
export function splitIntoThreadParts(text: string, limit: number): string[] {
  if (text.length <= limit) return [text];

  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > limit) {
    let cutAt = limit;
    // Walk back to find a word boundary
    while (cutAt > 0 && remaining[cutAt] !== ' ' && remaining[cutAt] !== '\n') {
      cutAt--;
    }
    if (cutAt === 0) cutAt = limit; // no word boundary found, hard cut
    parts.push(remaining.slice(0, cutAt).trimEnd());
    remaining = remaining.slice(cutAt).trimStart();
  }

  if (remaining.length > 0) parts.push(remaining);
  return parts;
}

/**
 * Truncate text with ellipsis at charLimit.
 */
export function truncateAt(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit - 1) + '\u2026';
}
