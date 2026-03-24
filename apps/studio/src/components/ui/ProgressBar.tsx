// @crumb progress-bar-ui
// [UI] | Progress indicator | Status display
// why: Progress bar component showing task progress percentage
// in:[progress value, max value, label] out:[progress bar DOM, fill width] err:[render, calc errors]
// hazard: No animation—progress changes appear jarring and harsh
// hazard: No accessible text alternative—screen readers can't determine progress value
// edge:apps/studio/src/components/assembly/RenderQueue.tsx -> SERVES
// prompt: Add smooth CSS transitions, implement aria-valuenow and ARIA live region

'use client';

import React from 'react';

interface ProgressBarProps {
  progress: number;
  label?: string;
  className?: string;
}

export function ProgressBar({
  progress,
  label,
  className = '',
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className={['flex items-center gap-3', className].join(' ')}>
      {label && (
        <span className="shrink-0 font-mono text-[12px] text-muted uppercase">
          {label}
        </span>
      )}
      <div className="w-full h-[4px] border border-border bg-background">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
