'use client';

import { useState } from 'react';
import { formatTimecode } from '@/lib/utils/time';
import type { Breadcrumb } from '@/lib/types/domain';

interface TimelineMarkerProps {
  breadcrumb: Breadcrumb;
  durationSeconds: number;
  onClick?: (breadcrumb: Breadcrumb) => void;
}

export function TimelineMarker({ breadcrumb, durationSeconds, onClick }: TimelineMarkerProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const pct = durationSeconds > 0
    ? (breadcrumb.timestampSeconds / durationSeconds) * 100
    : 0;

  return (
    <div
      className="absolute top-0 bottom-0 z-10 cursor-pointer group"
      style={{ left: `${pct}%` }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(breadcrumb);
      }}
    >
      {/* Marker line */}
      <div className="w-[2px] h-full bg-primary group-hover:bg-primary/80 transition-colors" />

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-surface border border-border whitespace-nowrap z-20">
          <span className="font-mono text-xs text-primary">
            {formatTimecode(breadcrumb.timestampSeconds)}
          </span>
          {breadcrumb.note && (
            <span className="font-body text-xs text-muted ml-2 max-w-[200px] truncate">
              {breadcrumb.note}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
