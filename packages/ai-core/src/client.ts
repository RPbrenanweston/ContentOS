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
 * 3. Allow configurable timeout via ChatParams/GenerateParams
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

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
import { AIClientConfig, AIClient, ChatParams, ChatResult, ChatChunk, GenerateParams, CreditBalance, UsageSummary, DateRange, Tool } from './types';
import { getModel, calculateCost } from './models';
import { logUsage } from './usage';
import { resolveKey } from './keys';
import { checkCredits, checkSpendingCap, deductCredits } from './billing';
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
 * Shared helper: Format messages for OpenAI-compatible APIs (OpenAI, OpenRouter)
 */
function formatOpenAIMessages(messages: { role: string; content: string }[]) {
  return messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));
}

/**
 * Shared helper: Transform tools to OpenAI function calling format
 */
function formatOpenAITools(tools: Tool[]) {
  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
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

      // Provider-specific API call logic
      let tokensIn: number;
      let tokensOut: number;
      let content: string;

      if (provider === 'anthropic') {
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

        // Call Anthropic API with retry logic
        const response = await retryWithBackoff(
          () => client.messages.create(requestParams),
          { maxRetries: 3, baseDelayMs: 100, jitterFactor: 0.1 }
        );

        tokensIn = response.usage.input_tokens;
        tokensOut = response.usage.output_tokens;

        // Extract text content from response
        content = response.content
          .filter((block) => block.type === 'text')
          .map((block) => ('text' in block ? block.text : ''))
          .join('');
      } else if (provider === 'openai') {
        // Create OpenAI client with resolved key
        const client = new OpenAI({ apiKey: key });

        // Use shared helper for message formatting
        const messages = formatOpenAIMessages(params.messages);

        // Build request parameters
        const requestParams: any = {
          model: modelId,
          max_tokens: params.maxTokens || model.maxOutputTokens,
          temperature: params.temperature,
          messages,
        };

        // Use shared helper for tool formatting
        if (params.tools && params.tools.length > 0) {
          requestParams.tools = formatOpenAITools(params.tools);
        }

        // Call OpenAI API with retry logic
        const response = await retryWithBackoff(
          () => client.chat.completions.create(requestParams),
          { maxRetries: 3, baseDelayMs: 100, jitterFactor: 0.1 }
        );

        tokensIn = response.usage?.prompt_tokens || 0;
        tokensOut = response.usage?.completion_tokens || 0;

        // Extract text content from response
        content = response.choices[0]?.message?.content || '';
      } else if (provider === 'openrouter') {
        // Create OpenAI client with OpenRouter baseURL and headers
        const client = new OpenAI({
          apiKey: key,
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': 'https://shared-ai-layer.app',
            'X-Title': 'Shared AI Layer',
          },
        });

        // Use shared helper for message formatting
        const messages = formatOpenAIMessages(params.messages);

        // Build request parameters
        const requestParams: any = {
          model: modelId,
          max_tokens: params.maxTokens || model.maxOutputTokens,
          temperature: params.temperature,
          messages,
        };

        // Use shared helper for tool formatting
        if (params.tools && params.tools.length > 0) {
          requestParams.tools = formatOpenAITools(params.tools);
        }

        // Call OpenRouter API with retry logic (OpenAI-compatible)
        const response = await retryWithBackoff(
          () => client.chat.completions.create(requestParams),
          { maxRetries: 3, baseDelayMs: 100, jitterFactor: 0.1 }
        );

        tokensIn = response.usage?.prompt_tokens || 0;
        tokensOut = response.usage?.completion_tokens || 0;

        // Extract text content from response
        content = response.choices[0]?.message?.content || '';
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }

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
   * NOTE: Currently only supports Anthropic provider. OpenAI streaming support to be added in future iteration.
   */
  async *chatStream(params: ChatParams): AsyncIterable<ChatChunk> {
    const startTime = Date.now();
    const modelId = params.model || this.defaultModel;
    let tokensIn = 0;
    let tokensOut = 0;

    try {
      // Resolve the model info
      const model = await getModel(modelId, this.supabase);

      // Detect provider - currently only Anthropic supported for streaming
      const provider = model.provider as 'anthropic' | 'openai' | 'openrouter';
      if (provider !== 'anthropic') {
        throw new Error(`Streaming not yet supported for provider: ${provider}`);
      }

      // Resolve API key
      const { key, source } = await resolveKey(params.userId, provider, this.supabase);

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
        keySource: source,
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
      // Note: if error happens before key resolution, source will be undefined - fallback to 'managed'
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
