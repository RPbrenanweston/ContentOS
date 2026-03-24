// @crumb console-layout
// [UI] | Main editor container | Layout orchestrator
// why: Root layout component for console editor—arranges player, timeline, and controls
// in:[video, markers, user state] out:[layout DOM, shared state] err:[render, state sync errors]
// hazard: No error boundary—child component crashes crash entire editor view
// hazard: State passed as props without memoization—parent re-renders cascade to all children
// edge:apps/studio/src/components/console/YouTubePlayer.tsx -> SERVES
// prompt: Add error boundary, memoize child props, implement state separation for performance

'use client';

import { ReactNode } from 'react';

interface ConsoleLayoutProps {
  viewport: ReactNode;
  timeline: ReactNode;
  captureButton?: ReactNode;
}

export function ConsoleLayout({ viewport, timeline, captureButton }: ConsoleLayoutProps) {
  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {/* Video viewport — 80% */}
      <div className="relative flex-1 min-h-0 border-b border-border">
        {viewport}
        {captureButton && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            {captureButton}
          </div>
        )}
      </div>

      {/* Waveform timeline — 20% */}
      <div className="h-[20vh] min-h-[120px] bg-surface border-t border-border">
        {timeline}
      </div>
    </div>
  );
}
