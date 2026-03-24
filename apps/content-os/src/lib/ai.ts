/**
 * @crumb
 * id: ai-client-integration
 * AREA: INF
 * why: Define AI client contract and stub implementation—route decomposition and asset generation through shared ai-core layer for billing and retry
 * in: AIClientConfig {appId, defaultModel?}; AIChatParams {userId, featureId, messages[], model?, maxTokens?, temperature?}
 * out: AIChatResult {content, usage: {tokensIn, tokensOut, costUsd}, model, latencyMs}
 * err: No errors typed—stub throws immediately; @org/ai-core integration incomplete
 * hazard: createContentOSAIClient() always throws—decomposition.service depends on this but has no fallback for ai-core missing
 * hazard: defaultModel 'claude-sonnet-4-20250514' hardcoded—model EOL not detected, cutoff date drift not handled
 * edge: CALLED_BY decomposition.service.ts (content analysis); asset-generator.service.ts (asset generation)
 * edge: DELEGATES_TO @org/ai-core (when linked) for key management, billing, usage tracking, retry logic
 * edge: REQUIRES deployment of ai-core workspace linking for Phase 3 enablement
 * prompt: Test error handling when ai-core unavailable; verify usage cost calculation accuracy; test model fallback on deprecated model version; validate token counting edge cases (special tokens, multimodal content)
 */

/**
 * AI client integration using @org/ai-core.
 *
 * All AI operations (decomposition, asset generation) route through
 * this module to get automatic billing, usage tracking, retry, and
 * key management from the shared AI layer.
 */

// NOTE: Uncomment when @org/ai-core is properly linked in the workspace.
// For now, we define a lightweight interface that matches ai-core's contract.

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
 * When @org/ai-core is linked, this will delegate to createAIClient().
 * For now, returns a stub that throws — swap for real implementation
 * in Phase 3 when decomposition service is built.
 */
export function createContentOSAIClient(config: AIClientConfig): AIClient {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async chat(_params: AIChatParams): Promise<AIChatResult> {
      throw new Error(
        `AI client not yet connected. Configure @org/ai-core for app: ${config.appId}`,
      );
    },
  };
}

export const aiClient = createContentOSAIClient({
  appId: 'content-os',
  defaultModel: 'claude-sonnet-4-20250514',
});
