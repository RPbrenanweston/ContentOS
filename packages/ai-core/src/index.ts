/**
 * @org/ai-core - Reusable AI utility layer
 *
 * Public API for creating and managing AI clients
 */

// Export client factory
export { createAIClient } from './client';

// Export all types
export type {
  AIClientConfig,
  AIClient,
  ChatParams,
  ChatResult,
  ChatChunk,
  GenerateParams,
  Message,
  Tool,
  UsageSummary,
  CreditBalance,
  DateRange,
  ModelInfo,
} from './types';

// Export all errors
export {
  AIError,
  InvalidKeyError,
  InsufficientCreditsError,
  SpendingCapExceededError,
  ModelNotFoundError,
  ProviderError,
  RateLimitError,
  AuthenticationError,
} from './errors';

// Export utility functions
export { getModel, getDefaultModel, calculateCost } from './models';
export { logUsage } from './usage';
export type { LogUsageParams } from './usage';
export { getRemainingCredits, checkCredits } from './billing';
export { resolveKey } from './keys';
export type { ResolvedKey } from './keys';
