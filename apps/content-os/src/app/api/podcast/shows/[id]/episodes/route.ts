import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/podcast/shows/[id]/episodes — list episodes for a show
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: showId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify the show belongs to this user
  const { data: show, error: showError } = await supabase
    .from('podcast_shows')
    .select('id')
    .eq('id', showId)
    .eq('user_id', user.id)
    .single();

  if (showError || !show) {
    return NextResponse.json({ error: 'Show not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('content_nodes')
    .select('*')
    .eq('show_id', showId)
    .eq('content_type', 'podcast_episode')
    .eq('user_id', user.id)
    .order('episode_number', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST /api/podcast/shows/[id]/episodes — create a new episode
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: showId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify the show belongs to this user
  const { data: show, error: showError } = await supabase
    .from('podcast_shows')
    .select('id')
    .eq('id', showId)
    .eq('user_id', user.id)
    .single();

  if (showError || !show) {
    return NextResponse.json({ error: 'Show not found' }, { status: 404 });
  }

  const body = await req.json();
  const {
    title,
    description,
    episode_number,
    season_number,
    episode_type,
    explicit,
    media_url,
    show_notes,
  } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
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
      content_type: 'podcast_episode' as const,
      status: 'draft' as const,
      title: title.trim(),
      description: description?.trim() ?? null,
      show_id: showId,
      episode_number: episode_number ?? null,
      season_number: season_number ?? null,
      episode_type: episode_type ?? 'full',
      explicit: explicit ?? false,
      media_url: media_url ?? null,
      show_notes: show_notes?.trim() ?? null,
      slug,
      tags: [],
      metadata: {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
