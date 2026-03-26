import { createServiceClient } from '@/lib/supabase/admin';
import { getAdapter } from '@/lib/platforms/index';
import { PlatformError } from '@/lib/platforms/types';
import type { UniversalMedia, PlatformMediaRef } from '@/lib/platforms/types';
import type { DistributionAccount } from '@/domain';
import { ensureValidToken, markAccountError, markAccountSuccess } from './token-manager';

// ─── Types ──────────────────────────────────────────────

export interface PublishTarget {
  accountId: string;
  scheduledAt?: string; // ISO timestamp
}

export interface PublishRequest {
  contentNodeId?: string;
  derivedAssetId?: string;
  targets: PublishTarget[];
  text: string;
  media?: UniversalMedia[];
}

export interface PublishResult {
  accountId: string;
  platform: string;
  success: boolean;
  jobId?: string;
  postId?: string;
  postUrl?: string;
  error?: string;
  retryable?: boolean;
}

export interface PublishResponse {
  results: PublishResult[];
  successCount: number;
  failureCount: number;
}

// ─── Constants ──────────────────────────────────────────

const MAX_RETRIES = 3;
const MAX_BACKOFF_MS = 3_600_000; // 1 hour

// ─── Retry Backoff ──────────────────────────────────────

/**
 * Exponential backoff with jitter.
 * Formula: min(1000 * 2^retryCount + jitter, 3600000)
 */
export function getRetryBackoffMs(retryCount: number): number {
  const base = 1000 * Math.pow(2, retryCount);
  const jitter = Math.random() * 1000;
  return Math.min(base + jitter, MAX_BACKOFF_MS);
}

// ─── Publisher ──────────────────────────────────────────

/**
 * Fan-out publisher: publishes one piece of content to multiple platform
 * accounts simultaneously using Promise.allSettled so that a single
 * platform failure never blocks other platforms.
 */
export async function publish(
  request: PublishRequest,
  userId: string,
): Promise<PublishResponse> {
  const supabase = createServiceClient();

  // 1. Load all target accounts and build a lookup map
  const targetAccountIds = request.targets.map((t) => t.accountId);

  const { data: accounts, error: accountsError } = await supabase
    .from('distribution_accounts')
    .select('*')
    .eq('user_id', userId)
    .in('id', targetAccountIds);

  if (accountsError) {
    throw new Error(`Failed to load distribution accounts: ${accountsError.message}`);
  }

  const accountMap = new Map<string, DistributionAccount>();
  for (const account of (accounts ?? []) as DistributionAccount[]) {
    accountMap.set(account.id, account);
  }

  // 2. Build a scheduledAt lookup from targets
  const scheduleMap = new Map<string, string | undefined>();
  for (const target of request.targets) {
    scheduleMap.set(target.accountId, target.scheduledAt);
  }

  // 3. Fan out — one task per target account
  const settled = await Promise.allSettled(
    request.targets.map((target) =>
      publishToAccount(
        supabase,
        request,
        userId,
        target,
        accountMap.get(target.accountId),
      ),
    ),
  );

  // 4. Aggregate results
  const results: PublishResult[] = settled.map((outcome, index) => {
    if (outcome.status === 'fulfilled') {
      return outcome.value;
    }
    // Promise rejected — unexpected crash
    const target = request.targets[index];
    const account = accountMap.get(target.accountId);
    return {
      accountId: target.accountId,
      platform: account?.platform ?? 'unknown',
      success: false,
      error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
      retryable: false,
    };
  });

  return {
    results,
    successCount: results.filter((r) => r.success).length,
    failureCount: results.filter((r) => !r.success).length,
  };
}

// ─── Per-Account Publish Logic ──────────────────────────

