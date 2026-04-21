/**
 * GET /api/inspiration — list current user's inspiration items
 *
 * Supports filters: sourceType, tag, rating, free-text search (q),
 * captured-after cursor, pagination. By default archived items are hidden;
 * pass ?includeArchived=true to include them.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listInspirationSchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = listInspirationSchema.safeParse({
    sourceType: searchParams.get('sourceType') ?? undefined,
    tag: searchParams.get('tag') ?? undefined,
    rating: searchParams.get('rating') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    after: searchParams.get('after') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { sourceType, tag, rating, q, after, page, limit } = parsed.data;
  const includeArchived = searchParams.get('includeArchived') === 'true';

  const from = (page - 1) * limit;
  const to = page * limit - 1;

  let query = supabase
    .from('inspiration_items')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('captured_at', { ascending: false })
    .range(from, to);

  if (!includeArchived) {
    query = query.is('archived_at', null);
  }

  if (sourceType) query = query.eq('source_type', sourceType);
  if (tag) query = query.contains('tags', [tag]);
  if (typeof rating === 'number') query = query.eq('user_rating', rating);
  if (after) query = query.gte('captured_at', after);
  if (q && q.trim().length > 0) {
    // Escape commas/parens that would break the PostgREST or() grammar
    const safe = q.replace(/[,()]/g, ' ').trim();
    query = query.or(`title.ilike.%${safe}%,body_markdown.ilike.%${safe}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    meta: { total: count ?? 0, page, pageSize: limit },
  });
}
