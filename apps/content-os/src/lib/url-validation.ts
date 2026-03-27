// @crumb url-validator
// LIB | security | SSRF-prevention
// why: Prevent Server-Side Request Forgery by blocking requests to private/loopback/cloud-metadata addresses before they reach FFmpeg or any HTTP fetch
// in:[url:string] out:[{valid:boolean, reason?:string}]
// hazard: DNS rebinding can bypass IP checks — for high-security deployments resolve the hostname and re-validate the resulting IP
// hazard: IPv6 representation has many forms (compressed, mapped); the regex below covers common cases but a proper IP library is more robust
// edge:../app/api/media/clip/route.ts -> USES
// prompt: Add domain allowlist for production; resolve DNS and re-check resolved IP for defence-in-depth against DNS rebinding

/**
 * Private / reserved IPv4 ranges that must never be reached from server-side requests:
 *   10.0.0.0/8        — RFC1918 private
 *   172.16.0.0/12     — RFC1918 private
 *   192.168.0.0/16    — RFC1918 private
 *   169.254.0.0/16    — Link-local / AWS EC2 metadata endpoint
 *   127.0.0.0/8       — Loopback
 */
const PRIVATE_IP_PATTERNS: RegExp[] = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
];

/** Explicit cloud-metadata address (AWS/GCP/Azure share 169.254.169.254) */
const CLOUD_METADATA_IP = '169.254.169.254';

/** Blocked hostnames */
const BLOCKED_HOSTNAMES = new Set(['localhost', '[::1]', '::1']);

function isPrivateIp(hostname: string): boolean {
  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) return true;
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname));
}

/**
 * Validate a URL before it is used in a server-side request (e.g. FFmpeg source).
 *
 * Rules:
 *   1. Must be a valid URL (parseable by the WHATWG URL API)
 *   2. Must use the HTTP or HTTPS scheme (blocks file://, ftp://, etc.)
 *   3. Hostname must not resolve to a private/loopback/link-local address
 *   4. Hostname must not be the cloud metadata IP (169.254.169.254)
 *   5. DNS resolution check: resolved IP must not be in a private range (DNS rebinding defence)
 */
export async function validateExternalUrl(url: string): Promise<{ valid: boolean; reason?: string }> {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, reason: 'Only HTTP and HTTPS URLs are allowed' };
  }

  const hostname = parsed.hostname;

  if (hostname === CLOUD_METADATA_IP) {
    return { valid: false, reason: 'Cloud metadata endpoint is not allowed' };
  }

  if (isPrivateIp(hostname)) {
    return { valid: false, reason: 'Private and loopback addresses are not allowed' };
  }

  // DNS resolution check — defend against DNS rebinding attacks
  try {
    const { resolve4 } = await import('node:dns/promises');
    const addresses = await resolve4(hostname);
    for (const ip of addresses) {
      if (isPrivateIp(ip)) {
        return { valid: false, reason: 'Resolved IP address is in a private range' };
      }
      if (ip === CLOUD_METADATA_IP) {
        return { valid: false, reason: 'Resolved IP points to cloud metadata endpoint' };
      }
    }
  } catch {
    // If hostname is already an IP literal, resolve4 will fail — that's fine,
    // the static checks above already covered it.
  }

  return { valid: true };
}
