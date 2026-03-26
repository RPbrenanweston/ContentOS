// @crumb rate-limiter
// LIB | security | rate-limiting
// why: In-memory token bucket rate limiter protecting API routes from abuse; no Redis dependency for simplicity
// in:[key:string, limit:number, windowMs:number] out:[{allowed:boolean, retryAfter:number}]
// hazard: In-memory store does not persist across process restarts or scale across multiple instances; use Redis for distributed deployments
// hazard: Map grows unbounded if unique keys never expire; a GC sweep runs on every check but only removes expired entries on access
// edge:../app/api/media/upload/route.ts -> USES (upload rate limiting)
// edge:../app/api/media/clip/route.ts -> USES (clip rate limiting)
// prompt: Replace with Redis-backed limiter (ioredis + sliding window) when deploying multiple instances; add per-user rate limiting on auth routes

type BucketState = {
  tokens: number;
  lastRefill: number;
};

const buckets = new Map<string, BucketState>();

/**
 * Token bucket rate limiter.
 *
 * Refills the bucket to `limit` on every new window. Within a window, each
 * call consumes one token. When tokens reach 0 the request is denied and
 * `retryAfter` tells the caller how many milliseconds until the bucket refills.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const state = buckets.get(key);

  if (!state || now - state.lastRefill >= windowMs) {
    // New key or window has elapsed — refill to limit and consume one token
    buckets.set(key, { tokens: limit - 1, lastRefill: now });
    return { allowed: true, retryAfter: 0 };
  }

  if (state.tokens > 0) {
    state.tokens -= 1;
    return { allowed: true, retryAfter: 0 };
  }

  const retryAfter = windowMs - (now - state.lastRefill);
  return { allowed: false, retryAfter };
}

/**
 * Preset rate limit configurations.
 *
 * Values can be overridden via environment variables:
 *   RATE_LIMIT_DEFAULT  — requests per minute for general API routes
 *   RATE_LIMIT_AI       — requests per minute for AI/LLM routes
 *   RATE_LIMIT_UPLOAD   — requests per minute for file upload routes
 */
export const RATE_LIMITS = {
  default: {
    limit: Number(process.env.RATE_LIMIT_DEFAULT ?? 100),
    window: 60_000,
  },
  ai: {
    limit: Number(process.env.RATE_LIMIT_AI ?? 10),
    window: 60_000,
  },
  upload: {
    limit: Number(process.env.RATE_LIMIT_UPLOAD ?? 20),
    window: 60_000,
  },
} as const;
