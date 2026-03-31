'use client';

import { useState } from 'react';
import HealthDrawer from './HealthDrawer';

interface Props {
  accountId: string;
  accountName: string;
  consecutiveFailures: number;
}

export function HealthButton({ accountId, accountName, consecutiveFailures }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (consecutiveFailures === 0) return null;

  const label = consecutiveFailures >= 5 ? 'Critical' : consecutiveFailures >= 3 ? 'Warning' : 'Issue';
  const bg = consecutiveFailures >= 5 ? 'rgba(239,68,68,0.15)' : consecutiveFailures >= 3 ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)';
  const color = consecutiveFailures >= 5 ? '#ef4444' : '#f59e0b';

  return (
    <>
      <button
        onClick={() => setDrawerOpen(true)}
        style={{
          background: bg,
          color,
          border: `1px solid ${color}`,
          borderRadius: '4px',
          padding: '2px 8px',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        ⚠ {label}
      </button>
      <HealthDrawer
        accountId={accountId}
        accountName={accountName}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
