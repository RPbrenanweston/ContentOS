/**
 * URL normalization for inspiration item deduplication.
 *
 * Rules:
 * - Lowercase the host
 * - Strip trailing slash from pathname (but preserve "/")
 * - Drop tracking query params (utm_*, fbclid, gclid, mc_cid, mc_eid, igshid, ref)
 * - Strip fragment
 *
 * Returns null if the URL is unparseable.
 */

const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'ref',
]);

function isTrackingParam(name: string): boolean {
  const lower = name.toLowerCase();
  if (TRACKING_PARAMS.has(lower)) return true;
  if (lower.startsWith('utm_')) return true;
  return false;
}

export function normalizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  // Lowercase host (URL already lowercases protocol)
  parsed.hostname = parsed.hostname.toLowerCase();

  // Strip fragment
  parsed.hash = '';

  // Strip tracking params
  const toDelete: string[] = [];
  parsed.searchParams.forEach((_value, key) => {
    if (isTrackingParam(key)) toDelete.push(key);
  });
  for (const key of toDelete) parsed.searchParams.delete(key);

  // Strip trailing slash from pathname, but preserve root "/"
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  }

  return parsed.toString();
}
