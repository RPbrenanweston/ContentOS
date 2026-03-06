/**
 * @crumb
 * @id sal-billing-credits
 * @intent Gate every LLM call behind credit and spending-cap checks to prevent unbilled usage and budget overruns
 * @responsibilities Credit balance resolution (user + org), spending cap enforcement, credit deduction, Stripe checkout session creation, webhook handling
 * @contracts checkCredits(supabase, userId, cost) => void | throws InsufficientCreditsError; checkSpendingCap(supabase, userId, cost) => void | throws SpendingCapExceededError; deductCredits(supabase, userId, cost) => Promise<void>; createCheckoutSession(params) => Promise<CheckoutSession>; handleStripeWebhook(event) => Promise<void>
 * @hazards Org-level balance check uses lower-of user/admin caps — cap misconfiguration silently blocks all org users; Stripe webhook idempotency relies on event.id dedup — replay attacks possible if dedup window expires
 * @area SEC
 * @refs packages/ai-core/src/client.ts, packages/ai-core/src/usage.ts, packages/ai-core/src/types.ts, packages/ai-core/src/errors.ts
 * @trail chat-flow#3 | Pre-check credits and spending caps before provider API call executes
 * @trail chat-flow#7 | Post-deduct credits after usage is logged — fire-and-forget from client orchestrator
 * @trail billing-flow#1 | Calculate cost and deduct credits after successful LLM response
 * @dependencies @supabase/supabase-js, stripe
 * @prompt When modifying cap logic, test both org-admin and org-member paths — they use different cap resolution strategies
 */

/**
 * Billing and credit management
 * Supports both user-level and org-level credit balances
 */

import { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { CreditBalance, CreateCheckoutSessionParams, CheckoutSession } from './types';
import { InsufficientCreditsError, SpendingCapExceededError } from './errors';

/**
 * Safely parse a float value, throwing if NaN
 */
function safeParseFloat(value: string | number, fieldName: string): number {
  const parsed = parseFloat(String(value));
  if (isNaN(parsed)) {
    throw new Error(`Invalid numeric value for ${fieldName}: "${value}"`);
  }
  return parsed;
}

/**
 * Query the active balance row for a user or org in the current billing period.
 * Returns the raw database row or null if no active balance exists.
 */
async function getActiveBalance(
  supabase: SupabaseClient,
  identity: { userId: string } | { orgId: string },
): Promise<any | null> {
  const now = new Date();
  let query = supabase.from('ai_credit_balances').select('*');

  if ('orgId' in identity) {
    query = query.eq('org_id', identity.orgId).is('user_id', null);
  } else {
    query = query.eq('user_id', identity.userId).is('org_id', null);
  }

  const { data, error } = await query
    .lte('period_start', now.toISOString())
    .gt('period_end', now.toISOString())
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Org-Level Billing Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get user's org ID if they belong to an organization
 *
 * @returns orgId if user is org member, null otherwise
 *
 * Note: If org_members table doesn't exist (org feature not enabled),
 * this gracefully returns null.
 */
export async function getUserOrgId(
  userId: string,
  supabase: SupabaseClient,
): Promise<string | null> {
  try {
    // Query org_members table to find user's organization
    const { data, error } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.org_id;
  } catch (err) {
    // If org_members table doesn't exist or query fails, treat as non-org user
    return null;
  }
}

/**
 * Get org-level credit balance for shared credit pool
 */
export async function getOrgBalance(
  orgId: string,
  supabase: SupabaseClient,
): Promise<CreditBalance> {
  const data = await getActiveBalance(supabase, { orgId });

  if (!data) {
    const now = new Date();
    return {
      remainingUsd: 0,
      usedUsd: 0,
      periodStart: now.toISOString(),
      periodEnd: now.toISOString(),
    };
  }

  return {
    remainingUsd: safeParseFloat(data.credits_remaining_usd, 'credits_remaining_usd'),
    usedUsd: safeParseFloat(data.credits_used_usd, 'credits_used_usd'),
    periodStart: data.period_start,
    periodEnd: data.period_end,
    spendingCapUsd: data.admin_cap_usd
      ? safeParseFloat(data.admin_cap_usd, 'admin_cap_usd')
      : undefined,
    orgId: data.org_id,
  };
}

/**
 * Get remaining credits for current period
 *
 * Checks org membership first. If user belongs to org with shared credit pool,
 * returns org-level balance. Otherwise returns user-level balance.
 */
export async function getRemainingCredits(
  userId: string,
  supabase: SupabaseClient,
): Promise<CreditBalance> {
  // Check if user belongs to an organization
  const orgId = await getUserOrgId(userId, supabase);

  // If user is org member, return org-level balance
  if (orgId) {
    return getOrgBalance(orgId, supabase);
  }

  // Otherwise, return user-level balance
  const data = await getActiveBalance(supabase, { userId });

  if (!data) {
    const now = new Date();
    return {
      remainingUsd: 0,
      usedUsd: 0,
      periodStart: now.toISOString(),
      periodEnd: now.toISOString(),
    };
  }

  return {
    remainingUsd: safeParseFloat(data.credits_remaining_usd, 'credits_remaining_usd'),
    usedUsd: safeParseFloat(data.credits_used_usd, 'credits_used_usd'),
    periodStart: data.period_start,
    periodEnd: data.period_end,
    spendingCapUsd: data.spending_cap_usd
      ? safeParseFloat(data.spending_cap_usd, 'spending_cap_usd')
      : undefined,
  };
}

/**
 * Check if sufficient credits available
 */
export async function checkCredits(
  userId: string,
  estimatedCostUsd: number,
  supabase: SupabaseClient,
): Promise<boolean> {
  const balance = await getRemainingCredits(userId, supabase);
  if (balance.remainingUsd < estimatedCostUsd) {
    throw new InsufficientCreditsError(
      `Insufficient credits: ${balance.remainingUsd.toFixed(4)} remaining, ${estimatedCostUsd.toFixed(4)} required`,
    );
  }
  return true;
}

/**
 * Check spending caps before making a call
 *
 * For org members: enforces org-level admin cap (user caps ignored)
 * For individual users: enforces both user and admin caps (lower wins)
 *
 * @throws SpendingCapExceededError if spending cap would be exceeded
 */
export async function checkSpendingCap(
  userId: string,
  estimatedCostUsd: number,
  supabase: SupabaseClient,
): Promise<void> {
  // Check if user belongs to org
  const orgId = await getUserOrgId(userId, supabase);
  const isOrgBalance = !!orgId;

  const balanceData = await getActiveBalance(supabase, orgId ? { orgId } : { userId });

  if (!balanceData) {
    return; // No balance configured
  }

  const currentUsed = safeParseFloat(balanceData.credits_used_usd || '0', 'credits_used_usd');
  const userCap = balanceData.spending_cap_usd
    ? safeParseFloat(balanceData.spending_cap_usd, 'spending_cap_usd')
    : null;
  const adminCap = balanceData.admin_cap_usd
    ? safeParseFloat(balanceData.admin_cap_usd, 'admin_cap_usd')
    : null;

  let effectiveCap: number | null = null;

  if (isOrgBalance) {
    // Org members: only admin cap applies (user caps ignored)
    effectiveCap = adminCap;
  } else {
    // Individual users: lower of user cap and admin cap
    if (userCap !== null && adminCap !== null) {
      effectiveCap = Math.min(userCap, adminCap);
    } else if (userCap !== null) {
      effectiveCap = userCap;
    } else if (adminCap !== null) {
      effectiveCap = adminCap;
    }
  }

  // If no cap configured, allow the call
  if (effectiveCap === null) {
    return;
  }

  // Check if this call would exceed the effective cap
  const projectedUsed = currentUsed + estimatedCostUsd;

  if (projectedUsed > effectiveCap) {
    const capType = isOrgBalance ? 'Org admin cap' : 'Spending cap';

    throw new SpendingCapExceededError(
      `${capType} exceeded: ${currentUsed.toFixed(4)} used + ${estimatedCostUsd.toFixed(4)} estimated = ${projectedUsed.toFixed(4)}, cap is ${effectiveCap.toFixed(4)}`,
    );
  }
}

/**
 * Deduct credits after a successful call
 *
 * For org members: deducts from org-level shared pool
 * For individual users: deducts from user-level balance
 *
 * Updates both credits_used_usd (increment) and credits_remaining_usd (decrement)
 */
export async function deductCredits(
  userId: string,
  costUsd: number,
  supabase: SupabaseClient,
): Promise<void> {
  // Check if user belongs to org
  const orgId = await getUserOrgId(userId, supabase);

  const balanceData = await getActiveBalance(supabase, orgId ? { orgId } : { userId });

  if (!balanceData) {
    return; // No balance to deduct from
  }

  const currentUsed = safeParseFloat(balanceData.credits_used_usd || '0', 'credits_used_usd');
  const currentRemaining = safeParseFloat(
    balanceData.credits_remaining_usd || '0',
    'credits_remaining_usd',
  );

  // Update the balance row
  await supabase
    .from('ai_credit_balances')
    .update({
      credits_used_usd: currentUsed + costUsd,
      credits_remaining_usd: Math.max(0, currentRemaining - costUsd), // Floor at 0
    })
    .eq('id', balanceData.id);
}

/**
 * Create Stripe checkout session for credit top-up
 *
 * Supports preset amounts of $5, $10, $25, $50
 * Links Stripe customer ID to Supabase user ID
 * Optional orgId parameter for org-level credit purchases
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams,
): Promise<CheckoutSession> {
  const { userId, amountUsd, successUrl, cancelUrl, supabase, orgId } = params;

  // Validate amount is one of the preset values
  const PRESET_AMOUNTS = [5, 10, 25, 50];
  if (!PRESET_AMOUNTS.includes(amountUsd)) {
    throw new Error(`Invalid amount: ${amountUsd}. Must be one of: ${PRESET_AMOUNTS.join(', ')}`);
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
      supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', userId),
    )
      .then(() => {})
      .catch((err: unknown) => console.warn('Failed to store Stripe customer ID:', err));
  }

  // Create checkout session
  const metadata: Record<string, string> = {
    supabase_user_id: userId,
    credit_amount_usd: amountUsd.toString(),
  };

  // Add org_id to metadata if this is org-level purchase
  if (orgId) {
    metadata.org_id = orgId;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: orgId ? `Org AI Credits - $${amountUsd}` : `AI Credits - $${amountUsd}`,
            description: orgId
              ? `Add $${amountUsd} to organization AI credit balance`
              : `Add $${amountUsd} to your AI credit balance`,
          },
          unit_amount: amountUsd * 100, // Convert to cents
        },
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata,
  });

  return {
    sessionId: session.id,
    url: session.url || '',
    customerId,
  };
}

/**
 * Handle Stripe webhook events
 *
 * Verifies signature, processes checkout.session.completed events,
 * and credits user's ai_credit_balances with idempotency protection.
 *
 * @param rawBody - Raw request body (required for signature verification)
 * @param signature - Stripe signature header value
 * @param supabase - Supabase client for database operations
 * @returns Status code and message
 */
export async function handleStripeWebhook(
  rawBody: string | Buffer,
  signature: string,
  supabase: SupabaseClient,
): Promise<{ status: number; message: string }> {
  // Initialize Stripe
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable not set');
  }

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable not set');
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-01-28.clover',
  });

  // Verify webhook signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return {
      status: 400,
      message: `Webhook signature verification failed: ${errorMessage}`,
    };
  }

  // Handle checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Extract metadata
    const userId = session.metadata?.supabase_user_id;
    const creditAmountStr = session.metadata?.credit_amount_usd;
    const orgId = session.metadata?.org_id; // Optional: for org-level purchases

    if (!userId || !creditAmountStr) {
      return {
        status: 400,
        message: 'Missing required metadata: supabase_user_id or credit_amount_usd',
      };
    }

    const creditAmount = safeParseFloat(creditAmountStr, 'credit_amount_usd');

    // Idempotency: check if this session has already been processed
    const { data: existingLog } = await supabase
      .from('stripe_payment_logs')
      .select('id')
      .eq('session_id', session.id)
      .maybeSingle();

    if (existingLog) {
      // Already processed - return success to acknowledge webhook
      return {
        status: 200,
        message: 'Webhook already processed (idempotent)',
      };
    }

    // Credit user's balance
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    // Get or create balance row for current period
    // If orgId is present, credit the org balance; otherwise credit user balance
    const balanceRow = await getActiveBalance(supabase, orgId ? { orgId } : { userId });

    if (balanceRow) {
      // Update existing balance
      const currentRemaining = safeParseFloat(
        balanceRow.credits_remaining_usd || '0',
        'credits_remaining_usd',
      );
      await supabase
        .from('ai_credit_balances')
        .update({
          credits_remaining_usd: currentRemaining + creditAmount,
        })
        .eq('id', balanceRow.id);
    } else {
      // Create new balance row for current period
      const insertData: Record<string, unknown> = {
        period_start: periodStart,
        period_end: periodEnd,
        credits_remaining_usd: creditAmount,
        credits_used_usd: 0,
      };

      if (orgId) {
        insertData.org_id = orgId;
        insertData.user_id = null;
      } else {
        insertData.user_id = userId;
        insertData.org_id = null;
      }

      await supabase.from('ai_credit_balances').insert(insertData);
    }

    // Log payment for idempotency tracking
    await supabase.from('stripe_payment_logs').insert({
      session_id: session.id,
      user_id: userId,
      amount_usd: creditAmount,
      payment_status: session.payment_status,
      created_at: new Date().toISOString(),
    });

    return {
      status: 200,
      message: `Credited ${creditAmount} USD to user ${userId}`,
    };
  }

  // Unknown event type - return 200 to acknowledge receipt
  return {
    status: 200,
    message: `Unhandled event type: ${event.type}`,
  };
}
