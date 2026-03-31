import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { publish } from '@/lib/distribution/publisher';
import type { PublishRequest } from '@/lib/distribution/publisher';
import type { UniversalMedia } from '@/lib/platforms/types';
import { InactiveAccountError } from '@/lib/errors';

// ─── Request Body Schema ────────────────────────────────

interface PublishRequestBody {
  contentNodeId?: string;
  derivedAssetId?: string;
  accountIds: string[];
  text: string;
  media?: Array<{
    type: 'image' | 'video';
    source: { kind: 'storage'; storagePath: string } | { kind: 'url'; url: string };
    altText?: string;
  }>;
  scheduledAt?: string;
}

// ─── POST /api/distribution/publish ─────────────────────

export async function POST(request: Request) {
  // 1. Authenticate user
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  // 2. Parse and validate request body
  let body: PublishRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  if (!body.accountIds || body.accountIds.length === 0) {
    return NextResponse.json(
      { error: 'accountIds must be a non-empty array' },
      { status: 400 },
    );
  }

  if (!body.text || body.text.trim().length === 0) {
    return NextResponse.json(
      { error: 'text must be a non-empty string' },
      { status: 400 },
    );
  }

  // 3. Verify all accountIds belong to this user
  const adminClient = createServiceClient();
  const { data: ownedAccounts, error: ownershipError } = await adminClient
    .from('distribution_accounts')
    .select('id')
    .eq('user_id', user.id)
    .in('id', body.accountIds);

  if (ownershipError) {
    return NextResponse.json(
      { error: 'Failed to verify account ownership' },
      { status: 500 },
    );
  }

  const ownedIds = new Set((ownedAccounts ?? []).map((a) => a.id as string));
  const unauthorizedIds = body.accountIds.filter((id) => !ownedIds.has(id));

  if (unauthorizedIds.length > 0) {
    return NextResponse.json(
      {
        error: `Accounts not found or not owned by you: ${unauthorizedIds.join(', ')}`,
      },
      { status: 403 },
    );
  }

  // 4. Build publish request
  const media: UniversalMedia[] | undefined = body.media?.map((m) => ({
    type: m.type,
    source: m.source,
    altText: m.altText,
  }));

  const publishRequest: PublishRequest = {
    contentNodeId: body.contentNodeId,
    derivedAssetId: body.derivedAssetId,
    targets: body.accountIds.map((accountId) => ({
      accountId,
      scheduledAt: body.scheduledAt,
    })),
    text: body.text,
    media,
  };

  // 5. Execute fan-out publish
  let response;
  try {
    response = await publish(publishRequest, user.id);
  } catch (err) {
    if (err instanceof InactiveAccountError) {
      return NextResponse.json(
        { error: 'Account is inactive. Please reconnect this channel before publishing.' },
        { status: 422 },
      );
    }
    throw err;
  }

  // 6. Build IETF rate limit headers
  const rateLimitLimit = 100;
  const rateLimitRemaining = Math.max(0, rateLimitLimit - response.results.length);
  const rateLimitReset = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'RateLimit-Limit': String(rateLimitLimit),
      'RateLimit-Remaining': String(rateLimitRemaining),
      'RateLimit-Reset': String(rateLimitReset),
    },
  });
}
