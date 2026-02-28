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
