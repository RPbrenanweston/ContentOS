'use client';

import { formatTimecode } from '@/lib/utils/time';

interface MasterTimecodeProps {
  currentSeconds: number;
}

export function MasterTimecode({ currentSeconds }: MasterTimecodeProps) {
  return (
    <div className="absolute top-4 right-4 z-10 select-none">
      <span className="font-mono text-[32px] text-primary tracking-tight tabular-nums">
        {formatTimecode(currentSeconds)}
      </span>
    </div>
  );
}
