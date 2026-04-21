/**
 * POST /api/inspiration/[id]/reprocess
 *
 * Re-run decomposition over an item's existing body_markdown. Deletes any
 * AI-generated highlights (user_created=false) for the item before
 * regenerating; preserves user-authored highlights. Responds 202 and does
 * the decomposition work inside `after()`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServices } from '@/services/container';
import type { InspirationSourceType } from '@/domain';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: item, error: itemErr } = await supabase
    .from('inspiration_items')
    .select('id, user_id, title, source_type, body_markdown')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (itemErr || !item) {
    const status = itemErr?.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json(
      { error: itemErr?.message ?? 'Inspiration item not found' },
      { status },
    );
  }

  if (!item.body_markdown || String(item.body_markdown).trim().length === 0) {
    return NextResponse.json(
      { error: 'Item has no body_markdown to reprocess' },
      { status: 400 },
    );
  }

  // Flip status before responding so UI can reflect the new state immediately
  const { error: updErr } = await supabase
    .from('inspiration_items')
    .update({ status: 'processing', error: null })
    .eq('id', id)
    .eq('user_id', user.id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  const itemTitle = (item.title as string | null) ?? undefined;
  const sourceType = item.source_type as InspirationSourceType;
  const bodyMarkdown = item.body_markdown as string;

  after(async () => {
    try {
      const services = getServices(supabase);

      // Clear previous AI-generated highlights, preserve user-authored ones
      await supabase
        .from('inspiration_highlights')
        .delete()
        .eq('inspiration_item_id', id)
        .eq('user_id', user.id)
        .eq('user_created', false);

      const result = await services.inspirationDecompositionService.decompose({
        id,
        title: itemTitle,
        sourceType,
        bodyMarkdown,
      });

      if (result.highlights.length > 0) {
        const rows = result.highlights.map((h) => ({
          inspiration_item_id: id,
          user_id: user.id,
          highlight_type: h.highlightType,
          content: h.content,
          rationale: h.rationale ?? null,
          source_offset: h.sourceOffset ?? null,
          position: h.position ?? 0,
          user_created: false,
        }));
        const { error: insErr } = await supabase
          .from('inspiration_highlights')
          .insert(rows);
        if (insErr) throw new Error(insErr.message);
      }

      await supabase
        .from('inspiration_items')
        .update({ status: 'ready' })
        .eq('id', id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await supabase
        .from('inspiration_items')
        .update({ status: 'error', error: message })
        .eq('id', id);
    }
  });

  return NextResponse.json(
    { data: { id, status: 'processing' } },
    { status: 202 },
  );
}
