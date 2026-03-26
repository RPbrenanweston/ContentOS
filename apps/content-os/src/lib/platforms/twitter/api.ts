import { TWEET_URL, MEDIA_UPLOAD_URL, USERS_ME_URL } from './config';
import type { TokenSet } from '../types';
import { PlatformError } from '../types';

// ─── Shared Helpers ────────────────────────────────────────

function authHeaders(credentials: TokenSet): Record<string, string> {
  return { Authorization: `Bearer ${credentials.accessToken}` };
}

async function handleApiError(
  response: Response,
  code: string,
  context: string,
): Promise<never> {
  const raw = await response.json().catch(() => null);

  // Twitter rate limit: 429 with x-rate-limit-reset header
  const retryAfter = response.headers.get('x-rate-limit-reset');
  const retryAfterMs = retryAfter
    ? Number(retryAfter) * 1000 - Date.now()
    : undefined;

  throw new PlatformError(
    code,
    `${context}: ${response.status} ${response.statusText}`,
    'twitter',
    response.status === 429 || response.status >= 500,
    retryAfterMs && retryAfterMs > 0 ? retryAfterMs : undefined,
    raw,
  );
}

// ─── Tweet Creation ────────────────────────────────────────

export async function createTweet(
  params: { text: string; mediaIds?: string[]; replyToId?: string },
  credentials: TokenSet,
): Promise<{ id: string; text: string }> {
  const body: Record<string, unknown> = { text: params.text };

  if (params.mediaIds?.length) {
    body.media = { media_ids: params.mediaIds };
  }
  if (params.replyToId) {
    body.reply = { in_reply_to_tweet_id: params.replyToId };
  }

  const response = await fetch(TWEET_URL, {
    method: 'POST',
    headers: {
      ...authHeaders(credentials),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return handleApiError(response, 'TWEET_CREATE_FAILED', 'Failed to create tweet');
  }

  const data = await response.json();
  return { id: data.data.id, text: data.data.text };
}

// ─── Tweet Deletion ────────────────────────────────────────

export async function deleteTweet(
  tweetId: string,
  credentials: TokenSet,
): Promise<void> {
  const response = await fetch(`${TWEET_URL}/${tweetId}`, {
    method: 'DELETE',
    headers: authHeaders(credentials),
  });

  if (!response.ok) {
    return handleApiError(response, 'TWEET_DELETE_FAILED', 'Failed to delete tweet');
  }
}

// ─── Chunked Media Upload ──────────────────────────────────

/**
 * INIT: Begin a chunked media upload.
 * Uses OAuth 1.0a-style multipart — but Twitter v1.1 media upload
 * also accepts Bearer tokens for OAuth 2.0 with media.write scope.
 */
export async function uploadMediaInit(
  params: { totalBytes: number; mimeType: string },
  credentials: TokenSet,
): Promise<{ mediaId: string }> {
  const formData = new FormData();
  formData.append('command', 'INIT');
  formData.append('total_bytes', String(params.totalBytes));
  formData.append('media_type', params.mimeType);

  const response = await fetch(MEDIA_UPLOAD_URL, {
    method: 'POST',
    headers: authHeaders(credentials),
    body: formData,
  });

  if (!response.ok) {
    return handleApiError(response, 'MEDIA_INIT_FAILED', 'Media upload INIT failed');
  }

  const data = await response.json();
  return { mediaId: data.media_id_string };
}

/**
 * APPEND: Upload a chunk of media data.
 */
export async function uploadMediaAppend(
  params: { mediaId: string; chunk: Buffer; segmentIndex: number },
  credentials: TokenSet,
): Promise<void> {
  const formData = new FormData();
  formData.append('command', 'APPEND');
  formData.append('media_id', params.mediaId);
  formData.append('segment_index', String(params.segmentIndex));
  formData.append(
    'media_data',
    new Blob([new Uint8Array(params.chunk)]),
    'media',
  );

  const response = await fetch(MEDIA_UPLOAD_URL, {
    method: 'POST',
    headers: authHeaders(credentials),
    body: formData,
  });

  if (!response.ok) {
    return handleApiError(
      response,
      'MEDIA_APPEND_FAILED',
      `Media upload APPEND failed (segment ${params.segmentIndex})`,
    );
  }
}

/**
 * FINALIZE: Complete the upload and begin server-side processing.
 */
export async function uploadMediaFinalize(
  params: { mediaId: string },
  credentials: TokenSet,
): Promise<{
  mediaId: string;
  processingInfo?: { state: string; checkAfterSecs?: number };
}> {
  const formData = new FormData();
  formData.append('command', 'FINALIZE');
  formData.append('media_id', params.mediaId);

  const response = await fetch(MEDIA_UPLOAD_URL, {
    method: 'POST',
    headers: authHeaders(credentials),
    body: formData,
  });

  if (!response.ok) {
    return handleApiError(response, 'MEDIA_FINALIZE_FAILED', 'Media upload FINALIZE failed');
  }

  const data = await response.json();
  return {
    mediaId: data.media_id_string,
    processingInfo: data.processing_info
      ? {
          state: data.processing_info.state,
          checkAfterSecs: data.processing_info.check_after_secs,
        }
      : undefined,
  };
}

/**
 * STATUS: Poll for async media processing progress (video/GIF).
 */
export async function checkMediaStatus(
  mediaId: string,
  credentials: TokenSet,
): Promise<{
  state: 'pending' | 'in_progress' | 'failed' | 'succeeded';
  progressPercent?: number;
}> {
  const url = new URL(MEDIA_UPLOAD_URL);
  url.searchParams.set('command', 'STATUS');
  url.searchParams.set('media_id', mediaId);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: authHeaders(credentials),
  });

  if (!response.ok) {
    return handleApiError(response, 'MEDIA_STATUS_FAILED', 'Media status check failed');
  }

  const data = await response.json();
  return {
    state: data.processing_info?.state ?? 'succeeded',
    progressPercent: data.processing_info?.progress_percent,
  };
}

// ─── User Info ─────────────────────────────────────────────

export async function getUserInfo(
  credentials: TokenSet,
): Promise<{
  id: string;
  username: string;
  name: string;
  profileImageUrl?: string;
}> {
  const url = new URL(USERS_ME_URL);
  url.searchParams.set('user.fields', 'profile_image_url');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: authHeaders(credentials),
  });

  if (!response.ok) {
    return handleApiError(response, 'USER_INFO_FAILED', 'Failed to get user info');
  }

  const data = await response.json();
  return {
    id: data.data.id,
    username: data.data.username,
    name: data.data.name,
    profileImageUrl: data.data.profile_image_url,
  };
}
