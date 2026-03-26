import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  const { accountId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', _request.url));
  }

  // Verify the account belongs to the current user before deactivating
  const { data: account } = await supabase
    .from('distribution_accounts')
    .select('id, user_id')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single();

  if (!account) {
    return NextResponse.redirect(
      new URL('/accounts?error=Account not found', _request.url),
    );
  }

  const { error } = await supabase
    .from('distribution_accounts')
    .update({ is_active: false })
    .eq('id', accountId)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.redirect(
      new URL('/accounts?error=Failed to disconnect account', _request.url),
    );
  }

  return NextResponse.redirect(
    new URL('/accounts?disconnected=true', _request.url),
  );
}
