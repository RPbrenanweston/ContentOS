/**
 * Billing and credit management
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { CreditBalance, ModelInfo } from './types';
import { InsufficientCreditsError } from './errors';
import { calculateCost } from './models';

/**
 * Get remaining credits for current period
 */
export async function getRemainingCredits(
  userId: string,
  supabase: SupabaseClient
): Promise<CreditBalance> {
  const now = new Date();

  // Query for balance row where period_start <= now < period_end
  const { data, error } = await supabase
    .from('ai_credit_balances')
    .select('*')
    .eq('user_id', userId)
    .lte('period_start', now.toISOString())
    .gt('period_end', now.toISOString())
    .maybeSingle();

  // If no row found or error, return zero balance (credit system not active)
  if (!data) {
    return {
      remainingUsd: 0,
      usedUsd: 0,
      periodStart: now.toISOString(),
      periodEnd: now.toISOString(),
    };
  }

  return {
    remainingUsd: parseFloat(data.credits_remaining_usd),
    usedUsd: parseFloat(data.credits_used_usd),
    periodStart: data.period_start,
    periodEnd: data.period_end,
    spendingCapUsd: data.spending_cap_usd ? parseFloat(data.spending_cap_usd) : undefined,
  };
}

/**
 * Check if sufficient credits available
 */
export async function checkCredits(
  userId: string,
  estimatedCostUsd: number,
  supabase: SupabaseClient
): Promise<boolean> {
  const balance = await getRemainingCredits(userId, supabase);
  if (balance.remainingUsd < estimatedCostUsd) {
    throw new InsufficientCreditsError(
      `Insufficient credits: ${balance.remainingUsd.toFixed(4)} remaining, ${estimatedCostUsd.toFixed(4)} required`
    );
  }
  return true;
}
