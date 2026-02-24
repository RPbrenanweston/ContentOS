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
  // TODO: Query ai_credit_balances for current period
  throw new Error('Not implemented');
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
