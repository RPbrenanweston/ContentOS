/**
 * Core AI client for calling LLM providers
 */

import Anthropic from '@anthropic-ai/sdk';
import { SupabaseClient } from '@supabase/supabase-js';
import { AIClientConfig, AIClient, ChatParams, ChatResult, ChatChunk, GenerateParams, CreditBalance, UsageSummary, DateRange } from './types';
import { getModel, calculateCost } from './models';
import { logUsage } from './usage';
import { resolveKey } from './keys';
import { ProviderError, AuthenticationError, RateLimitError } from './errors';

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
  private anthropic: Anthropic;

  constructor(config: AIClientConfig) {
    this.appId = config.appId;
    this.supabase = config.supabaseClient;
    this.defaultModel = config.defaultModel || 'claude-sonnet-4-20250514';
    // Initialize Anthropic client - uses ANTHROPIC_API_KEY env var by default
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Send a chat message to the LLM
   */
  async chat(params: ChatParams): Promise<ChatResult> {
    const startTime = Date.now();
    const modelId = params.model || this.defaultModel;

    try {
      // Resolve the model info
      const model = await getModel(modelId, this.supabase);

      // Resolve API key (managed only for S06 - no BYOK yet)
      const { key } = await resolveKey(params.userId, 'anthropic', this.supabase);

      // Create Anthropic client with resolved key
      const client = new Anthropic({ apiKey: key });

      // Convert our Message format to Anthropic format
      const messages = params.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      // Build request parameters
      const requestParams: any = {
        model: modelId,
        max_tokens: params.maxTokens || model.maxOutputTokens,
        temperature: params.temperature,
        messages,
      };

      if (params.tools && params.tools.length > 0) {
        requestParams.tools = params.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.input_schema,
        }));
      }

      // Call Anthropic API with retry logic - only log usage on final attempt
      const response = await retryWithBackoff(
        () => client.messages.create(requestParams),
        { maxRetries: 3, baseDelayMs: 100, jitterFactor: 0.1 }
      );

      const latencyMs = Date.now() - startTime;
      const tokensIn = response.usage.input_tokens;
      const tokensOut = response.usage.output_tokens;
      const costUsd = calculateCost(model, tokensIn, tokensOut);

      // Extract text content from response
      const content = response.content
        .filter((block) => block.type === 'text')
        .map((block) => ('text' in block ? block.text : ''))
        .join('');

      // Log usage (fire-and-forget)
      logUsage({
        userId: params.userId,
        appId: this.appId,
        featureId: params.featureId,
        provider: 'anthropic',
        model: modelId,
        tokensIn,
        tokensOut,
        costUsd,
        latencyMs,
        success: true,
        keySource: 'managed',
        supabase: this.supabase,
      });

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
      logUsage({
        userId: params.userId,
        appId: this.appId,
        featureId: params.featureId,
        provider: 'anthropic',
        model: params.model || this.defaultModel,
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
        latencyMs,
        success: false,
        errorCode,
        keySource: 'managed',
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
   */
  async *chatStream(params: ChatParams): AsyncIterable<ChatChunk> {
    const startTime = Date.now();
    const modelId = params.model || this.defaultModel;
    let tokensIn = 0;
    let tokensOut = 0;

    try {
      // Resolve the model info
      const model = await getModel(modelId, this.supabase);

      // Resolve API key
      const { key } = await resolveKey(params.userId, 'anthropic', this.supabase);

      // Create Anthropic client with resolved key
      const client = new Anthropic({ apiKey: key });

      // Convert our Message format to Anthropic format
      const messages = params.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      // Build request parameters
      const requestParams: any = {
        model: modelId,
        max_tokens: params.maxTokens || model.maxOutputTokens,
        temperature: params.temperature,
        messages,
      };

      if (params.tools && params.tools.length > 0) {
        requestParams.tools = params.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.input_schema,
        }));
      }

      // Start streaming - stream() is synchronous, so we wrap it in a retry-compatible function
      const stream = await retryWithBackoff(
        async () => client.messages.stream(requestParams),
        { maxRetries: 3, baseDelayMs: 100, jitterFactor: 0.1 }
      );

      // Yield start_stream chunk
      yield {
        delta: {
          type: 'start_stream',
        },
      };

      // Track token counts and content as we stream
      for await (const chunk of stream) {
        // Handle text delta events
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          yield {
            delta: {
              type: 'text_delta',
              text: chunk.delta.text,
            },
          };
        }

        // Accumulate token counts from message_delta
        if (chunk.type === 'message_delta' && chunk.usage) {
          tokensOut = chunk.usage.output_tokens;
        }
      }

      // Get final token counts from stream.finalMessage()
      const finalMessage = await stream.finalMessage();
      if (finalMessage.usage) {
        tokensIn = finalMessage.usage.input_tokens;
        tokensOut = finalMessage.usage.output_tokens;
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
        provider: 'anthropic',
        model: modelId,
        tokensIn,
        tokensOut,
        costUsd,
        latencyMs,
        success: true,
        keySource: 'managed',
        supabase: this.supabase,
      });
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

      // Log usage error with any accumulated tokens (fire-and-forget)
      logUsage({
        userId: params.userId,
        appId: this.appId,
        featureId: params.featureId,
        provider: 'anthropic',
        model: modelId,
        tokensIn,
        tokensOut,
        costUsd: 0,
        latencyMs,
        success: false,
        errorCode,
        keySource: 'managed',
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

  /**
   * Generate structured output
   */
  async generate<T>(params: GenerateParams<T>): Promise<T> {
    // TODO: Implement structured generation
    throw new Error('Not implemented');
  }

  /**
   * Get usage summary for a period
   */
  async getUsage(period?: DateRange): Promise<UsageSummary> {
    // TODO: Implement usage query
    throw new Error('Not implemented');
  }

  /**
   * Get remaining credits
   */
  async getRemainingCredits(): Promise<CreditBalance> {
    // TODO: Implement credit query
    throw new Error('Not implemented');
  }
}
