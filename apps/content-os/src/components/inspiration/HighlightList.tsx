'use client';

import { useState } from 'react';
import type { InspirationHighlight, InspirationHighlightType } from '@/domain';

interface HighlightListProps {
  highlights: InspirationHighlight[];
  onEdit?: (id: string, content: string) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
}

const GROUP_ORDER: Array<{ type: InspirationHighlightType; label: string }> = [
  { type: 'key_idea', label: 'KEY IDEAS' },
  { type: 'hook', label: 'HOOKS' },
  { type: 'quote', label: 'QUOTES' },
  { type: 'structure_note', label: 'STRUCTURE NOTES' },
  { type: 'tonal_marker', label: 'TONAL MARKERS' },
  { type: 'vocabulary_note', label: 'VOCABULARY NOTES' },
  { type: 'user_highlight', label: 'YOUR HIGHLIGHTS' },
];

export function HighlightList({ highlights, onEdit, onDelete }: HighlightListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const byType: Record<string, InspirationHighlight[]> = {};
  for (const h of highlights) {
    (byType[h.highlightType] ??= []).push(h);
  }
  for (const t of Object.keys(byType)) {
    byType[t].sort((a, b) => a.position - b.position);
  }

  function startEdit(h: InspirationHighlight) {
    setEditingId(h.id);
    setDraft(h.content);
  }

  async function save(id: string) {
    if (onEdit) await onEdit(id, draft);
    setEditingId(null);
  }

  if (highlights.length === 0) {
    return (
      <div className="font-small text-muted p-4">
        No highlights yet. They&apos;ll appear here once processing completes.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {GROUP_ORDER.map(({ type, label }) => {
        const items = byType[type];
        if (!items || items.length === 0) return null;

        return (
          <section key={type}>
            <h4 className="sticky top-0 bg-background font-button text-[10px] text-muted py-1 px-2 border-b border-border">
              {label} ({items.length})
            </h4>
            <div className="divide-y divide-border">
              {items.map((h) => {
                const isEditing = editingId === h.id;
                const isQuote = h.highlightType === 'quote';
                return (
                  <div key={h.id} className="group p-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          rows={3}
                          className="w-full bg-surface border border-border p-2 text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => save(h.id)}
                            className="border border-primary text-primary font-button text-[10px] px-2 py-1 hover:bg-primary hover:text-background transition-colors"
                          >
                            SAVE
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="border border-border text-muted font-button text-[10px] px-2 py-1 hover:bg-surface transition-colors"
                          >
                            CANCEL
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p
                          className={
                            isQuote
                              ? 'text-foreground italic border-l-2 border-primary pl-3 text-sm'
                              : 'text-foreground text-sm'
                          }
                        >
                          {h.content}
                        </p>
                        {h.rationale && (
                          <p className="text-muted text-[12px] mt-1">{h.rationale}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          {h.userCreated ? (
                            <span className="font-button text-[9px] text-primary">
                              YOUR NOTE
                            </span>
                          ) : (
                            <span />
                          )}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onEdit && (
                              <button
                                type="button"
                                onClick={() => startEdit(h)}
                                className="font-button text-[10px] text-muted hover:text-primary px-1"
                              >
                                EDIT
                              </button>
                            )}
                            {onDelete && (
                              <button
                                type="button"
                                onClick={() => onDelete(h.id)}
                                className="font-button text-[10px] text-muted hover:text-accent px-1"
                              >
                                DEL
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
