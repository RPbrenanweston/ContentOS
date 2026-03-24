import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';

// GET /api/distribution/accounts — List connected accounts
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { accountRepo } = getServices(supabase);

    // TODO: Extract userId from auth session
    const userId = '00000000-0000-0000-0000-000000000000';
    const accounts = await accountRepo.findByUserId(userId);

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('GET /api/distribution/accounts error:', error);
    return NextResponse.json({ error: 'Failed to list accounts' }, { status: 500 });
  }
}

// POST /api/distribution/accounts — Connect a new account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, accountName, externalAccountId, metadata } = body;

    if (!platform || !accountName || !externalAccountId) {
      return NextResponse.json(
        { error: 'platform, accountName, and externalAccountId are required' },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { accountRepo } = getServices(supabase);

    const userId = body.userId ?? '00000000-0000-0000-0000-000000000000';

    const account = await accountRepo.create({
      userId,
      platform,
      accountName,
      externalAccountId,
      metadata,
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('POST /api/distribution/accounts error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
