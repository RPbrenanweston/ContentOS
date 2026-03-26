import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateFeed } from '@/lib/podcast/feed-generator';
import type { PodcastShow, ContentNode } from '@/domain';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ showSlug: string }> },
) {
  const { showSlug } = await params;
  const supabase = await createClient();

  // 1. Look up show by slug (public — no auth required)
  const { data: show, error: showError } = await supabase
    .from('podcast_shows')
    .select('*')
    .eq('slug', showSlug)
    .maybeSingle();

  if (showError || !show) {
    return new Response('Feed not found', { status: 404 });
  }

  // 2. Fetch published episodes with audio
  const { data: episodes, error: epError } = await supabase
    .from('content_nodes')
    .select('*')
    .eq('show_id', show.id)
    .eq('content_type', 'podcast_episode')
    .in('status', ['ready', 'published'])
    .not('media_url', 'is', null)
    .order('episode_number', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(300);

  if (epError) {
    return new Response('Feed generation error', { status: 500 });
  }

  // 3. Determine base URL from request or env
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? `${_req.nextUrl.protocol}//${_req.nextUrl.host}`;

  // 4. Generate RSS XML
  const xml = generateFeed({
    show: show as PodcastShow,
    episodes: (episodes ?? []) as ContentNode[],
    baseUrl: baseUrl.replace(/\/$/, ''),
  });

  // 5. Return with proper headers
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
