/**
 * Retry utilities with exponential backoff
 *
 * Extracted from client.ts for Single Responsibility:
 * retry logic is a cross-cutting concern, not specific to the AI client.
 */

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  jitterFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 100,
  jitterFactor: 0.1,
};

/**
 * Determines if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('status' in error)) return false;
  const status = (error as { status: number }).status;
  if (status === 429) return true;
  if (status >= 500) return true;
  return false;
}

/**
 * Calculates exponential backoff delay with jitter
 */
export function calculateBackoffDelay(
  attemptNumber: number,
  baseDelayMs: number,
  jitterFactor: number,
): number {
  // Exponential: 2^attempt * baseDelay
  const exponentialDelay = Math.pow(2, attemptNumber) * baseDelayMs;
  // Add jitter: random value between 0 and jitterFactor * exponentialDelay
  const jitter = Math.random() * jitterFactor * exponentialDelay;
  return exponentialDelay + jitter;
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps an async function with retry logic
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;

      // Non-retryable errors fail immediately
      if (!isRetryableError(error)) {
        throw error;
      }

      // On last attempt, don't sleep - just throw
      if (attempt === config.maxRetries) {
        throw error;
      }

      // Calculate backoff and sleep
      const delayMs = calculateBackoffDelay(attempt, config.baseDelayMs, config.jitterFactor);
      await sleep(delayMs);
    }
  }

  // Should never reach here, but just in case
  throw lastError;
}
