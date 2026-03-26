import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ContentType, ContentStatus } from '@/domain';

// GET /api/content — list content nodes
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
  const status = searchParams.get('status') as ContentStatus | null;
  const type = searchParams.get('type') as ContentType | null;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));

  let query = supabase
    .from('content_nodes')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status) query = query.eq('status', status);
  if (type) query = query.eq('content_type', type);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    meta: { total: count ?? 0, page, pageSize },
  });
}

// POST /api/content — create content node
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { title, content_type, description, body: contentBody, tags, show_id } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  if (!content_type) {
    return NextResponse.json({ error: 'content_type is required' }, { status: 400 });
  }

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 100);

  const { data, error } = await supabase
    .from('content_nodes')
    .insert({
      user_id: user.id,
      title: title.trim(),
      content_type,
      status: 'draft',
      description: description ?? null,
      body: contentBody ?? null,
      tags: tags ?? [],
      show_id: show_id ?? null,
      slug,
      metadata: {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
