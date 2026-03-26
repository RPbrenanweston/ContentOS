import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { MediaJobType } from '@/domain';

type Params = { params: Promise<{ id: string }> };

// POST /api/content/[id]/process — trigger a media processing job
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
    .select('id, media_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (nodeError || !node) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!node.media_url) {
    return NextResponse.json({ error: 'Content node has no media_url' }, { status: 422 });
  }

  const body = await req.json();
  const { job_type, params: jobParams } = body as {
    job_type: MediaJobType;
    params?: Record<string, unknown>;
  };

  const validJobTypes: MediaJobType[] = [
    'normalize', 'trim', 'add_intro_outro', 'extract_clip',
    'generate_waveform', 'transcribe', 'extract_chapters',
    'generate_audiogram', 'convert_format',
  ];

  if (!validJobTypes.includes(job_type)) {
    return NextResponse.json(
      { error: `Invalid job_type. Must be one of: ${validJobTypes.join(', ')}` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('media_processing_jobs')
    .insert({
      user_id: user.id,
      content_node_id: id,
      job_type,
      input_url: node.media_url,
      params: jobParams ?? {},
      status: 'pending',
      progress: 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update content node status to processing
  await supabase
    .from('content_nodes')
    .update({ status: 'processing' })
    .eq('id', id);

  return NextResponse.json({ data }, { status: 201 });
}
