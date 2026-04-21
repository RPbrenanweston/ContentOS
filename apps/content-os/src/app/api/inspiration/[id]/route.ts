/**
 * GET / PATCH / DELETE /api/inspiration/[id]
 *
 * GET returns the item plus its ordered highlights.
 * PATCH updates a whitelisted field set (camelCase → snake_case).
 * DELETE soft-deletes via archived_at; pass ?hard=true for a real delete.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateInspirationSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: item, error: itemErr } = await supabase
    .from('inspiration_items')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (itemErr) {
    const status = itemErr.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: itemErr.message }, { status });
  }

  const { data: highlights, error: hErr } = await supabase
    .from('inspiration_highlights')
    .select('*')
    .eq('inspiration_item_id', id)
    .eq('user_id', user.id)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (hErr) {
    return NextResponse.json({ error: hErr.message }, { status: 500 });
  }

  return NextResponse.json({
    data: { ...item, highlights: highlights ?? [] },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = updateInspirationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  if ('title' in parsed.data) updates.title = parsed.data.title;
  if ('userRating' in parsed.data) updates.user_rating = parsed.data.userRating;
  if ('tags' in parsed.data) updates.tags = parsed.data.tags;
  if ('archivedAt' in parsed.data) updates.archived_at = parsed.data.archivedAt;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('inspiration_items')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const hard = searchParams.get('hard') === 'true';

  if (hard) {
    const { error } = await supabase
      .from('inspiration_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return new NextResponse(null, { status: 204 });
  }

  const { error } = await supabase
    .from('inspiration_items')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
