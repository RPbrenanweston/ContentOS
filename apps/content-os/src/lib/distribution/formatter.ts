import type { PlatformType } from '@/domain';
import type { PlatformCapabilities } from '@/lib/platforms/types';

// ─── Platform-Specific Limits ───────────────────────────
//
// These are hardcoded as fallbacks. The primary source of truth is
// PlatformCapabilities.maxTextLength from the adapter registry.

const PLATFORM_TEXT_LIMITS: Partial<Record<PlatformType, number>> = {
  twitter: 280,
  linkedin: 3000,
};

// ─── Text Formatting ────────────────────────────────────

/**
 * Format text for a specific platform, truncating if it exceeds the
 * platform's maximum text length.
 *
 * Priority for determining max length:
 *   1. capabilities.maxTextLength (from adapter registry)
 *   2. PLATFORM_TEXT_LIMITS hardcoded fallback
 *   3. No truncation if neither is available
 */
export function formatForPlatform(
  text: string,
  platform: PlatformType,
  capabilities: PlatformCapabilities,
): string {
  const maxLength = capabilities.maxTextLength || PLATFORM_TEXT_LIMITS[platform];

  if (!maxLength || text.length <= maxLength) {
    return text;
  }

  // Truncate with ellipsis — leave room for the 3-char suffix
  return text.slice(0, maxLength - 3) + '...';
}

// ─── Hashtag Utilities ──────────────────────────────────

const HASHTAG_PATTERN = /#[a-zA-Z0-9_]+/g;

/**
 * Extract all #hashtag tokens from a text string.
 * Returns an array of hashtags including the # prefix.
 */
export function extractHashtags(text: string): string[] {
  return text.match(HASHTAG_PATTERN) ?? [];
}

/**
 * Remove all #hashtag tokens from a text string.
 * Collapses any resulting double-spaces into single spaces and trims.
 */
export function stripHashtags(text: string): string {
  return text
    .replace(HASHTAG_PATTERN, '')
    .replace(/  +/g, ' ')
    .trim();
}
