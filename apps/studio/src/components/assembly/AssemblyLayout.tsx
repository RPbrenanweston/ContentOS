'use client';

import { ReactNode } from 'react';

interface AssemblyLayoutProps {
  clipSelector: ReactNode;
  exportSettings: ReactNode;
  renderQueue: ReactNode;
  renderButton: ReactNode;
}

export function AssemblyLayout({
  clipSelector,
  exportSettings,
  renderQueue,
  renderButton,
}: AssemblyLayoutProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 grid grid-cols-3 divide-x divide-border">
        {/* Left: Selected clips */}
        <div className="overflow-y-auto">{clipSelector}</div>

        {/* Center: Export settings */}
        <div className="overflow-y-auto">{exportSettings}</div>

        {/* Right: Render queue */}
        <div className="overflow-y-auto">{renderQueue}</div>
      </div>

      {/* Bottom: Render button */}
      <div className="border-t border-border p-4">
        {renderButton}
      </div>
    </div>
  );
}
