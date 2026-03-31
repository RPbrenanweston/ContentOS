'use client';

import { useState } from 'react';
import { BlueskyConnectModal } from './BlueskyConnectModal';

export function BlueskyConnectButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-xs font-semibold text-center py-1.5 rounded-md transition-opacity hover:opacity-90"
        style={{
          backgroundColor: '#CBFF53',
          color: '#000000',
        }}
      >
        Connect
      </button>
      <BlueskyConnectModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
