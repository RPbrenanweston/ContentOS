// @crumb platforms-presets
// DOM | video-export-specs | social-media-formats
// why: Platform metadata (TikTok Instagram YouTube etc) with aspect ratio constraints and duration limits; used for output validation and encoding parameters
// in:[no runtime—static preset constants] out:[PLATFORM_PRESETS WIDE_PRESETS ALL_PRESETS arrays] err:[Invalid aspect ratio format, clip exceeds maxDurationSeconds]
// hazard: fitsplatform checks clip duration but not width/height; encoder could fail if output resolution not matched
// hazard: maxDurationSeconds is Infinity for YouTube/Square; no upper bound may cause unexpected behavior in downstream trimming logic
// edge:../../services/output.service.ts -> RELATES (validation before clip extraction could use these presets)
// edge:../../utils/validation.ts -> RELATES (generateOutputSchema could validate platform constraints)
// prompt: Add width/height validation to fitsplatform; enforce max 12-hour limit even for Infinity platforms; add video codec profile hints

export interface PlatformPreset {
  id: string;
  name: string;
  icon: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  width: number;
  height: number;
  maxDurationSeconds: number;
  description: string;
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  {
    id: 'tiktok',
    name: 'TIKTOK',
    icon: 'TT',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    maxDurationSeconds: 600,
    description: '9:16 / UP TO 10 MIN',
  },
  {
    id: 'reels',
    name: 'REELS',
    icon: 'IG',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    maxDurationSeconds: 90,
    description: '9:16 / UP TO 90S',
  },
  {
    id: 'shorts',
    name: 'SHORTS',
    icon: 'YT',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    maxDurationSeconds: 60,
    description: '9:16 / UP TO 60S',
  },
];

export const WIDE_PRESETS: PlatformPreset[] = [
  {
    id: 'youtube',
    name: 'YOUTUBE',
    icon: 'YT',
    aspectRatio: '16:9',
    width: 1920,
    height: 1080,
    maxDurationSeconds: Infinity,
    description: '16:9 / NO LIMIT',
  },
  {
    id: 'square',
    name: 'SQUARE',
    icon: 'SQ',
    aspectRatio: '1:1',
    width: 1080,
    height: 1080,
    maxDurationSeconds: Infinity,
    description: '1:1 / FEED POST',
  },
];

export const ALL_PRESETS = [...PLATFORM_PRESETS, ...WIDE_PRESETS];

/**
 * Check if a clip duration fits within a platform's limit.
 */
export function fitsplatform(
  clipDurationSeconds: number,
  preset: PlatformPreset
): boolean {
  return clipDurationSeconds <= preset.maxDurationSeconds;
}
