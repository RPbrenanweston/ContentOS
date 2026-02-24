/**
 * Core AI client for calling LLM providers
 */

import Anthropic from '@anthropic-ai/sdk';
import { SupabaseClient } from '@supabase/supabase-js';
import { AIClientConfig, AIClient, ChatParams, ChatResult, ChatChunk, GenerateParams, CreditBalance, UsageSummary, DateRange } from './types';
import { getModel, calculateCost } from './models';
import { logUsage } from './usage';
import { resolveKey } from './keys';
import { ProviderError, AuthenticationError } from './errors';

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

      // Call Anthropic API
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

      const response = await client.messages.create(requestParams);

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
    // TODO: Implement streaming chat to Anthropic SDK
    throw new Error('Not implemented');
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
