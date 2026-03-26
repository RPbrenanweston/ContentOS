import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// GET /api/content/[id]/segments — list segments for a content node
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

  // Verify ownership via content_nodes join
  const { data: node, error: nodeError } = await supabase
    .from('content_nodes')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (nodeError || !node) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('content_segments')
    .select('*')
    .eq('content_node_id', id)
    .order('start_seconds', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST /api/content/[id]/segments — create a manual segment
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

  const { data: node, error: nodeError } = await supabase
    .from('content_nodes')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (nodeError || !node) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const { segment_type, body: segmentBody, title, start_seconds, end_seconds } = body;

  if (!segment_type || !segmentBody) {
    return NextResponse.json({ error: 'segment_type and body are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('content_segments')
    .insert({
      content_node_id: id,
      segment_type,
      body: segmentBody,
      title: title ?? null,
      start_seconds: start_seconds ?? null,
      end_seconds: end_seconds ?? null,
      is_manual: true,
      is_approved: false,
      metadata: {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
