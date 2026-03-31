'use client';

import { useState } from 'react';
import { BeehiivConnectModal } from './BeehiivConnectModal';

export function BeehiivConnectButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-center py-1.5 rounded-md transition-opacity hover:opacity-90 w-full"
        style={{ backgroundColor: '#CBFF53', color: '#000' }}
      >
        Connect
      </button>
      <BeehiivConnectModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
