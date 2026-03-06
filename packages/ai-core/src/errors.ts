/**
 * @crumb
 * @id sal-errors-hierarchy
 * @intent Define a typed error hierarchy so callers can catch and handle AI failures by category without parsing error strings
 * @responsibilities Error class definitions (AIError, ProviderError subtypes), error classification from unknown errors, typed error throwing
 * @contracts AIError (base) with code + statusCode; ProviderError extends AIError; classifyError(error) => AIError; throwTypedError(code, message, statusCode?) => never
 * @hazards classifyError falls through to generic AIError for unrecognized shapes — novel provider errors lose their original context; Error subclasses expose statusCode which may leak internal HTTP details to end users
 * @area ERR
 * @refs packages/ai-core/src/client.ts, packages/ai-core/src/billing.ts, packages/ai-core/src/keys.ts, packages/ai-core/src/retry.ts
 * @prompt When adding new error types, extend AIError or ProviderError — never create standalone Error subclasses outside this hierarchy
 */

/**
 * AI-specific error types
 */

/**
 * Base error class for all AI layer errors
 */
export class AIError extends Error {
  public code: string;
  public statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AIError.prototype);
  }
}

/**
 * Thrown when an API key is invalid or missing
 */
export class InvalidKeyError extends AIError {
  constructor(message: string = 'Invalid or missing API key') {
    super(message, 'INVALID_KEY');
    this.name = 'InvalidKeyError';
    Object.setPrototypeOf(this, InvalidKeyError.prototype);
  }
}

/**
 * Thrown when user has insufficient credits
 */
export class InsufficientCreditsError extends AIError {
  constructor(message: string = 'Insufficient credits for this operation') {
    super(message, 'INSUFFICIENT_CREDITS');
    this.name = 'InsufficientCreditsError';
    Object.setPrototypeOf(this, InsufficientCreditsError.prototype);
  }
}

/**
 * Thrown when spending cap is exceeded
 */
export class SpendingCapExceededError extends AIError {
  constructor(message: string = 'Spending cap exceeded') {
    super(message, 'SPENDING_CAP_EXCEEDED');
    this.name = 'SpendingCapExceededError';
    Object.setPrototypeOf(this, SpendingCapExceededError.prototype);
  }
}

/**
 * Thrown when a requested model is not found
 */
export class ModelNotFoundError extends AIError {
  constructor(modelId: string) {
    super(`Model not found: ${modelId}`, 'MODEL_NOT_FOUND');
    this.name = 'ModelNotFoundError';
    Object.setPrototypeOf(this, ModelNotFoundError.prototype);
  }
}

/**
 * Thrown when an LLM provider returns an error
 */
export class ProviderError extends AIError {
  public originalError?: Error;

  constructor(
    message: string,
    code: string = 'PROVIDER_ERROR',
    statusCode?: number,
    originalError?: Error,
  ) {
    super(message, code, statusCode);
    this.name = 'ProviderError';
    this.originalError = originalError;
    Object.setPrototypeOf(this, ProviderError.prototype);
  }
}

/**
 * Thrown when a rate limit error occurs
 */
export class RateLimitError extends ProviderError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Thrown when an authentication error occurs
 */
export class AuthenticationError extends ProviderError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/** Type guard for errors with an HTTP status code */
export function hasStatusCode(error: unknown): error is Error & { status: number } {
  return (
    error instanceof Error &&
    'status' in error &&
    typeof (error as Record<string, unknown>).status === 'number'
  );
}

/**
 * Classify a provider error by HTTP status code
 *
 * Extracted from client.ts for Single Responsibility:
 * error classification belongs with error types, not client orchestration.
 */
export function classifyError(error: unknown): string {
  if (!hasStatusCode(error)) return 'PROVIDER_ERROR';
  if (error.status === 401 || error.status === 403) return 'AUTHENTICATION_ERROR';
  if (error.status === 429) return 'RATE_LIMIT';
  if (error.status === 400) return 'INVALID_REQUEST';
  if (error.status >= 500) return 'PROVIDER_ERROR';
  return 'PROVIDER_ERROR';
}

/**
 * Re-throw an error as the appropriate typed error class
 */
export function throwTypedError(error: unknown, errorCode: string): never {
  const message = error instanceof Error ? error.message : String(error);
  const status = hasStatusCode(error) ? error.status : undefined;
  if (errorCode === 'AUTHENTICATION_ERROR') {
    throw new AuthenticationError(message);
  }
  if (errorCode === 'RATE_LIMIT') {
    throw new RateLimitError(message);
  }
  throw new ProviderError(message, errorCode, status, error instanceof Error ? error : undefined);
}
