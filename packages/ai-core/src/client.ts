/**
 * Core AI client for calling LLM providers
 *
 * FUTURE ENHANCEMENT: AbortController Timeout Support
 * ────────────────────────────────────────────────────
 * Currently, API calls to provider SDKs (Anthropic, OpenAI) do not implement
 * AbortController-based timeouts. Consider adding timeout protection:
 *
 * 1. Wrap provider API calls with AbortSignal.timeout(ms)
 * 2. Default timeout: 60 seconds for chat, 300 seconds for streaming
 * 3. Allow configurable timeout via ChatParams
 * 4. Properly clean up AbortController instances after use
 * 5. Test that timeouts don't break existing retry logic
 *
 * Example pattern:
 *   const abortController = new AbortController();
 *   const timeoutId = setTimeout(() => abortController.abort(), 60000);
 *   try {
 *     const result = await client.messages.create({ signal: abortController.signal });
 *   } finally {
 *     clearTimeout(timeoutId);
 *   }
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { AIClientConfig, AIClient, ChatParams, ChatResult, ChatChunk } from './types';
import { getModel, calculateCost } from './models';
import { logUsage } from './usage';
import { resolveKey } from './keys';
import { checkCredits, checkSpendingCap, deductCredits } from './billing';
import { ProviderError, AuthenticationError, RateLimitError } from './errors';
import { getAdapter } from './providers';

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  jitterFactor: number;
}

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Retry on 429 (rate limit) and 5xx (server errors)
  if (error.status === 429) return true;
  if (error.status && error.status >= 500) return true;
  return false;
}

/**
 * Calculates exponential backoff delay with jitter
 */
