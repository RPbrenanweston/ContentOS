'use client';

import type { Breadcrumb } from '@/lib/types/domain';
import type { UpdateBreadcrumbRequest } from '@/lib/types/api';
import { MarkerCard } from './MarkerCard';

interface LedgerPanelProps {
  breadcrumbs: Breadcrumb[];
  activeBreadcrumbId: string | null;
  onSelect: (breadcrumb: Breadcrumb) => void;
  onUpdate: (id: string, updates: UpdateBreadcrumbRequest) => void;
  onDelete: (id: string) => void;
  onGenerateClip?: (breadcrumb: Breadcrumb) => void;
}

export function LedgerPanel({
  breadcrumbs,
  activeBreadcrumbId,
  onSelect,
  onUpdate,
  onDelete,
  onGenerateClip,
}: LedgerPanelProps) {
  if (breadcrumbs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="font-mono text-muted text-sm tracking-widest">
          [0 MARKERS DETECTED]
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="font-heading font-bold text-xs uppercase tracking-[0.2em] text-muted">
          MARKERS
        </span>
        <span className="font-mono text-xs text-muted">
          {breadcrumbs.length}
        </span>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {breadcrumbs.map((bc) => (
          <MarkerCard
            key={bc.id}
            breadcrumb={bc}
            isActive={bc.id === activeBreadcrumbId}
            onSelect={() => onSelect(bc)}
            onUpdate={(updates) => onUpdate(bc.id, updates)}
            onDelete={() => onDelete(bc.id)}
            onGenerateClip={onGenerateClip ? () => onGenerateClip(bc) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
