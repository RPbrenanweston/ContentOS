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
