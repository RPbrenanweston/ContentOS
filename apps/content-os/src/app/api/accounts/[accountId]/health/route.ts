import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/accounts/[accountId]/health
 *
 * Returns health info for a connected distribution account.
 * Requires authenticated user who owns the account.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> },
) {
  const { accountId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: account, error } = await supabase
    .from('distribution_accounts')
    .select(
      'consecutive_failures, last_success_at, last_failure_at, last_error_message',
    )
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single()

  if (error || !account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  return NextResponse.json({
    consecutiveFailures: account.consecutive_failures ?? 0,
    lastSuccessAt: account.last_success_at ?? null,
    lastFailureAt: account.last_failure_at ?? null,
    lastErrorMessage: account.last_error_message ?? null,
  })
}
