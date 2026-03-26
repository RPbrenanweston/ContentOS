import { createServiceClient } from '@/lib/supabase/admin';
import { storeAccountTokens, retrieveAccountTokens } from '@/lib/supabase/tokens';
import { getAdapter } from '@/lib/platforms/index';
import { PlatformError } from '@/lib/platforms/types';
import type { TokenSet } from '@/lib/platforms/types';
import type { PlatformType, DistributionAccount } from '@/domain';

// ─── Constants ──────────────────────────────────────────

/** Refresh tokens that expire within this window (ms) */
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/** After this many consecutive failures, deactivate the account */
const MAX_CONSECUTIVE_FAILURES = 3;

// ─── Token Lifecycle ────────────────────────────────────

/**
 * Ensure the token for a distribution account is valid and not about to expire.
 * If the token expires within 5 minutes, attempts a refresh via the platform adapter.
 * On repeated refresh failures, deactivates the account.
 */
export async function ensureValidToken(accountId: string): Promise<TokenSet> {
  const supabase = createServiceClient();

  // Load account metadata (platform type, active status)
  const { data: account, error: accountError } = await supabase
    .from('distribution_accounts')
    .select('platform, is_active, consecutive_failures')
    .eq('id', accountId)
    .single();

  if (accountError || !account) {
    throw new Error(`Distribution account not found: ${accountId}`);
  }

  if (!account.is_active) {
    throw new PlatformError(
      'ACCOUNT_INACTIVE',
      `Distribution account ${accountId} is inactive. Re-authenticate to reactivate.`,
      account.platform as PlatformType,
      false,
    );
  }

  // Retrieve and decrypt current tokens
  const tokens = await retrieveAccountTokens(accountId);
  if (!tokens) {
    throw new PlatformError(
      'NO_TOKENS',
      `No tokens found for account ${accountId}. User must re-authenticate.`,
      account.platform as PlatformType,
      false,
    );
  }

  // Check if token needs refresh (expires within threshold)
  const now = Date.now();
  const expiresAt = tokens.expiresAt;
  const needsRefresh = expiresAt > 0 && expiresAt - now < TOKEN_REFRESH_THRESHOLD_MS;

  if (!needsRefresh) {
    return tokens;
  }

  // Attempt refresh
  if (!tokens.refreshToken) {
    throw new PlatformError(
      'NO_REFRESH_TOKEN',
      `Token expired and no refresh token available for account ${accountId}. User must re-authenticate.`,
      account.platform as PlatformType,
      false,
    );
  }

  try {
    const adapter = getAdapter(account.platform as PlatformType);
    const refreshed = await adapter.refreshTokens(tokens.refreshToken);

    // Persist the new tokens
    await storeAccountTokens({
      accountId,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: Math.floor(refreshed.expiresAt / 1000), // storeAccountTokens expects seconds
      scopes: refreshed.scope ? refreshed.scope.split(' ') : [],
    });

    await markAccountSuccess(accountId);

    return refreshed;
  } catch (refreshError) {
    // Increment failure counter, potentially deactivate
    const errorMessage =
      refreshError instanceof Error ? refreshError.message : String(refreshError);

    await markAccountError(accountId, errorMessage);

    throw new PlatformError(
      'TOKEN_REFRESH_FAILED',
      `Token refresh failed for account ${accountId}: ${errorMessage}`,
      account.platform as PlatformType,
      false,
    );
  }
}

// ─── Account Status Management ──────────────────────────

/**
 * Record an error against a distribution account.
 * Increments consecutive_failures and deactivates after MAX_CONSECUTIVE_FAILURES.
 */
export async function markAccountError(accountId: string, error: string): Promise<void> {
  const supabase = createServiceClient();

  // Read current failure count
  const { data: account } = await supabase
    .from('distribution_accounts')
    .select('consecutive_failures')
    .eq('id', accountId)
    .single();

  const currentFailures = account?.consecutive_failures ?? 0;
  const newFailures = currentFailures + 1;

  const updates: Record<string, unknown> = {
    consecutive_failures: newFailures,
    last_error: error,
  };

  if (newFailures >= MAX_CONSECUTIVE_FAILURES) {
    updates.is_active = false;
  }

  await supabase
    .from('distribution_accounts')
    .update(updates)
    .eq('id', accountId);
}

/**
 * Record a successful operation against a distribution account.
 * Resets the failure counter and updates last_verified_at.
 */
export async function markAccountSuccess(accountId: string): Promise<void> {
  const supabase = createServiceClient();

  await supabase
    .from('distribution_accounts')
    .update({
      consecutive_failures: 0,
      last_verified_at: new Date().toISOString(),
    })
    .eq('id', accountId);
}

// ─── Account Queries ────────────────────────────────────

/**
 * Get all active distribution accounts for a user, optionally filtered by platform.
 * Returns accounts WITHOUT decrypted tokens. Use ensureValidToken() separately
 * when you need credentials for API calls.
 */
export async function getActiveAccounts(
  userId: string,
  platforms?: PlatformType[],
): Promise<DistributionAccount[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from('distribution_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (platforms && platforms.length > 0) {
    query = query.in('platform', platforms);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch active accounts for user ${userId}: ${error.message}`);
  }

  return (data ?? []) as DistributionAccount[];
}
