// @crumb capture-button
// [UI] | Capture control | Marker creation trigger
// why: Button component for creating markers at current playback position
// in:[currentTime, onClick callback] out:[button DOM, click event] err:[state, event errors]
// hazard: No debounce on rapid clicks—multiple markers could be created at identical timestamps
// hazard: No visual feedback while capturing—user may think button is unresponsive
// edge:apps/studio/src/components/console/MasterTimecode.tsx -> RELATES
// prompt: Add debounce/throttle to capture, implement visual feedback (loading state), add success toast

'use client';

import { useState } from 'react';

interface CaptureButtonProps {
  onCapture: () => void;
  disabled?: boolean;
}

export function CaptureButton({ onCapture, disabled }: CaptureButtonProps) {
  const [flash, setFlash] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    setFlash(true);
    onCapture();
    setTimeout(() => setFlash(false), 200);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-[120px] h-[44px]
        bg-primary text-background
        font-heading font-bold text-[13px] uppercase tracking-[0.1em]
        border-0 cursor-pointer select-none
        transition-transform active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        ${flash ? 'capture-flash' : ''}
      `}
    >
      [MARK]
    </button>
  );
}
