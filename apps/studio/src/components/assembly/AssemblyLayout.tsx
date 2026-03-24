// @crumb assembly-layout
// [UI] | Compositor container | Assembly workspace
// why: Main layout for assembly editor—organizes clip selector, preview, and export settings
// in:[clips array, video, export settings] out:[layout DOM, clip queue] err:[render, data sync errors]
// hazard: No error boundary—errors in assembly crash entire export workflow
// hazard: Assembly state not persisted—all work lost if browser crashes
// edge:apps/studio/src/components/assembly/ClipSelector.tsx -> SERVES
// edge:../error-boundary.tsx -> USES
// prompt: Add error boundary, persist assembly session to IndexedDB with auto-recovery

'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';

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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
