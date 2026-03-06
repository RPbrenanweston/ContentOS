/**
 * @crumb
 * @id sal-types-contracts
 * @intent Define the shared type contracts that all AI layer modules depend on so interfaces stay centralized and consistent
 * @responsibilities Type definitions for client config, chat params/results, streaming chunks, messages, tools, credit balances, model info, checkout sessions
 * @contracts AIClientConfig, AIClient, ChatParams, ChatResult, ChatChunk, Message, Tool, CreditBalance, ModelInfo, CreateCheckoutSessionParams, CheckoutSession
 * @hazards Adding optional fields to ChatParams or ModelInfo silently passes through without validation — consumers may receive undefined where they expect values; Tool.input_schema typed as Record<string, unknown> loses JSON Schema validation at compile time
 * @area DAT
 * @refs packages/ai-core/src/client.ts, packages/ai-core/src/providers.ts, packages/ai-core/src/billing.ts, packages/ai-core/src/models.ts
 * @prompt When adding new types, place them here — never define shared interfaces inline in consuming modules
 */

/**
 * Core types for the AI layer
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Configuration for initializing an AIClient
 */
export interface AIClientConfig {
  appId: string;
  supabaseClient: SupabaseClient;
  defaultModel?: string;
}

/**
 * The main AI client interface
 */
export interface AIClient {
  chat(params: ChatParams): Promise<ChatResult>;
  chatStream(params: ChatParams): AsyncIterable<ChatChunk>;
}

/**
 * Parameters for a chat call
 */
export interface ChatParams {
  userId: string;
  featureId: string;
  messages: Message[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: Tool[];
}

/**
 * Result from a chat call
 */
export interface ChatResult {
  content: string;
  usage: {
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
  };
  model: string;
  latencyMs: number;
}

/**
 * Individual chunk from a streaming chat response
 */
export interface ChatChunk {
  delta: {
    type: 'text_delta' | 'start_stream' | 'stop_stream';
    text?: string;
  };
  partialTokens?: {
    tokensIn: number;
    tokensOut: number;
  };
}

/**
 * Parameters for structured output generation
 */
export interface GenerateParams {
  userId: string;
  featureId: string;
  messages: Message[];
  schema: Record<string, unknown>;
  model?: string;
  maxTokens?: number;
}

/**
 * A single message in the conversation
 */
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Tool definition for function calling
 */
export interface Tool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/**
 * Usage summary for a period
 */
export interface UsageSummary {
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  calls: number;
  period: DateRange;
}

/**
 * Credit balance information
 */
export interface CreditBalance {
  remainingUsd: number;
  usedUsd: number;
  periodStart: string;
  periodEnd: string;
  spendingCapUsd?: number;
  orgId?: string; // Present if this is an org-level balance
}

/**
 * Date range for filtering
 */
export interface DateRange {
  start: string;
  end: string;
}

/**
 * Model information from registry
 */
export interface ModelInfo {
  id: string;
  provider: string;
  displayName: string;
  costPerInputToken: number;
  costPerOutputToken: number;
  maxContextTokens: number;
  maxOutputTokens: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
  isDefault: boolean;
  isActive: boolean;
}

/**
 * Stripe checkout session creation parameters
 */
export interface CreateCheckoutSessionParams {
  userId: string;
  amountUsd: number;
  successUrl: string;
  cancelUrl: string;
  supabase: SupabaseClient;
  orgId?: string; // Optional: for org-level credit purchases
}

/**
 * Stripe checkout session result
 */
export interface CheckoutSession {
  sessionId: string;
  url: string;
  customerId?: string;
}
