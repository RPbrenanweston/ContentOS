// @crumb drafts-review
// UI | review-panel | workflow-gate
// why: Surfaces content saved as drafts from the Write page; lets users review and continue editing before publishing
// in:[/api/content?status=draft] out:[JSX-review-ui] err:[fetch-failure]
// hazard: No error handling on loadDrafts failures; API errors silently fail and UI remains in loading state indefinitely
// edge:../../components/editor/tiptap-editor.tsx -> USES
// edge:/api/content -> API-ENDPOINT
// edge:../content/[id]/page.tsx -> NAVIGATES-TO
// prompt: Add error boundary for failed content loads; handle empty state gracefully

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ContentNode } from '@/domain';

export default function DraftsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<ContentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'blog' | 'video' | 'audio'>('all');

  const loadDrafts = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status: 'draft' });
      if (filter !== 'all') params.set('type', filter);

      const res = await fetch(`/api/content?${params}`);
      const data = await res.json();
      setDrafts(data.nodes ?? []);
    } catch (e) {
      console.error('Failed to load drafts:', e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>Loading drafts...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6" style={{ borderBottom: '1px solid var(--theme-border)' }}>
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--theme-foreground)' }}>Drafts</h1>
          <span className="text-ui-sm">
            {drafts.length} {drafts.length === 1 ? 'draft' : 'drafts'}
          </span>
        </div>

        {/* Filter pills */}
        <div className="flex items-center rounded-lg p-0.5" style={{ backgroundColor: 'var(--theme-surface)' }}>
          {(['all', 'blog', 'video', 'audio'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize"
              style={{
                backgroundColor: filter === f ? 'var(--theme-pill-active-bg)' : 'transparent',
                color: filter === f ? 'var(--theme-pill-active-text)' : 'var(--theme-pill-inactive-text)',
              }}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Drafts list */}
      <div className="flex-1 overflow-y-auto">
        {drafts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--theme-surface)' }}>
                <svg className="w-8 h-8" style={{ color: 'var(--theme-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--theme-foreground)' }}>No drafts yet</h2>
              <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                Start writing and save your content as a draft — it will appear here.
              </p>
              <button
                onClick={() => router.push('/content/new')}
                className="mt-4 px-4 py-2 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--theme-btn-primary-bg)', color: 'var(--theme-btn-primary-text)' }}
              >
                Start writing
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-6 px-6 space-y-4">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="rounded-lg p-5 transition-colors cursor-pointer hover:opacity-90"
                style={{
                  backgroundColor: 'var(--theme-card-bg)',
                  border: '1px solid var(--theme-card-border)',
                }}
                onClick={() => router.push(`/content/${draft.id}`)}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize"
                      style={{
                        backgroundColor: 'var(--theme-tag-bg)',
                        color: 'var(--theme-tag-text)',
                        border: '1px solid var(--theme-tag-border)',
                      }}
                    >
                      {draft.contentType}
                    </span>
                    {draft.wordCount != null && draft.wordCount > 0 && (
                      <span className="text-ui-sm">{draft.wordCount.toLocaleString()} words</span>
                    )}
                  </div>
                  <span className="text-ui-sm">
                    {new Date(draft.updatedAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold mb-2 leading-snug" style={{ color: 'var(--theme-foreground)' }}>
                  {draft.title}
                </h3>

                {/* Body preview */}
                {draft.bodyText && (
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--theme-muted)' }}>
                    {draft.bodyText.length > 200 ? `${draft.bodyText.slice(0, 200)}...` : draft.bodyText}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 mt-3" style={{ borderTop: '1px solid var(--theme-border)' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/content/${draft.id}`); }}
                    className="px-4 py-1.5 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: 'var(--theme-btn-primary-bg)', color: 'var(--theme-btn-primary-text)' }}
                  >
                    Continue editing
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
