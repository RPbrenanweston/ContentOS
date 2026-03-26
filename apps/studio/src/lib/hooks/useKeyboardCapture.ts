// @crumb use-keyboard-capture
// [UI] | Keyboard event handler | Input capture
// why: Hook capturing keyboard events for video control shortcuts and editor hotkeys
// in:[key press event, callback map] out:[pressed key, matched callback result] err:[event, handler errors]
// hazard: No event listener cleanup—may leak memory if hook unmounts without cleanup
// hazard: Hotkeys not configurable—users can't customize key bindings
// edge:apps/studio/src/app/console/\[videoId\]/page.tsx -> SERVES
// prompt: Add proper event listener cleanup in useEffect return, make hotkeys user-configurable

'use client';

import { useEffect, useCallback } from 'react';

interface UseKeyboardCaptureOptions {
  onMark: () => void;
  onTogglePlay?: () => void;
  enabled?: boolean;
}

export function useKeyboardCapture({
  onMark,
  onTogglePlay,
  enabled = true,
}: UseKeyboardCaptureOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore keystrokes in input/textarea elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          onMark();
          break;
        case 'KeyP':
          e.preventDefault();
          onTogglePlay?.();
          break;
      }
    },
    [enabled, onMark, onTogglePlay]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
