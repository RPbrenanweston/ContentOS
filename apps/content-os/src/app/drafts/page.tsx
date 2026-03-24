'use client';

import { useEffect, useState, useCallback } from 'react';
import { TipTapEditor } from '@/components/editor/tiptap-editor';
import type { DerivedAsset } from '@/domain';

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<DerivedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'social_post' | 'thread' | 'email_draft' | 'blog_summary'>('all');
  const [editingDraft, setEditingDraft] = useState<DerivedAsset | null>(null);
  const [editBody, setEditBody] = useState('');
  const [editBodyText, setEditBodyText] = useState('');

  const loadDrafts = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status: 'draft' });
      if (filter !== 'all') params.set('assetType', filter);

      const res = await fetch(`/api/assets?${params}`);
      const data = await res.json();
      setDrafts(data.assets ?? []);
    } catch (e) {
      console.error('Failed to load drafts:', e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  const handleApprove = async (id: string) => {
    try {
      await fetch(`/api/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      console.error('Approve failed:', e);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const openEditor = (draft: DerivedAsset) => {
    setEditingDraft(draft);
    setEditBody(draft.body);
    setEditBodyText(draft.body);
  };

  const saveEdit = async () => {
    if (!editingDraft) return;
    try {
      await fetch(`/api/assets/${editingDraft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: editBodyText }),
      });
      setDrafts((prev) =>
        prev.map((d) => d.id === editingDraft.id ? { ...d, body: editBodyText } : d)
      );
      setEditingDraft(null);
    } catch (e) {
      console.error('Save edit failed:', e);
    }
  };

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
            {drafts.length} {drafts.length === 1 ? 'piece' : 'pieces'} awaiting review
          </span>
        </div>

        {/* Filter pills */}
        <div className="flex items-center rounded-lg p-0.5" style={{ backgroundColor: 'var(--theme-surface)' }}>
          {(['all', 'social_post', 'thread', 'email_draft', 'blog_summary'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize"
              style={{
                backgroundColor: filter === f ? 'var(--theme-pill-active-bg)' : 'transparent',
                color: filter === f ? 'var(--theme-pill-active-text)' : 'var(--theme-pill-inactive-text)',
              }}
            >
              {f === 'all' ? 'All' : f.replace('_', ' ')}
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
              <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--theme-foreground)' }}>No drafts to review</h2>
              <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
                When you adapt a piece for different platforms, the variants will appear here for your review and perfecting.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-6 px-6 space-y-4">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="rounded-lg p-5 transition-colors"
                style={{
                  backgroundColor: 'var(--theme-card-bg)',
                  border: '1px solid var(--theme-card-border)',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {draft.platformHint && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize"
                        style={{
                          backgroundColor: 'var(--theme-tag-bg)',
                          color: 'var(--theme-tag-text)',
                          border: '1px solid var(--theme-tag-border)',
                        }}
                      >
                        {draft.platformHint}
                      </span>
                    )}
                    <span className="text-ui-sm capitalize">
                      {draft.assetType.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-ui-sm">
                    {new Date(draft.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>

                {/* Content */}
                <div className="text-sm leading-relaxed whitespace-pre-wrap mb-4" style={{ color: 'var(--theme-foreground)' }}>
                  {draft.body.length > 500 ? `${draft.body.slice(0, 500)}...` : draft.body}
                </div>

                {draft.title && (
                  <p className="text-ui-sm mb-4">
                    From: <span className="font-medium" style={{ color: 'var(--theme-foreground)' }}>{draft.title}</span>
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1px solid var(--theme-border)' }}>
                  <button
                    onClick={() => handleApprove(draft.id)}
                    className="px-4 py-1.5 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: 'var(--theme-btn-primary-bg)', color: 'var(--theme-btn-primary-text)' }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => openEditor(draft)}
                    className="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors"
                    style={{ border: '1px solid var(--theme-border)', color: 'var(--theme-foreground)' }}
                  >
                    Edit &amp; Perfect
                  </button>
                  <button
                    onClick={() => handleReject(draft.id)}
                    className="px-4 py-1.5 text-sm font-medium transition-colors"
                    style={{ color: 'var(--theme-muted)' }}
                  >
                    Discard
                  </button>
                  <div className="flex-1" />
                  <button
                    className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                    style={{ color: 'var(--theme-muted)', border: '1px solid var(--theme-border)' }}
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Edit panel (slide-over) ─── */}
      {editingDraft && (
        <div className="absolute inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setEditingDraft(null)}
          />

          {/* Editor panel */}
          <div
            className="relative ml-auto w-full max-w-3xl h-full flex flex-col"
            style={{ backgroundColor: 'var(--theme-background)' }}
          >
            {/* Panel header */}
            <div className="h-14 flex items-center justify-between px-6" style={{ borderBottom: '1px solid var(--theme-border)' }}>
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-foreground)' }}>
                  Edit &amp; Perfect
                </h2>
                {editingDraft.platformHint && (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize"
                    style={{
                      backgroundColor: 'var(--theme-tag-bg)',
                      color: 'var(--theme-tag-text)',
                      border: '1px solid var(--theme-tag-border)',
                    }}
                  >
                    {editingDraft.platformHint}
                  </span>
                )}
                <span className="text-ui-sm capitalize">
                  {editingDraft.assetType.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-ui-sm">
                  {editBodyText.split(/\s+/).filter(Boolean).length} words
                </span>
                <button
                  onClick={saveEdit}
                  className="px-4 py-1.5 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: 'var(--theme-btn-primary-bg)', color: 'var(--theme-btn-primary-text)' }}
                >
                  Save changes
                </button>
                <button
                  onClick={() => setEditingDraft(null)}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: 'var(--theme-muted)' }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Full editor with formatting tools */}
            <div className="flex-1 overflow-hidden">
              <TipTapEditor
                content={editBody}
                onChange={(_html, text) => setEditBodyText(text)}
                placeholder="Perfect your content..."
                mode="edit"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
