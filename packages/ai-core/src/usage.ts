/**
 * @crumb
 * @id sal-usage-logger
 * @intent Record every LLM API call's token consumption and cost to Supabase for billing reconciliation and observability
 * @responsibilities Usage event logging, fire-and-forget insert to ai_usage_log table
 * @contracts logUsage(params: LogUsageParams) => void (fire-and-forget, never throws to caller)
 * @hazards Fire-and-forget pattern silently drops failed inserts — usage data loss is invisible to callers; created_at uses client-side Date which may drift from server time
 * @area OBS
 * @refs packages/ai-core/src/client.ts, packages/ai-core/src/billing.ts
 * @trail chat-flow#6 | Log token consumption after successful LLM response and before credit deduction
 * @trail billing-flow#2 | Log token usage after cost calculation and credit deduction complete
 * @dependencies @supabase/supabase-js
 * @prompt Never make logUsage awaitable — callers depend on fire-and-forget behavior to avoid blocking chat responses
 */

/**
 * Usage logging to Supabase
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Parameters for logging a usage event
 */
export interface LogUsageParams {
  userId: string;
  orgId?: string;
  appId: string;
  featureId: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
  keySource: 'managed' | 'byok';
  supabase: SupabaseClient;
}

/**
 * Log a usage event to ai_usage_log
 * Fire-and-forget: does not block calling code
 */
export function logUsage(params: LogUsageParams): void {
  // Fire-and-forget: log but don't wait
  const insertPromise = params.supabase.from('ai_usage_log').insert({
    user_id: params.userId,
    org_id: params.orgId || null,
    app_id: params.appId,
    feature_id: params.featureId,
    provider: params.provider,
    model: params.model,
    tokens_in: params.tokensIn,
    tokens_out: params.tokensOut,
    cost_usd: params.costUsd,
    latency_ms: params.latencyMs,
    success: params.success,
    error_code: params.errorCode || null,
    key_source: params.keySource,
    created_at: new Date().toISOString(),
  });

  // Handle promise but don't wait for it
  void Promise.resolve(insertPromise)
    .then(() => {
      // Success path: silently logged
    })
    .catch((error: unknown) => {
      // Error path: warn but don't throw
      console.warn('Failed to log AI usage:', error);
    });
}
