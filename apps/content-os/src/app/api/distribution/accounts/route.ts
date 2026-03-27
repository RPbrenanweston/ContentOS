// @crumb distribution-accounts-crud
// API | route-handler | platform-account-management
// why: Manage OAuth-connected social media accounts; GET lists user's accounts, POST creates new connection with validation
// in:[POST-body: platform|accountName|externalAccountId|metadata] out:[Account|Account[]] err:[validation-error, account-exists, create-failed]
// hazard: Platform enum validation missing; accepts any string as platform without checking against valid adapter list (x, linkedin, etc.)
// hazard: No account uniqueness check (platform + externalAccountId); could create duplicate connections to same external account
// hazard: POST metadata field accepts arbitrary JSON without validation; could inject malformed data that breaks adapter initialization
// edge:../../../infrastructure/distribution/platforms/platform-adapter.ts -> REFERENCES
// edge:../../../infrastructure/supabase/repositories/account.repo.ts -> MUTATES
// edge:../jobs/route.ts -> READS-ACCOUNTS
// prompt: Validate platform against adapter registry; check for duplicate connections before create; validate metadata schema
//
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';

const createAccountSchema = z.object({
  platform: z.enum(['linkedin', 'twitter', 'bluesky', 'threads']),
  accountName: z.string().min(1),
  externalAccountId: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

// GET /api/distribution/accounts — List connected accounts
export const GET = withApiHandler(async (ctx) => {
  const { userId } = ctx;

  const supabase = createServiceClient();
  const { accountRepo } = getServices(supabase);

  const accounts = await accountRepo.findByUserId(userId);
  return NextResponse.json({ accounts });
});

// POST /api/distribution/accounts — Connect a new account
export const POST = withApiHandler<z.infer<typeof createAccountSchema>>(async (ctx) => {
  const { userId, body } = ctx;

  const supabase = createServiceClient();
  const { accountRepo } = getServices(supabase);

  const account = await accountRepo.create({
    userId,
    platform: body.platform,
    accountName: body.accountName,
    externalAccountId: body.externalAccountId,
    metadata: body.metadata,
  });

  return NextResponse.json(account, { status: 201 });
}, { schema: createAccountSchema });
