/**
 * @crumb
 * @id sal-client-orchestrator
 * @intent Orchestrate the full lifecycle of an LLM API call — from model resolution through billing to response delivery
 * @responsibilities Chat request orchestration, streaming orchestration, dependency injection wiring, credit pre-check and post-deduction
 * @contracts createAIClient(config: AIClientConfig) => AIClient; AIClient.chat(params) => Promise<ChatResult>; AIClient.chatStream(params) => AsyncGenerator<ChatChunk>
 * @hazards Fire-and-forget credit deduction can silently fail leaving usage unbilled; Double model resolution in chatStream error path re-queries DB on every retry
 * @area API
 * @refs packages/ai-core/src/providers.ts, packages/ai-core/src/billing.ts, packages/ai-core/src/keys.ts, packages/ai-core/src/retry.ts, packages/ai-core/src/usage.ts, packages/ai-core/src/models.ts
 * @trail chat-flow#1 | Entry point — receives chat request, resolves model, checks credits, delegates to provider
 * @trail byok-flow#2 | Uses resolved key (BYOK or managed) when constructing the provider client
 * @dependencies @anthropic-ai/sdk, openai, @supabase/supabase-js
 * @prompt When modifying chat or chatStream, preserve the billing-before-call / deduct-after-call ordering — reversing this creates unbilled usage windows
 */

/**
 * Core AI client for calling LLM providers
 *
 * SOLID principles applied:
 * - Single Responsibility: Retry logic in retry.ts, error classification in errors.ts
 * - Dependency Inversion: Services injected via AIClientDeps, defaulting to concrete implementations
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
import { AIClientConfig, AIClient, ChatParams, ChatResult, ChatChunk, ModelInfo } from './types';
import { getModel as defaultGetModel, calculateCost as defaultCalculateCost } from './models';
import { logUsage as defaultLogUsage, LogUsageParams } from './usage';
import { resolveKey as defaultResolveKey, ResolvedKey } from './keys';
import {
  checkCredits as defaultCheckCredits,
  checkSpendingCap as defaultCheckSpendingCap,
  deductCredits as defaultDeductCredits,
} from './billing';
import { classifyError, throwTypedError } from './errors';
import { getAdapter as defaultGetAdapter, ProviderAdapter } from './providers';
import { retryWithBackoff, RetryConfig, DEFAULT_RETRY_CONFIG } from './retry';

/** Retry config for fire-and-forget DB operations like credit deduction */
const DB_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 500,
  jitterFactor: 0.2,
  isRetryable: () => true,
};

/**
 * Injectable dependencies for AIClient (Dependency Inversion Principle).
 *
 * All dependencies default to their concrete implementations.
 * Override individual services for testing or alternative implementations.
 */
export interface AIClientDeps {
  getModel: (modelId: string, supabase: SupabaseClient) => Promise<ModelInfo>;
  calculateCost: (model: ModelInfo, tokensIn: number, tokensOut: number) => number;
  resolveKey: (userId: string, provider: string, supabase: SupabaseClient) => Promise<ResolvedKey>;
  checkCredits: (
    userId: string,
    estimatedCost: number,
    supabase: SupabaseClient,
  ) => Promise<boolean>;
  checkSpendingCap: (
    userId: string,
    estimatedCost: number,
    supabase: SupabaseClient,
  ) => Promise<void>;
  deductCredits: (userId: string, cost: number, supabase: SupabaseClient) => Promise<void>;
  logUsage: (params: LogUsageParams) => void;
  getAdapter: (provider: string) => ProviderAdapter;
  retryConfig: RetryConfig;
}

/**
 * Extended config with optional dependency injection
 */
export interface AIClientOptions extends AIClientConfig {
  services?: Partial<AIClientDeps>;
}

/**
 * Create and return an initialized AIClient
 */
export function createAIClient(config: AIClientOptions): AIClient {
  return new AIClientImpl(config);
}

/**
 * Internal implementation of AIClient
 */
class AIClientImpl implements AIClient {
  private appId: string;
  private supabase: SupabaseClient;
  private defaultModel: string;
  private deps: AIClientDeps;

