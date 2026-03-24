// @crumb marker-card
// [UI] | Marker item | Ledger entry
// why: Individual marker card in ledger—shows timecode, type, and annotation preview
// in:[marker object, isSelected state, onSelect callback] out:[card DOM, select handler] err:[render, event errors]
// hazard: Truncated annotation text may not show full content—user can't preview long notes
// hazard: No keyboard navigation—users must click to select markers
// edge:apps/studio/src/components/logbook/AnnotationField.tsx -> RELATES
// prompt: Add expandable annotation preview, implement arrow key navigation support

'use client';

import { useState } from 'react';
import type { Breadcrumb } from '@/lib/types/domain';
import type { UpdateBreadcrumbRequest } from '@/lib/types/api';
import { formatCompact } from '@/lib/utils/time';
import { AnnotationField } from './AnnotationField';
import { TrimHandles } from './TrimHandles';

interface MarkerCardProps {
  breadcrumb: Breadcrumb;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (updates: UpdateBreadcrumbRequest) => void;
  onDelete: () => void;
  onGenerateClip?: () => void;
}

export function MarkerCard({
  breadcrumb,
  isActive,
  onSelect,
  onUpdate,
  onDelete,
  onGenerateClip,
}: MarkerCardProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`
        relative border-b border-border/50 cursor-pointer transition-colors
        ${isActive ? 'bg-[#2E312C]' : 'hover:bg-surface/80'}
      `}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Active indicator — left border */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
      )}

      <div className="px-4 py-3 pl-5">
        {/* Timecode row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-primary tabular-nums">
              {formatCompact(breadcrumb.startTimeSeconds)}
            </span>
            <span className="font-mono text-xs text-muted">—</span>
            <span className="font-mono text-sm text-primary tabular-nums">
              {formatCompact(breadcrumb.endTimeSeconds)}
            </span>
          </div>

          {/* Trim handles */}
          <TrimHandles
            startTime={breadcrumb.startTimeSeconds}
            endTime={breadcrumb.endTimeSeconds}
            onTrimStart={(delta) =>
              onUpdate({ startTimeSeconds: Math.max(0, breadcrumb.startTimeSeconds + delta) })
            }
            onTrimEnd={(delta) =>
              onUpdate({ endTimeSeconds: breadcrumb.endTimeSeconds + delta })
            }
          />
        </div>

        {/* Annotation field */}
        <AnnotationField
          value={breadcrumb.note ?? ''}
          onChange={(note) => onUpdate({ note: note || null })}
        />

        {/* Tags */}
        {breadcrumb.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {breadcrumb.tags.map((tag) => (
              <span
                key={tag}
                className="font-mono text-[10px] text-muted px-1 border border-border"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons — visible on hover or active */}
        {(showActions || isActive) && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
            {onGenerateClip && (
              <button
                onClick={(e) => { e.stopPropagation(); onGenerateClip(); }}
                className="font-heading text-[11px] uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
              >
                [CLIP]
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="font-heading text-[11px] uppercase tracking-wider text-accent hover:text-accent/80 transition-colors ml-auto"
            >
              [DELETE]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
