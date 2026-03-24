// @crumb logbook-layout
// [UI] | Ledger container | Annotation workspace
// why: Main layout for logbook editor—organizes marker ledger, editor panels, and video viewport
// in:[markers, video, selected marker] out:[layout DOM, panel states] err:[render, state sync errors]
// hazard: No error boundary—errors in ledger crash entire annotation interface
// hazard: Panel states not persisted—users lose panel layout on refresh
// edge:apps/studio/src/components/logbook/LedgerPanel.tsx -> SERVES
// prompt: Add error boundary, persist panel layout to localStorage with version key

'use client';

import { ReactNode } from 'react';

interface LogbookLayoutProps {
  videoSection: ReactNode;
  ledgerPanel: ReactNode;
}

export function LogbookLayout({ videoSection, ledgerPanel }: LogbookLayoutProps) {
  return (
    <div className="h-full flex">
      {/* Video + mini timeline — 65% */}
      <div className="w-[65%] h-full border-r border-border flex flex-col">
        {videoSection}
      </div>

      {/* Ledger panel — 35% */}
      <div className="w-[35%] h-full bg-surface overflow-hidden flex flex-col">
        {ledgerPanel}
      </div>
    </div>
  );
}
