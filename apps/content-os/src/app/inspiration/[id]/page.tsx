'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { HighlightList } from '@/components/inspiration/HighlightList';
import type {
  InspirationItem,
  InspirationHighlight,
  InspirationHighlightType,
} from '@/domain';

type ItemWithHighlights = InspirationItem & { highlights: InspirationHighlight[] };

interface DetailResponse {
  data: ItemWithHighlights;
}

const HIGHLIGHT_TYPE_OPTIONS: Array<{ value: InspirationHighlightType; label: string }> = [
  { value: 'user_highlight', label: 'Highlight' },
  { value: 'key_idea', label: 'Key idea' },
  { value: 'hook', label: 'Hook' },
  { value: 'quote', label: 'Quote' },
  { value: 'structure_note', label: 'Structure note' },
  { value: 'tonal_marker', label: 'Tonal marker' },
  { value: 'vocabulary_note', label: 'Vocabulary note' },
];

function statusClass(status: string): string {
  switch (status) {
    case 'ready':
      return 'text-primary border-primary';
    case 'error':
      return 'text-accent border-accent';
    case 'pending':
    case 'fetching':
    case 'processing':
      return 'text-primary border-primary animate-pulse';
    default:
      return 'text-muted border-muted';
  }
}

export default function InspirationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [item, setItem] = useState<ItemWithHighlights | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // New highlight form
  const [hlType, setHlType] = useState<InspirationHighlightType>('user_highlight');
  const [hlContent, setHlContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/inspiration/${id}`);
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const body = (await res.json()) as DetailResponse;
      setItem(body.data);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll while status is pending/fetching/processing
  useEffect(() => {
    if (!item) return;
    const transient =
      item.status === 'pending' ||
      item.status === 'fetching' ||
      item.status === 'processing';
    if (!transient) return;
    pollTimer.current = setTimeout(() => {
      void load();
    }, 3000);
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [item, load]);

  async function patchItem(patch: Record<string, unknown>) {
    if (!id) return;
    const res = await fetch(`/api/inspiration/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`Update failed (${res.status})`);
    await load();
  }

  async function setRating(rating: number) {
    try {
      await patchItem({ userRating: rating });
    } catch (e) {
      console.error(e);
    }
  }

  async function archive() {
    if (!id) return;
    if (!confirm('Archive this inspiration?')) return;
    const res = await fetch(`/api/inspiration/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/inspiration');
  }

  async function reprocess() {
    if (!id) return;
    setReprocessing(true);
    try {
      await fetch(`/api/inspiration/${id}/reprocess`, { method: 'POST' });
      await load();
    } finally {
      setReprocessing(false);
    }
  }

  async function addHighlight() {
    if (!id || !hlContent.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/inspiration/${id}/highlights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          highlightType: hlType,
          content: hlContent.trim(),
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setHlContent('');
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setPosting(false);
    }
  }

  async function editHighlight(hid: string, content: string) {
    await fetch(`/api/inspiration/highlights/${hid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    await load();
  }

  async function deleteHighlight(hid: string) {
    if (!confirm('Delete this highlight?')) return;
    await fetch(`/api/inspiration/highlights/${hid}`, { method: 'DELETE' });
    await load();
  }

  if (loading) {
    return <div className="p-4 font-small text-muted">[DATA STREAM INCOMING]</div>;
  }

  if (err || !item) {
    return (
      <div className="p-4 space-y-2">
        <div className="font-small text-accent">{err ?? 'Not found'}</div>
        <Link href="/inspiration" className="font-button text-xs text-primary underline">
          ← BACK
        </Link>
      </div>
    );
  }

  const transient =
    item.status === 'pending' ||
    item.status === 'fetching' ||
    item.status === 'processing';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/inspiration"
            className="font-button text-xs text-muted hover:text-primary"
          >
            ← BACK
          </Link>
          <span className="font-button text-[10px] text-muted uppercase">
            {item.sourceType}
          </span>
          <span
            className={`inline-block px-2 py-0.5 border font-button text-[10px] ${statusClass(item.status)}`}
          >
            {item.status.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reprocess}
            disabled={reprocessing}
            className="border border-border text-muted font-button text-[10px] px-2 py-1 hover:text-primary hover:border-primary transition-colors disabled:opacity-50"
          >
            {reprocessing ? 'REPROCESSING…' : 'REPROCESS'}
          </button>
          <button
            type="button"
            onClick={archive}
            className="border border-border text-muted font-button text-[10px] px-2 py-1 hover:text-accent hover:border-accent transition-colors"
          >
            ARCHIVE
          </button>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left: content */}
        <div className="flex-1 overflow-y-auto p-6 md:border-r md:border-border">
          <h1 className="text-foreground text-xl font-semibold leading-tight mb-2">
            {item.title ?? item.sourceUrl ?? 'Untitled'}
          </h1>

          <div className="flex flex-wrap items-center gap-3 font-small text-muted text-[12px] mb-4">
            {item.author && <span>{item.author}</span>}
            {item.authorHandle && <span>@{item.authorHandle}</span>}
            {item.publishedAt && (
              <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
            )}
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                OPEN SOURCE ↗
              </a>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-6">
            <span className="font-button text-[10px] text-muted">RATING:</span>
            {[
              { v: -1, label: '✕ DISLIKE' },
              { v: 1, label: '★ LIKE' },
              { v: 2, label: '★★ LOVE' },
            ].map((r) => {
              const active = item.userRating === r.v;
              return (
                <button
                  key={r.v}
                  type="button"
                  onClick={() => setRating(active ? 0 : r.v)}
                  className={`px-2 py-1 border font-button text-[10px] transition-colors ${
                    active
                      ? 'border-primary text-primary'
                      : 'border-border text-muted hover:text-foreground'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          {transient && (
            <div className="border border-primary p-3 mb-4 font-small text-[12px] text-primary animate-pulse">
              Still processing — highlights will appear shortly…
            </div>
          )}

          {item.status === 'error' && item.error && (
            <div className="border border-accent p-3 mb-4 font-small text-[12px] text-accent">
              {item.error}
            </div>
          )}

          {/* Body rendering by source type */}
          {item.sourceType === 'youtube' && item.mediaUrl && (
            <div className="mb-4">
              <img
                src={item.mediaUrl}
                alt={item.title ?? 'Video thumbnail'}
                className="w-full max-w-2xl border border-border"
              />
            </div>
          )}

          {item.sourceType === 'tweet' && item.bodyHtml ? (
            <div
              className="prose prose-invert max-w-none"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: item.bodyHtml }}
            />
          ) : item.bodyMarkdown ? (
            <pre className="whitespace-pre-wrap font-sans text-foreground text-[14px] leading-relaxed">
              {item.bodyMarkdown}
            </pre>
          ) : (
            <div className="font-small text-muted text-[12px]">
              No content extracted yet.
            </div>
          )}
        </div>

        {/* Right: highlights */}
        <aside className="w-full md:w-[400px] flex-shrink-0 overflow-y-auto border-t md:border-t-0 border-border flex flex-col">
          <div className="p-3 border-b border-border space-y-2">
            <span className="font-button text-[10px] text-muted">
              + ADD HIGHLIGHT
            </span>
            <select
              value={hlType}
              onChange={(e) =>
                setHlType(e.target.value as InspirationHighlightType)
              }
              className="w-full bg-surface border border-border px-2 py-1 text-[12px]"
            >
              {HIGHLIGHT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <textarea
              value={hlContent}
              onChange={(e) => setHlContent(e.target.value)}
              rows={3}
              placeholder="Your note, quote, or idea…"
              className="w-full bg-surface border border-border p-2 text-sm placeholder:text-muted focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={addHighlight}
              disabled={!hlContent.trim() || posting}
              className="w-full border border-primary text-primary font-button text-[11px] px-3 py-1 hover:bg-primary hover:text-background transition-colors disabled:opacity-50"
            >
              {posting ? 'SAVING…' : 'SAVE HIGHLIGHT'}
            </button>
          </div>

          <div className="flex-1 p-2">
            <HighlightList
              highlights={item.highlights ?? []}
              onEdit={editHighlight}
              onDelete={deleteHighlight}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
