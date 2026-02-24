/**
 * Core AI client for calling LLM providers
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { AIClientConfig, AIClient, ChatParams, ChatResult, ChatChunk, GenerateParams } from './types';

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
    // TODO: Implement chat call to Anthropic SDK
    throw new Error('Not implemented');
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
  async getUsage(period?: { start: string; end: string }): Promise<any> {
    // TODO: Implement usage query
    throw new Error('Not implemented');
  }

  /**
   * Get remaining credits
   */
  async getRemainingCredits(): Promise<any> {
    // TODO: Implement credit query
    throw new Error('Not implemented');
  }
}
