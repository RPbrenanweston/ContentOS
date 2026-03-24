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
