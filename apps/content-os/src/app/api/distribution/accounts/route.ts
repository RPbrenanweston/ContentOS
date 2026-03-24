// @crumb distribution-accounts-crud
// API | route-handler | platform-account-management
// why: Manage OAuth-connected social media accounts; GET lists user's accounts, POST creates new connection with validation
// in:[POST-body: platform|accountName|externalAccountId|metadata] out:[Account|Account[]] err:[validation-error, account-exists, create-failed]
// hazard: userId hardcoded as TODO with fallback UUID; GET/POST both accept body.userId without auth validation allowing account hijacking
// hazard: Platform enum validation missing; accepts any string as platform without checking against valid adapter list (x, linkedin, etc.)
// hazard: No account uniqueness check (platform + externalAccountId); could create duplicate connections to same external account
// hazard: POST metadata field accepts arbitrary JSON without validation; could inject malformed data that breaks adapter initialization
// hazard: No auth header checks; any client can create accounts for any userId by spoofing body.userId
// edge:../../../infrastructure/distribution/platforms/platform-adapter.ts -> REFERENCES
// edge:../../../infrastructure/supabase/repositories/account.repo.ts -> MUTATES
// edge:../jobs/route.ts -> READS-ACCOUNTS
// prompt: Replace TODO userId with auth extraction; validate platform against adapter registry; check for duplicate connections before create; validate metadata schema; add auth middleware checks
//
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
