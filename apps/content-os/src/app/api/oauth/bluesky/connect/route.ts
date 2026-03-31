import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { DistributionAccountRepo } from '@/infrastructure/supabase/repositories/distribution-account.repo';
import { encryptToken } from '@/lib/token-encryption';

interface CreateSessionResponse {
  did: string;
  handle: string;
  displayName?: string;
  accessJwt: string;
  refreshJwt: string;
}

export async function POST(request: Request) {
  try {
    // 1. Parse body
    const body = await request.json();
    const { identifier, appPassword } = body as {
      identifier?: string;
      appPassword?: string;
    };

    if (!identifier || !appPassword) {
      return NextResponse.json(
        { error: 'Handle and app password are required' },
        { status: 400 },
      );
    }

    // 2. Authenticate user via Supabase session
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Validate credentials via AT Protocol createSession
    const atResponse = await fetch(
      'https://bsky.social/xrpc/com.atproto.server.createSession',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          password: appPassword,
        }),
      },
    );

    if (!atResponse.ok) {
      return NextResponse.json(
        { error: 'Invalid handle or app password' },
        { status: 401 },
      );
    }

    const session: CreateSessionResponse = await atResponse.json();

    // 4. Store the account
    const serviceClient = createServiceClient();
    const accountRepo = new DistributionAccountRepo(serviceClient);

    await accountRepo.create({
      userId: user.id,
      platform: 'bluesky',
      accountName: session.displayName || session.handle,
      externalAccountId: session.did,
      metadata: {
        identifier: session.handle,
        app_password: encryptToken(appPassword),
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Bluesky connect error:', error);
    return NextResponse.json(
      { error: 'Failed to connect Bluesky account' },
      { status: 500 },
    );
  }
}
