import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/podcast/shows — list podcast shows for current user
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('podcast_shows')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST /api/podcast/shows — create a new podcast show
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
  const {
    title,
    description,
    author,
    owner_name,
    owner_email,
    language,
    category,
    artwork_url,
    explicit,
  } = body;

  // Validate required fields
  if (!title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  if (!description?.trim()) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 });
  }
  if (!author?.trim()) {
    return NextResponse.json({ error: 'author is required' }, { status: 400 });
  }
  if (!owner_name?.trim()) {
    return NextResponse.json({ error: 'owner_name is required' }, { status: 400 });
  }
  if (!owner_email?.trim()) {
    return NextResponse.json({ error: 'owner_email is required' }, { status: 400 });
  }
  if (!language?.trim()) {
    return NextResponse.json({ error: 'language is required' }, { status: 400 });
  }
  if (!category?.trim()) {
    return NextResponse.json({ error: 'category is required' }, { status: 400 });
  }

  // Generate slug from title
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 100);

  // Ensure slug uniqueness by appending timestamp if needed
  const { data: existing } = await supabase
    .from('podcast_shows')
    .select('id')
    .eq('slug', baseSlug)
    .eq('user_id', user.id)
    .maybeSingle();

  const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;

  const { data, error } = await supabase
    .from('podcast_shows')
    .insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      author: author.trim(),
      owner_name: owner_name.trim(),
      owner_email: owner_email.trim(),
      language: language.trim(),
      category: category.trim(),
      artwork_url: artwork_url?.trim() ?? '',
      explicit: explicit ?? false,
      slug,
      show_type: 'episodic',
      accent_color: '#CBFF53',
      metadata: {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
