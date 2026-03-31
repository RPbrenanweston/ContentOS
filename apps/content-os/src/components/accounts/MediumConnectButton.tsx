'use client';

import { useState } from 'react';
import { MediumConnectModal } from './MediumConnectModal';

export function MediumConnectButton() {
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
      <MediumConnectModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