function calculateBackoffDelay(attemptNumber: number, baseDelayMs: number, jitterFactor: number): number {
  // Exponential: 2^attempt * baseDelay
  const exponentialDelay = Math.pow(2, attemptNumber) * baseDelayMs;
  // Add jitter: random value between 0 and jitterFactor * exponentialDelay
  const jitter = Math.random() * jitterFactor * exponentialDelay;
  return exponentialDelay + jitter;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wraps an async function with retry logic
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = { maxRetries: 3, baseDelayMs: 100, jitterFactor: 0.1 }
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
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

/**
 * Create and return an initialized AIClient
 */
export function createAIClient(config: AIClientConfig): AIClient {
  return new AIClientImpl(config);
}

/**
 * Internal implementation of AIClient
 */
class AIClientImpl implements AIClient {
  private appId: string;
  private supabase: SupabaseClient;
  private defaultModel: string;

  constructor(config: AIClientConfig) {
    this.appId = config.appId;
    this.supabase = config.supabaseClient;
    this.defaultModel = config.defaultModel || 'claude-sonnet-4-20250514';
  }

  /**
   * Send a chat message to the LLM
   */
  async chat(params: ChatParams): Promise<ChatResult> {
    const startTime = Date.now();
    const modelId = params.model || this.defaultModel;
    let detectedProvider: string = 'unknown'; // Track provider for error logging

    try {
      // Resolve the model info
      const model = await getModel(modelId, this.supabase);

      // Detect provider from model registry
      const provider = model.provider as 'anthropic' | 'openai' | 'openrouter';
      detectedProvider = provider; // Store for error logging

      // Resolve API key for the detected provider
      const { key, source } = await resolveKey(params.userId, provider, this.supabase);

      // Check credits and spending caps BEFORE API call (managed keys only)
      if (source === 'managed') {
        // Estimate cost for pre-check (rough estimate based on input message length)
        const estimatedInputTokens = params.messages.reduce((sum, msg) =>
          sum + (typeof msg.content === 'string' ? msg.content.length / 4 : 100), 0
        );
        const estimatedOutputTokens = params.maxTokens || model.maxOutputTokens || 1000;
        const estimatedCost = calculateCost(model, estimatedInputTokens, estimatedOutputTokens);

        // Check both credits balance and spending caps
        await checkCredits(params.userId, estimatedCost, this.supabase);
        await checkSpendingCap(params.userId, estimatedCost, this.supabase);
      }

      // Provider-specific API call via adapter
      const adapter = getAdapter(provider);
      const client = adapter.createClient(key);
      const request = adapter.buildRequest(modelId, model, params);

      const response = await retryWithBackoff(
        () => adapter.executeChat(client, request),
        { maxRetries: 3, baseDelayMs: 100, jitterFactor: 0.1 }
      );

      const { content, tokensIn, tokensOut } = adapter.parseChatResponse(response);

      const latencyMs = Date.now() - startTime;
      const costUsd = calculateCost(model, tokensIn, tokensOut);

      // Log usage (fire-and-forget)
      logUsage({
        userId: params.userId,
        appId: this.appId,
        featureId: params.featureId,
        provider,
        model: modelId,
        tokensIn,
        tokensOut,
        costUsd,
        latencyMs,
        success: true,
        keySource: source,
        supabase: this.supabase,
      });

      // Deduct credits after successful call (managed keys only, fire-and-forget)
      if (source === 'managed') {
        void Promise.resolve(deductCredits(params.userId, costUsd, this.supabase))
          .then(() => {})
          .catch((err) => console.warn('Failed to deduct credits:', err));
      }

      return {
        content,
        usage: {
          tokensIn,
          tokensOut,
          costUsd,
        },
        model: modelId,
        latencyMs,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      let errorCode = 'PROVIDER_ERROR';

      // Map Anthropic errors to error codes
      if (error.status === 401 || error.status === 403) {
        errorCode = 'AUTHENTICATION_ERROR';
      } else if (error.status === 429) {
        errorCode = 'RATE_LIMIT';
      } else if (error.status === 400) {
        errorCode = 'INVALID_REQUEST';
      } else if (error.status && error.status >= 500) {
        errorCode = 'PROVIDER_ERROR';
      }

      // Log usage error (fire-and-forget)
      // Note: if error happens before provider detection, use 'unknown'
      logUsage({
        userId: params.userId,
        appId: this.appId,
        featureId: params.featureId,
        provider: detectedProvider,
        model: params.model || this.defaultModel,
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
        latencyMs,
        success: false,
        errorCode,
        keySource: 'managed', // Error path may not have resolved key yet
        supabase: this.supabase,
      });

      // Re-throw as ProviderError or AuthenticationError
      if (errorCode === 'AUTHENTICATION_ERROR') {
        throw new AuthenticationError(error.message);
      }
      throw new ProviderError(error.message, errorCode, error.status, error);
    }
  }

  /**
   * Stream a chat response
   * Supports Anthropic, OpenAI, and OpenRouter providers.
   */
  async *chatStream(params: ChatParams): AsyncIterable<ChatChunk> {
    const startTime = Date.now();
    const modelId = params.model || this.defaultModel;
    let tokensIn = 0;
    let tokensOut = 0;

    try {
      // Resolve the model info
      const model = await getModel(modelId, this.supabase);

      // Detect provider
      const provider = model.provider as 'anthropic' | 'openai' | 'openrouter';

      // Resolve API key
      const { key, source } = await resolveKey(params.userId, provider, this.supabase);

      // Provider-specific streaming via adapter
      const adapter = getAdapter(provider);
      const client = adapter.createClient(key);
      const request = adapter.buildStreamRequest(modelId, model, params);

      const stream = await retryWithBackoff(
        () => adapter.executeStream(client, request),
        { maxRetries: 3, baseDelayMs: 100, jitterFactor: 0.1 }
      );

      // Yield start_stream chunk
      yield {
        delta: {
          type: 'start_stream',
        },
      };

      // Iterate stream chunks
      for await (const chunk of stream) {
        const text = adapter.parseStreamChunk(chunk);
        if (text) {
          yield {
            delta: {
              type: 'text_delta',
              text,
            },
          };
        }

        const chunkUsage = adapter.getChunkUsage(chunk);
        if (chunkUsage) {
          if (chunkUsage.tokensIn !== undefined) tokensIn = chunkUsage.tokensIn;
          if (chunkUsage.tokensOut !== undefined) tokensOut = chunkUsage.tokensOut;
        }
      }

      // Get final usage (authoritative for Anthropic, null for OpenAI/OpenRouter)
      const finalUsage = await adapter.getFinalUsage(stream);
      if (finalUsage) {
        tokensIn = finalUsage.tokensIn;
        tokensOut = finalUsage.tokensOut;
      }

      const latencyMs = Date.now() - startTime;
      const costUsd = calculateCost(model, tokensIn, tokensOut);

      // Yield stop_stream chunk with final token counts
      yield {
        delta: {
          type: 'stop_stream',
        },
        partialTokens: {
          tokensIn,
          tokensOut,
        },
      };

      // Log usage on successful stream completion (fire-and-forget)
      logUsage({
        userId: params.userId,
        appId: this.appId,
        featureId: params.featureId,
        provider,
        model: modelId,
        tokensIn,
        tokensOut,
        costUsd,
        latencyMs,
        success: true,
        keySource: source,
        supabase: this.supabase,
      });
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      let errorCode = 'PROVIDER_ERROR';
      let detectedProvider = 'unknown';

      // Try to detect provider from model if possible
      try {
        const model = await getModel(modelId, this.supabase);
        detectedProvider = model.provider;
      } catch {
        // If we can't resolve the model, use 'unknown'
      }

      // Map provider errors to error codes
      if (error.status === 401 || error.status === 403) {
        errorCode = 'AUTHENTICATION_ERROR';
      } else if (error.status === 429) {
        errorCode = 'RATE_LIMIT';
      } else if (error.status === 400) {
        errorCode = 'INVALID_REQUEST';
      } else if (error.status && error.status >= 500) {
        errorCode = 'PROVIDER_ERROR';
      }

      // Log usage error with any accumulated tokens (fire-and-forget)
      // Note: if error happens before key resolution, source will be undefined - fallback to 'managed'
      logUsage({
        userId: params.userId,
        appId: this.appId,
        featureId: params.featureId,
        provider: detectedProvider,
        model: modelId,
        tokensIn,
        tokensOut,
        costUsd: 0,
        latencyMs,
        success: false,
        errorCode,
        keySource: 'managed', // Error path may not have resolved key yet
        supabase: this.supabase,
      });

      // Re-throw as typed error
      if (errorCode === 'AUTHENTICATION_ERROR') {
        throw new AuthenticationError(error.message);
      } else if (errorCode === 'RATE_LIMIT') {
        throw new RateLimitError(error.message);
      }
      throw new ProviderError(error.message, errorCode, error.status, error);
    }
  }

}
