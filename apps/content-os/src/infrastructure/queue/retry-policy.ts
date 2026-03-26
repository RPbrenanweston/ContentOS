// @crumb queue-retry-policy
// INF | Configuration | Retry semantics
// why: Centralise exponential backoff constants so pg-boss config, monitoring, and alerting all use the same retry budget
// in:[attempt: number (0-indexed)] out:[delay ms capped at maxDelayMs] err:[none]
// hazard: attempt values beyond maxRetries are not guarded here; callers must enforce the upper bound
// hazard: maxDelayMs of 5 min means a burst of failures can keep retrying for ~16 min total window (30+60+120+240+300)
// edge:./pg-boss.ts -> ALIGNS_WITH
// edge:./workers.ts -> INFORMS
// prompt: Expose getRetryDelay() in admin dashboard so operators can see expected retry schedule per job

/**
 * Bounded exponential backoff retry policy for queue jobs.
 *
 * Retry schedule (attempt = completed attempt count, 0-indexed):
 *   attempt 0 →  30 s
 *   attempt 1 →  60 s
 *   attempt 2 → 120 s
 *   attempt 3 → 240 s
 *   attempt 4 → 300 s (capped)
 *
 * Total worst-case retry window: ~750 s (~12.5 min) before dead-letter.
 *
 * These constants mirror the pg-boss constructor options in pg-boss.ts.
 * Both must be updated together if the policy changes.
 */
export const RETRY_POLICY = {
  maxRetries: 5,
  initialDelayMs: 30_000,
  backoffMultiplier: 2,
  maxDelayMs: 300_000, // 5 minutes
} as const;

/**
 * Calculate the delay before the next retry attempt.
 *
 * @param attempt - Zero-indexed count of attempts already completed.
 *                  Pass 0 for the first retry, 1 for the second, etc.
 * @returns Delay in milliseconds, capped at RETRY_POLICY.maxDelayMs.
 */
export function getRetryDelay(attempt: number): number {
  const delay =
    RETRY_POLICY.initialDelayMs * Math.pow(RETRY_POLICY.backoffMultiplier, attempt);
  return Math.min(delay, RETRY_POLICY.maxDelayMs);
}
