/**
 * Billing and credit management
 */

import { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { CreditBalance, ModelInfo, CreateCheckoutSessionParams, CheckoutSession } from './types';
import { InsufficientCreditsError, SpendingCapExceededError } from './errors';
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

/**
 * Check spending caps before making a call
 *
 * Enforces both user-configured spending cap and admin-enforced cap.
 * The lower of the two caps wins.
 *
 * @throws SpendingCapExceededError if spending cap would be exceeded
 */
export async function checkSpendingCap(
  userId: string,
  estimatedCostUsd: number,
  supabase: SupabaseClient
): Promise<void> {
  const now = new Date();

  // Query for balance row where period_start <= now < period_end
  const { data, error } = await supabase
    .from('ai_credit_balances')
    .select('*')
    .eq('user_id', userId)
    .lte('period_start', now.toISOString())
    .gt('period_end', now.toISOString())
    .maybeSingle();

  // If no balance row exists, no spending cap configured
  if (!data || error) {
    return;
  }

  const currentUsed = parseFloat(data.credits_used_usd || '0');
  const userCap = data.spending_cap_usd ? parseFloat(data.spending_cap_usd) : null;
  const adminCap = data.admin_cap_usd ? parseFloat(data.admin_cap_usd) : null;

  // Determine the effective cap (lower of user and admin cap)
  let effectiveCap: number | null = null;

  if (userCap !== null && adminCap !== null) {
    // Both caps set - use the lower one
    effectiveCap = Math.min(userCap, adminCap);
  } else if (userCap !== null) {
    // Only user cap set
    effectiveCap = userCap;
  } else if (adminCap !== null) {
    // Only admin cap set
    effectiveCap = adminCap;
  }

  // If no cap configured, allow the call
  if (effectiveCap === null) {
    return;
  }

  // Check if this call would exceed the effective cap
  const projectedUsed = currentUsed + estimatedCostUsd;

  if (projectedUsed > effectiveCap) {
    const capType = (userCap !== null && adminCap !== null && userCap < adminCap)
      ? 'user spending cap'
      : (adminCap !== null && userCap !== null && adminCap < userCap)
      ? 'admin spending cap'
      : userCap !== null
      ? 'spending cap'
      : 'admin spending cap';

    throw new SpendingCapExceededError(
      `${capType.charAt(0).toUpperCase() + capType.slice(1)} exceeded: ${currentUsed.toFixed(4)} used + ${estimatedCostUsd.toFixed(4)} estimated = ${projectedUsed.toFixed(4)}, cap is ${effectiveCap.toFixed(4)}`
    );
  }
}

/**
 * Deduct credits after a successful call
 *
 * Updates both credits_used_usd (increment) and credits_remaining_usd (decrement)
 */
export async function deductCredits(
  userId: string,
  costUsd: number,
  supabase: SupabaseClient
): Promise<void> {
  const now = new Date();

  // Query for balance row where period_start <= now < period_end
  const { data, error } = await supabase
    .from('ai_credit_balances')
    .select('*')
    .eq('user_id', userId)
    .lte('period_start', now.toISOString())
    .gt('period_end', now.toISOString())
    .maybeSingle();

  // If no balance row exists, nothing to deduct (credit system not active)
  if (!data || error) {
    return;
  }

  const currentUsed = parseFloat(data.credits_used_usd || '0');
  const currentRemaining = parseFloat(data.credits_remaining_usd || '0');

  // Update the balance row
  await supabase
    .from('ai_credit_balances')
    .update({
      credits_used_usd: currentUsed + costUsd,
      credits_remaining_usd: Math.max(0, currentRemaining - costUsd), // Floor at 0
    })
    .eq('id', data.id);
}

/**
 * Create Stripe checkout session for credit top-up
 *
 * Supports preset amounts of $5, $10, $25, $50
 * Links Stripe customer ID to Supabase user ID
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<CheckoutSession> {
  const { userId, amountUsd, successUrl, cancelUrl, supabase } = params;

  // Validate amount is one of the preset values
  const PRESET_AMOUNTS = [5, 10, 25, 50];
  if (!PRESET_AMOUNTS.includes(amountUsd)) {
    throw new Error(
      `Invalid amount: ${amountUsd}. Must be one of: ${PRESET_AMOUNTS.join(', ')}`
    );
  }

  // Initialize Stripe
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable not set');
  }
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-01-28.clover',
  });

  // Get user's email from Supabase auth
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('User not authenticated');
  }

  const userEmail = userData.user.email;

  // Check if user already has a Stripe customer ID
  const { data: existingCustomer } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .maybeSingle();

  let customerId = existingCustomer?.stripe_customer_id;

  // Create Stripe customer if doesn't exist
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        supabase_user_id: userId,
      },
    });
    customerId = customer.id;

    // Store Stripe customer ID in Supabase (if users table exists)
    // This is fire-and-forget - if it fails, we'll create a new customer next time
    void Promise.resolve(
      supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
    )
      .then(() => {})
      .catch((err: unknown) => console.warn('Failed to store Stripe customer ID:', err));
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `AI Credits - $${amountUsd}`,
            description: `Add $${amountUsd} to your AI credit balance`,
          },
          unit_amount: amountUsd * 100, // Convert to cents
        },
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      supabase_user_id: userId,
      credit_amount_usd: amountUsd.toString(),
    },
  });

  return {
    sessionId: session.id,
    url: session.url || '',
    customerId,
  };
}
