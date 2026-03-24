// @crumb clip-selector
// [UI] | Clip picker | Track builder
// why: Component for selecting and ordering clips into assembly—drag-drop reordering
// in:[clips array, selected clips, drag state] out:[clip list DOM, reordered clips] err:[drag, selection errors]
// hazard: Drag-drop state not validated—could drop clip onto itself or invalid position
// hazard: No visual feedback during drag—users unsure if drag is working
// edge:apps/studio/src/components/assembly/ExportSettings.tsx -> RELATES
// prompt: Add drag validation, implement visual drop indicators, add animations for reordering

'use client';

import type { Breadcrumb } from '@/lib/types/domain';
import { formatCompact } from '@/lib/utils/time';

interface ClipSelectorProps {
  breadcrumbs: Breadcrumb[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}

export function ClipSelector({
  breadcrumbs,
  selectedIds,
  onToggle,
  onToggleAll,
}: ClipSelectorProps) {
  const allSelected = breadcrumbs.length > 0 && selectedIds.size === breadcrumbs.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="font-heading font-bold text-xs uppercase tracking-[0.2em] text-muted">
          CLIPS
        </span>
        <button
          onClick={onToggleAll}
          className="font-mono text-xs text-muted hover:text-text transition-colors"
        >
          [{allSelected ? 'X' : ' '}] ALL
        </button>
      </div>

      {/* List */}
      {breadcrumbs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="font-mono text-muted text-sm tracking-widest">
            [NO MARKERS]
          </span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {breadcrumbs.map((bc) => {
            const selected = selectedIds.has(bc.id);
            return (
              <div
                key={bc.id}
                onClick={() => onToggle(bc.id)}
                className={`
                  px-4 py-3 border-b border-border/50 cursor-pointer
                  flex items-center gap-3 transition-colors
                  ${selected ? 'bg-surface' : 'hover:bg-surface/50'}
                `}
              >
                <span className="font-mono text-xs text-muted">
                  [{selected ? 'X' : ' '}]
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-primary tabular-nums">
                    {formatCompact(bc.startTimeSeconds)} — {formatCompact(bc.endTimeSeconds)}
                  </div>
                  {bc.note && (
                    <div className="font-body text-xs text-muted truncate mt-0.5">
                      {bc.note}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer count */}
      <div className="px-4 py-2 border-t border-border">
        <span className="font-mono text-xs text-muted">
          {selectedIds.size}/{breadcrumbs.length} SELECTED
        </span>
      </div>
    </div>
  );
}
