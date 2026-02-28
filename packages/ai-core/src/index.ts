/**
 * @org/ai-core - Reusable AI utility layer
 *
 * Public API for creating and managing AI clients
 */

// Export client factory and DI types
export { createAIClient } from './client';
export type { AIClientDeps, AIClientOptions } from './client';

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
  CreateCheckoutSessionParams,
  CheckoutSession,
} from './types';

// Export all errors and error utilities
export {
  AIError,
  InvalidKeyError,
  InsufficientCreditsError,
  SpendingCapExceededError,
  ModelNotFoundError,
  ProviderError,
  RateLimitError,
  AuthenticationError,
  classifyError,
  throwTypedError,
} from './errors';

// Export retry utilities
export {
  retryWithBackoff,
  isRetryableError,
  calculateBackoffDelay,
  DEFAULT_RETRY_CONFIG,
} from './retry';
export type { RetryConfig } from './retry';

// Export provider types and registration
export { getAdapter, registerAdapter } from './providers';
export type {
  ProviderAdapter,
  ChatProvider,
  StreamProvider,
  ChatCallResult,
  ChunkUsage,
} from './providers';

// Export utility functions
export { getModel, getDefaultModel, calculateCost } from './models';
export { logUsage } from './usage';
export type { LogUsageParams } from './usage';
export {
  getRemainingCredits,
  checkCredits,
  checkSpendingCap,
  deductCredits,
  createCheckoutSession,
  handleStripeWebhook,
  getUserOrgId,
  getOrgBalance,
} from './billing';
export { resolveKey, saveKey, deleteKey, validateKey } from './keys';
export type { ResolvedKey } from './keys';
export { syncOpenRouterModels } from './sync';
export type { SyncResult } from './sync';
