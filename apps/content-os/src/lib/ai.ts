/**
 * @crumb
 * id: ai-client-integration
 * AREA: INF
 * why: Route decomposition and asset generation through shared ai-core layer for billing, retry, and key management
 * in: AIClientConfig {appId, defaultModel?}; AIChatParams {userId, featureId, messages[], model?, maxTokens?, temperature?}
 * out: AIChatResult {content, usage: {tokensIn, tokensOut, costUsd}, model, latencyMs}
 * err: Propagates ai-core errors (InsufficientCreditsError, RateLimitError, ProviderError) to callers
 * hazard: defaultModel 'claude-sonnet-4-20250514' hardcoded—model EOL not detected, cutoff date drift not handled
 * edge: CALLED_BY decomposition.service.ts (content analysis); asset-generator.service.ts (asset generation)
 * edge: DELEGATES_TO @org/ai-core for key management, billing, usage tracking, retry logic
 * prompt: Test error handling when ai-core unavailable; verify usage cost calculation accuracy; test model fallback on deprecated model version; validate token counting edge cases (special tokens, multimodal content)
 */

/**
 * AI client integration using @org/ai-core.
 *
 * All AI operations (decomposition, asset generation) route through
 * this module to get automatic billing, usage tracking, retry, and
 * key management from the shared AI layer.
 */

import { createAIClient } from '@org/ai-core';
import type { ChatParams, ChatResult } from '@org/ai-core';
import { createServiceClient } from '@/infrastructure/supabase/client';

// Local interfaces kept for backward compatibility with Content OS consumers.
// These are field-for-field identical to ai-core's types.

export interface AIClientConfig {
  appId: string;
  defaultModel?: string;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatParams {
  userId: string;
  featureId: string;
  messages: AIMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIChatResult {
  content: string;
  usage: {
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
  };
  model: string;
  latencyMs: number;
}

export interface AIClient {
  chat(params: AIChatParams): Promise<AIChatResult>;
}

/**
 * Create AI client for Content OS.
 *
 * Delegates to @org/ai-core's createAIClient, which provides
 * automatic billing, usage tracking, retry, and key management.
 */
export function createContentOSAIClient(config: AIClientConfig): AIClient {
  const coreClient = createAIClient({
    appId: config.appId,
    supabaseClient: createServiceClient(),
    defaultModel: config.defaultModel,
  });

  return {
    async chat(params: AIChatParams): Promise<AIChatResult> {
      const coreParams: ChatParams = {
        userId: params.userId,
        featureId: params.featureId,
        messages: params.messages,
        model: params.model,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
      };

      const result: ChatResult = await coreClient.chat(coreParams);

      return {
        content: result.content,
        usage: result.usage,
        model: result.model,
        latencyMs: result.latencyMs,
      };
    },
  };
}

export const aiClient = createContentOSAIClient({
  appId: 'content-os',
  defaultModel: 'claude-sonnet-4-20250514',
});