  constructor(config: AIClientOptions) {
    this.appId = config.appId;
    this.supabase = config.supabaseClient;
    this.defaultModel = config.defaultModel || 'claude-sonnet-4-20250514';

    // Use injected services or defaults (Dependency Inversion)
    const s = config.services || {};
    this.deps = {
      getModel: s.getModel || defaultGetModel,
      calculateCost: s.calculateCost || defaultCalculateCost,
      resolveKey: s.resolveKey || defaultResolveKey,
      checkCredits: s.checkCredits || defaultCheckCredits,
      checkSpendingCap: s.checkSpendingCap || defaultCheckSpendingCap,
      deductCredits: s.deductCredits || defaultDeductCredits,
      logUsage: s.logUsage || defaultLogUsage,
      getAdapter: s.getAdapter || defaultGetAdapter,
      retryConfig: s.retryConfig || DEFAULT_RETRY_CONFIG,
    };
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
      const model = await this.deps.getModel(modelId, this.supabase);

      // Detect provider from model registry
      const provider = model.provider as 'anthropic' | 'openai' | 'openrouter';
      detectedProvider = provider; // Store for error logging

      // Resolve API key for the detected provider
      const { key, source } = await this.deps.resolveKey(params.userId, provider, this.supabase);

      // Check credits and spending caps BEFORE API call (managed keys only)
      if (source === 'managed') {
        // Estimate cost for pre-check (rough estimate based on input message length)
        const estimatedInputTokens = params.messages.reduce(
          (sum, msg) => sum + (typeof msg.content === 'string' ? msg.content.length / 4 : 100),
          0,
        );
        const estimatedOutputTokens = params.maxTokens || model.maxOutputTokens || 1000;
        const estimatedCost = this.deps.calculateCost(
          model,
          estimatedInputTokens,
          estimatedOutputTokens,
        );

        // Check both credits balance and spending caps
        await this.deps.checkCredits(params.userId, estimatedCost, this.supabase);
        await this.deps.checkSpendingCap(params.userId, estimatedCost, this.supabase);
      }

      // Provider-specific API call via adapter
      const adapter = this.deps.getAdapter(provider);
      const client = adapter.createClient(key);
      const request = adapter.buildRequest(modelId, model, params);

      const response = await retryWithBackoff(
        () => adapter.executeChat(client, request),
        this.deps.retryConfig,
      );

      const { content, tokensIn, tokensOut } = adapter.parseChatResponse(response);

      const latencyMs = Date.now() - startTime;
      const costUsd = this.deps.calculateCost(model, tokensIn, tokensOut);

      // Log usage (fire-and-forget)
      this.deps.logUsage({
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

      // Deduct credits after successful call (managed keys only, fire-and-forget with retry)
      if (source === 'managed') {
        void retryWithBackoff(
          () => this.deps.deductCredits(params.userId, costUsd, this.supabase),
          DB_RETRY_CONFIG,
        ).catch((err) => console.warn('Failed to deduct credits after retries:', err));
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
    } catch (error: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorCode = classifyError(error);

      this.deps.logUsage({
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
        keySource: 'managed',
        supabase: this.supabase,
      });

      throwTypedError(error, errorCode);
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
      const model = await this.deps.getModel(modelId, this.supabase);

      // Detect provider
      const provider = model.provider as 'anthropic' | 'openai' | 'openrouter';

      // Resolve API key
      const { key, source } = await this.deps.resolveKey(params.userId, provider, this.supabase);

      // Provider-specific streaming via adapter
      const adapter = this.deps.getAdapter(provider);
      const client = adapter.createClient(key);
      const request = adapter.buildStreamRequest(modelId, model, params);

      const stream = await retryWithBackoff(
        () => adapter.executeStream(client, request),
        this.deps.retryConfig,
      );

      // Yield start_stream chunk
      yield {
        delta: {
          type: 'start_stream',
        },
      };

      // Iterate stream chunks
      for await (const chunk of stream as AsyncIterable<unknown>) {
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
      const costUsd = this.deps.calculateCost(model, tokensIn, tokensOut);

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
      this.deps.logUsage({
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
    } catch (error: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorCode = classifyError(error);
      let detectedProvider = 'unknown';

      try {
        const model = await this.deps.getModel(modelId, this.supabase);
        detectedProvider = model.provider;
      } catch {
        // If we can't resolve the model, use 'unknown'
      }

      this.deps.logUsage({
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
        keySource: 'managed',
        supabase: this.supabase,
      });

      throwTypedError(error, errorCode);
    }
  }
}
