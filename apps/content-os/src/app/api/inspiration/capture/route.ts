/**
 * POST /api/inspiration/capture — universal ingest endpoint
 *
 * Accepts URL or free text, dedupes on (user_id, source_url_normalized),
 * responds 201 immediately, then runs fetch + decomposition in the background
 * via `after()` so the client never waits on network-bound work.
 */

import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServices } from '@/services/container';
import { captureInspirationSchema } from '@/lib/validation';
import { normalizeUrl } from '@/lib/url-normalize';
import type { InspirationSourceType } from '@/domain';

export function detectSourceTypeFromUrl(url: string): InspirationSourceType {
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return 'article';
  }
  if (host === 'x.com' || host.endsWith('.x.com') || host === 'twitter.com' || host.endsWith('.twitter.com')) {
    return 'tweet';
  }
  if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') {
    return 'youtube';
  }
  if (host.endsWith('.substack.com') || host === 'substack.com') {
    return 'substack';
  }
  if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) {
    return 'linkedin';
  }
  if (url.toLowerCase().endsWith('.pdf')) {
    return 'pdf';
  }
  return 'article';
}

export async function processInspirationCapture(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemId: string,
  url: string | null,
  hintedType: InspirationSourceType,
  textBody: string | null,
): Promise<void> {
  const services = getServices(supabase);
  try {
    let title: string | null = null;
    let author: string | null = null;
    let authorHandle: string | null = null;
    let publishedAt: string | null = null;
    let bodyMarkdown: string | null = textBody;
    let bodyHtml: string | null = null;
    let mediaUrl: string | null = null;
    let raw: Record<string, unknown> | null = null;
    let sourceType: InspirationSourceType = hintedType;

    if (url) {
      // 1. Mark as fetching
      await supabase
        .from('inspiration_items')
        .update({ status: 'fetching' })
        .eq('id', itemId);

      // 2. Fetch external content
      const fetched = await services.inspirationFetchService.fetch(url, hintedType);
      sourceType = fetched.sourceType ?? hintedType;
      title = fetched.title ?? null;
      author = fetched.author ?? null;
      authorHandle = fetched.authorHandle ?? null;
      publishedAt = fetched.publishedAt ? fetched.publishedAt.toISOString() : null;
      bodyMarkdown = fetched.bodyMarkdown ?? null;
      bodyHtml = fetched.bodyHtml ?? null;
      mediaUrl = fetched.mediaUrl ?? null;
      raw = fetched.raw ?? null;
    }

    // 3. Persist fetched fields + flip to processing
    const processingUpdate: Record<string, unknown> = { status: 'processing' };
    if (title !== null) processingUpdate.title = title;
    if (author !== null) processingUpdate.author = author;
    if (authorHandle !== null) processingUpdate.author_handle = authorHandle;
    if (publishedAt !== null) processingUpdate.published_at = publishedAt;
    if (bodyMarkdown !== null) processingUpdate.body_markdown = bodyMarkdown;
    if (bodyHtml !== null) processingUpdate.body_html = bodyHtml;
    if (mediaUrl !== null) processingUpdate.media_url = mediaUrl;
    if (raw !== null) processingUpdate.raw = raw;
    if (url) processingUpdate.source_type = sourceType;

    await supabase
      .from('inspiration_items')
      .update(processingUpdate)
      .eq('id', itemId);

    // 4. Decompose into highlights (requires bodyMarkdown)
    if (!bodyMarkdown || bodyMarkdown.trim().length === 0) {
      await supabase
        .from('inspiration_items')
        .update({ status: 'ready' })
        .eq('id', itemId);
      return;
    }

    // Fetch user_id so we can attribute inserted highlights
    const { data: itemRow, error: itemErr } = await supabase
      .from('inspiration_items')
      .select('user_id, title')
      .eq('id', itemId)
      .single();

    if (itemErr || !itemRow) {
      throw new Error(itemErr?.message ?? 'Item vanished during processing');
    }

    const decomposition = await services.inspirationDecompositionService.decompose({
      id: itemId,
      title: (title ?? itemRow.title) ?? undefined,
      sourceType,
      bodyMarkdown,
    });

    if (decomposition.highlights.length > 0) {
      const rows = decomposition.highlights.map((h) => ({
        inspiration_item_id: itemId,
        user_id: itemRow.user_id,
        highlight_type: h.highlightType,
        content: h.content,
        rationale: h.rationale ?? null,
        source_offset: h.sourceOffset ?? null,
        position: h.position ?? 0,
        user_created: false,
      }));
      const { error: insertErr } = await supabase
        .from('inspiration_highlights')
        .insert(rows);
      if (insertErr) throw new Error(insertErr.message);
    }

    await supabase
      .from('inspiration_items')
      .update({ status: 'ready' })
      .eq('id', itemId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from('inspiration_items')
      .update({ status: 'error', error: message })
      .eq('id', itemId);
  }
}

export async function POST(req: NextRequest) {
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

  const parsed = captureInspirationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { url, text, title, sourceType: providedType, capturedVia } = parsed.data;

  // URL normalization + dedupe
  let sourceUrlNormalized: string | null = null;
  if (url) {
    sourceUrlNormalized = normalizeUrl(url);
    if (sourceUrlNormalized) {
      const { data: existing } = await supabase
        .from('inspiration_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('source_url_normalized', sourceUrlNormalized)
        .is('archived_at', null)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ data: existing }, { status: 200 });
      }
    }
  }

  // Source type detection
  const sourceType: InspirationSourceType = providedType
    ?? (url ? detectSourceTypeFromUrl(url) : 'manual');

  const insertRow = {
    user_id: user.id,
    source_url: url ?? null,
    source_url_normalized: sourceUrlNormalized,
    source_type: sourceType,
    title: title ?? null,
    captured_via: capturedVia,
    body_markdown: !url && text ? text : null,
    status: 'pending' as const,
    tags: [] as string[],
  };

  const { data: inserted, error: insertError } = await supabase
    .from('inspiration_items')
    .insert(insertRow)
    .select('id, status')
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message ?? 'Insert failed' },
      { status: 500 },
    );
  }

  const itemId = inserted.id as string;

  // Respond immediately; run processing in background
  after(async () => {
    await processInspirationCapture(
      supabase,
      itemId,
      url ?? null,
      sourceType,
      !url && text ? text : null,
    );
  });

  return NextResponse.json(
    { data: { id: itemId, status: inserted.status } },
    { status: 201 },
  );
}
