'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { InspirationCard } from '@/components/inspiration/InspirationCard';
import type { InspirationItem } from '@/domain';

const SOURCE_TYPES: Array<{ value: string; label: string }> = [
  { value: '', label: 'All' },
  { value: 'article', label: 'Article' },
  { value: 'tweet', label: 'Tweet' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'substack', label: 'Substack' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'manual', label: 'Manual' },
];

const RATINGS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All' },
  { value: '2', label: 'Loved' },
  { value: '1', label: 'Liked' },
  { value: 'unrated', label: 'Unrated' },
];

const PAGE_SIZE = 30;

interface ListResponse {
  data: InspirationItem[];
  meta: { total: number; page: number; pageSize: number };
}

export default function InspirationLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sourceType = searchParams.get('sourceType') ?? '';
  const rating = searchParams.get('rating') ?? '';
  const tag = searchParams.get('tag') ?? '';
  const q = searchParams.get('q') ?? '';
  const archived = searchParams.get('archived') === '1';

  const [items, setItems] = useState<InspirationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  // Local search input state (debounced into URL `q`)
  const [searchInput, setSearchInput] = useState(q);
  useEffect(() => {
    setSearchInput(q);
  }, [q]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParam = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === '') next.delete(k);
        else next.set(k, v);
      }
      router.push(`/inspiration${next.toString() ? `?${next}` : ''}`);
    },
    [router, searchParams],
  );

  const onSearchChange = (v: string) => {
    setSearchInput(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParam({ q: v || null });
    }, 300);
  };

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (sourceType) sp.set('sourceType', sourceType);
    if (rating) sp.set('rating', rating);
    if (tag) sp.set('tag', tag);
    if (q) sp.set('q', q);
    if (archived) sp.set('archived', '1');
    sp.set('limit', String(PAGE_SIZE));
    return sp;
  }, [sourceType, rating, tag, q, archived]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
  }, [sourceType, rating, tag, q, archived]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const isFirst = page === 1;
      if (isFirst) setLoading(true);
      else setLoadingMore(true);
      try {
        const sp = new URLSearchParams(query.toString());
        sp.set('page', String(page));
        const res = await fetch(`/api/inspiration?${sp.toString()}`);
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const body = (await res.json()) as ListResponse;
        if (cancelled) return;
        setTotal(body.meta?.total ?? 0);
        setItems((prev) => (isFirst ? body.data ?? [] : [...prev, ...(body.data ?? [])]));
      } catch (e) {
        console.error('Failed to load inspirations:', e);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [query, page]);

  const hasMore = items.length < total;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <span className="font-button text-primary">INSPIRATION</span>
          <span className="font-small text-muted">{total} ITEMS</span>
        </div>
        <button
          type="button"
          onClick={() => {
            // Dispatch a synthetic Cmd+K to open the global quick capture modal
            const ev = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
            window.dispatchEvent(ev);
          }}
          className="border border-primary text-primary font-button text-xs px-3 py-1 hover:bg-primary hover:text-background transition-colors"
        >
          + CAPTURE
        </button>
      </div>

      {/* Filter bar */}
      <div className="border-b border-border p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-button text-[10px] text-muted mr-1">SOURCE:</span>
          {SOURCE_TYPES.map((opt) => {
            const active = sourceType === opt.value;
            return (
              <button
                key={opt.value || 'all'}
                type="button"
                onClick={() => updateParam({ sourceType: opt.value || null })}
                className={`px-2 py-1 font-button text-[10px] border transition-colors ${
                  active
                    ? 'border-primary text-primary'
                    : 'border-border text-muted hover:text-foreground'
                }`}
              >
                {opt.label.toUpperCase()}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-button text-[10px] text-muted mr-1">RATING:</span>
          {RATINGS.map((opt) => {
            const active = rating === opt.value;
            return (
              <button
                key={opt.value || 'all'}
                type="button"
                onClick={() => updateParam({ rating: opt.value || null })}
                className={`px-2 py-1 font-button text-[10px] border transition-colors ${
                  active
                    ? 'border-primary text-primary'
                    : 'border-border text-muted hover:text-foreground'
                }`}
              >
                {opt.label.toUpperCase()}
              </button>
            );
          })}

          <label className="flex items-center gap-1 ml-auto font-small text-[11px] text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => updateParam({ archived: e.target.checked ? '1' : null })}
            />
            Show archived
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search title, author, content…"
            className="flex-1 bg-surface border border-border px-3 py-1.5 text-sm placeholder:text-muted focus:outline-none focus:border-primary"
          />
          {tag && (
            <button
              type="button"
              onClick={() => updateParam({ tag: null })}
              className="px-2 py-1 font-button text-[10px] border border-primary text-primary hover:bg-primary hover:text-background transition-colors"
            >
              TAG: {tag.toUpperCase()} ✕
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="font-small text-muted">[DATA STREAM INCOMING]</div>
        ) : items.length === 0 ? (
          <div className="font-small text-muted">
            No inspirations yet — hit Cmd+K or tap + CAPTURE
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <InspirationCard key={item.id} item={item} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => setPage((p) => p + 1)}
                  className="border border-primary text-primary font-button text-xs px-4 py-2 hover:bg-primary hover:text-background transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'LOADING…' : 'LOAD MORE'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
