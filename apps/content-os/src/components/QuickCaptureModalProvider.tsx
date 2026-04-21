'use client';

import { useCallback, useEffect, useState } from 'react';
import { QuickCaptureModal } from './QuickCaptureModal';

/**
 * Mounts the global QuickCaptureModal and registers the Cmd+K / Ctrl+K shortcut.
 * Rendered once from the root layout so the modal is available on every route.
 */
export function QuickCaptureModalProvider() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isK = e.key === 'k' || e.key === 'K';
      if (isK && (e.metaKey || e.ctrlKey)) {
        // Don't intercept if user is typing in an input that wants cmd+k (rare)
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return <QuickCaptureModal open={open} onClose={close} />;
}
