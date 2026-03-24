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
