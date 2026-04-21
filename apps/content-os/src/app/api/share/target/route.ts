/**
 * POST /api/share/target — PWA Web Share Target receiver
 *
 * Accepts multipart/form-data with the share_target fields `title`, `text`,
 * and `url`. Extracts a URL from `url` if present, otherwise scans `text`
 * for the first URL-like substring. Reuses the capture pipeline and then
 * redirects so the native share UI closes and the app opens on the new item.
 */

import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeUrl } from '@/lib/url-normalize';
import type { InspirationSourceType } from '@/domain';
import {
  detectSourceTypeFromUrl,
  processInspirationCapture,
} from '@/app/api/inspiration/capture/route';

const URL_REGEX = /https?:\/\/[^\s<>"']+/i;

function extractUrl(rawUrl: string | null, rawText: string | null): string | null {
  if (rawUrl && URL_REGEX.test(rawUrl)) return rawUrl.trim();
  if (rawText) {
    const match = rawText.match(URL_REGEX);
    if (match) return match[0];
  }
  return null;
}

function redirectAbsolute(req: NextRequest, path: string): NextResponse {
  // Build an absolute redirect based on the incoming request origin so this
  // works correctly behind Vercel/other reverse proxies.
  const origin = new URL(req.url).origin;
  return NextResponse.redirect(new URL(path, origin), 302);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    // Unauthenticated share: send them through login then back to inbox
    return redirectAbsolute(req, '/login?next=/inspiration');
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return redirectAbsolute(req, '/inspiration?error=share_failed');
  }

  const rawTitle = (form.get('title') as string | null) ?? null;
  const rawText = (form.get('text') as string | null) ?? null;
  const rawUrl = (form.get('url') as string | null) ?? null;

  const url = extractUrl(rawUrl, rawText);
  const hasText = Boolean(rawText && rawText.trim().length > 0);

  if (!url && !hasText) {
    return redirectAbsolute(req, '/inspiration?error=share_failed');
  }

  try {
    let sourceUrlNormalized: string | null = null;
    if (url) {
      sourceUrlNormalized = normalizeUrl(url);
      if (sourceUrlNormalized) {
        const { data: existing } = await supabase
          .from('inspiration_items')
          .select('id')
          .eq('user_id', user.id)
          .eq('source_url_normalized', sourceUrlNormalized)
          .is('archived_at', null)
          .maybeSingle();
        if (existing) {
          return redirectAbsolute(req, `/inspiration/${existing.id}`);
        }
      }
    }

    const sourceType: InspirationSourceType = url
      ? detectSourceTypeFromUrl(url)
      : 'manual';

    const insertRow = {
      user_id: user.id,
      source_url: url ?? null,
      source_url_normalized: sourceUrlNormalized,
      source_type: sourceType,
      title: rawTitle ?? null,
      captured_via: 'share_sheet' as const,
      body_markdown: !url && hasText ? rawText : null,
      status: 'pending' as const,
      tags: [] as string[],
    };

    const { data: inserted, error: insertError } = await supabase
      .from('inspiration_items')
      .insert(insertRow)
      .select('id')
      .single();

    if (insertError || !inserted) {
      return redirectAbsolute(req, '/inspiration?error=share_failed');
    }

    const itemId = inserted.id as string;

    after(async () => {
      await processInspirationCapture(
        supabase,
        itemId,
        url,
        sourceType,
        !url && hasText ? rawText : null,
      );
    });

    return redirectAbsolute(req, `/inspiration/${itemId}`);
  } catch {
    return redirectAbsolute(req, '/inspiration?error=share_failed');
  }
}
