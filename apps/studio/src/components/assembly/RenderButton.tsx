// @crumb render-button
// [UI] | Export trigger | Render control
// why: Button component initiating video rendering/export with selected settings
// in:[clips array, export config, onClick handler] out:[button UI, render state] err:[render, config errors]
// hazard: No validation that all clips exist—missing clips cause silent render failure
// hazard: Button state not updated during render—user may click multiple times
// edge:apps/studio/src/components/assembly/RenderQueue.tsx -> CALLS
// prompt: Add clip existence check, disable button during render, show queue status in UI

'use client';

interface RenderButtonProps {
  onClick: () => void;
  disabled?: boolean;
  rendering?: boolean;
}

export function RenderButton({ onClick, disabled, rendering }: RenderButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || rendering}
      className={`
        w-full py-3
        font-heading font-bold text-[13px] uppercase tracking-[0.15em]
        border-0 cursor-pointer transition-all
        ${disabled || rendering
          ? 'bg-border text-muted cursor-not-allowed'
          : 'bg-primary text-background hover:bg-primary/90 active:scale-[0.99]'
        }
      `}
    >
      {rendering ? 'RENDERING...' : 'INITIATE RENDER'}
    </button>
  );
}
