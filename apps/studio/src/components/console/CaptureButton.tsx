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
