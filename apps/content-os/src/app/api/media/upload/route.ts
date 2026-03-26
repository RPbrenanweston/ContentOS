import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/media/upload — generate a Supabase Storage signed upload URL
// NOTE: The 'podcast-audio' bucket must be created manually in the Supabase dashboard.
//   1. Go to Supabase Dashboard > Storage
//   2. Create bucket named 'podcast-audio'
//   3. Set it as a public bucket (so media_url is publicly accessible)
//   4. Add policy: allow authenticated users to upload to their own paths
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
  const { filename, contentType, showId } = body;

  if (!filename || !contentType) {
    return NextResponse.json(
      { error: 'filename and contentType are required' },
      { status: 400 },
    );
  }

  // Sanitize filename
  const sanitized = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 200);

  const storagePath = `podcasts/${showId ?? 'uploads'}/${Date.now()}-${sanitized}`;

  const { data, error } = await supabase.storage
    .from('podcast-audio')
    .createSignedUploadUrl(storagePath);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build the public URL for later use
  const { data: publicUrlData } = supabase.storage
    .from('podcast-audio')
    .getPublicUrl(storagePath);

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    token: data.token,
    storagePath,
    publicUrl: publicUrlData.publicUrl,
  });
}