async function publishToAccount(
  supabase: ReturnType<typeof createServiceClient>,
  request: PublishRequest,
  userId: string,
  target: PublishTarget,
  account: DistributionAccount | undefined,
): Promise<PublishResult> {
  // Guard: account must exist and be active
  if (!account) {
    return {
      accountId: target.accountId,
      platform: 'unknown',
      success: false,
      error: `Account ${target.accountId} not found or does not belong to this user`,
      retryable: false,
    };
  }

  if (!account.is_active) {
    return {
      accountId: target.accountId,
      platform: account.platform,
      success: false,
      error: `Account ${target.accountId} is inactive. Re-authenticate to reactivate.`,
      retryable: false,
    };
  }

  try {
    // a. Ensure valid token
    const tokenSet = await ensureValidToken(target.accountId);

    // b. Get platform adapter
    const adapter = getAdapter(account.platform);

    // c. Validate post
    const validation = adapter.validatePost({
      text: request.text,
      media: request.media,
    });

    if (!validation.valid) {
      const errorMessages = validation.errors.map((e) => e.message).join('; ');
      return {
        accountId: target.accountId,
        platform: account.platform,
        success: false,
        error: `Validation failed: ${errorMessages}`,
        retryable: false,
      };
    }

    // d. Create distribution_job record
    const now = new Date().toISOString();
    const { data: job, error: jobError } = await supabase
      .from('distribution_jobs')
      .insert({
        user_id: userId,
        account_id: target.accountId,
        content_node_id: request.contentNodeId ?? null,
        derived_asset_id: request.derivedAssetId ?? null,
        status: 'processing',
        content_snapshot: {
          text: request.text,
          mediaCount: request.media?.length ?? 0,
          createdAt: now,
        },
        scheduled_at: target.scheduledAt ?? null,
        retry_count: 0,
        max_retries: MAX_RETRIES,
        metadata: {},
      })
      .select('id')
      .single();

    if (jobError || !job) {
      throw new Error(`Failed to create distribution job: ${jobError?.message ?? 'unknown'}`);
    }

    const jobId = job.id as string;

    // e. If scheduledAt is in the future, mark scheduled and return early
    if (target.scheduledAt) {
      const scheduledTime = new Date(target.scheduledAt).getTime();
      if (scheduledTime > Date.now()) {
        await supabase
          .from('distribution_jobs')
          .update({ status: 'scheduled' })
          .eq('id', jobId);

        return {
          accountId: target.accountId,
          platform: account.platform,
          success: true,
          jobId,
        };
      }
    }

    // f. Upload media if present
    const mediaRefs: PlatformMediaRef[] = [];
    if (request.media && request.media.length > 0) {
      for (const mediaItem of request.media) {
        const ref = await adapter.uploadMedia(mediaItem, tokenSet);
        mediaRefs.push(ref);
      }
    }

    // g. Create the post
    const postResult = await adapter.createPost(
      { text: request.text, media: request.media, visibility: 'public' },
      mediaRefs,
      tokenSet,
    );

    // h. Success — update job and account
    await supabase
      .from('distribution_jobs')
      .update({
        status: 'published',
        platform_post_id: postResult.postId,
        platform_post_url: postResult.url ?? null,
        published_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    await markAccountSuccess(target.accountId);

    return {
      accountId: target.accountId,
      platform: account.platform,
      success: true,
      jobId,
      postId: postResult.postId,
      postUrl: postResult.url,
    };
  } catch (err) {
    // i. Failure handling
    const isPlatformError = err instanceof PlatformError;
    const retryable = isPlatformError ? err.retryable : false;
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Try to update the job if it was created
    // We attempt this best-effort — the job may not exist if creation failed
    try {
      // Find the most recent processing job for this account+user
      const { data: existingJob } = await supabase
        .from('distribution_jobs')
        .select('id, retry_count, max_retries')
        .eq('account_id', target.accountId)
        .eq('user_id', userId)
        .eq('status', 'processing')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingJob) {
        const retryCount = (existingJob.retry_count as number) ?? 0;
        const maxRetries = (existingJob.max_retries as number) ?? MAX_RETRIES;

        if (retryable && retryCount < maxRetries) {
          const backoffMs = getRetryBackoffMs(retryCount);
          const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

          await supabase
            .from('distribution_jobs')
            .update({
              status: 'pending',
              retry_count: retryCount + 1,
              next_retry_at: nextRetryAt,
              error_message: errorMessage,
            })
            .eq('id', existingJob.id);
        } else {
          await supabase
            .from('distribution_jobs')
            .update({
              status: 'failed',
              error_message: errorMessage,
            })
            .eq('id', existingJob.id);
        }
      }
    } catch {
      // Best-effort — job update failure should not mask the original error
    }

    await markAccountError(target.accountId, errorMessage);

    return {
      accountId: target.accountId,
      platform: account?.platform ?? 'unknown',
      success: false,
      error: errorMessage,
      retryable,
    };
  }
}
