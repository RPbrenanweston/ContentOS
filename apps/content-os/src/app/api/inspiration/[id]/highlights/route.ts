/**
 * POST /api/inspiration/[id]/highlights — create a user-authored highlight
 * under an inspiration item the caller owns.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createHighlightSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify parent item belongs to the caller before inserting
  const { data: parent, error: parentErr } = await supabase
    .from('inspiration_items')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (parentErr || !parent) {
    const status = parentErr?.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json(
      { error: parentErr?.message ?? 'Inspiration item not found' },
      { status },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createHighlightSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { highlightType, content, rationale, sourceOffset } = parsed.data;

  const { data, error } = await supabase
    .from('inspiration_highlights')
    .insert({
      inspiration_item_id: id,
      user_id: user.id,
      highlight_type: highlightType,
      content,
      rationale: rationale ?? null,
      source_offset: sourceOffset ?? null,
      user_created: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
