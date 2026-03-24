// @crumb master-timecode
// [UI] | Time display | Sync source
// why: Master timecode display showing current playback position—source of truth for all timeline components
// in:[currentTime, playback state, video duration] out:[timecode text, format display] err:[render, sync errors]
// hazard: No validation of currentTime against duration—invalid times may display garbage values
// hazard: Timecode format hard-coded—cannot switch between HH:MM:SS and frame-based formats dynamically
// edge:apps/studio/src/components/console/WaveformTimeline.tsx -> CALLS
// prompt: Add duration validation, make timecode format configurable, implement frame-accurate display

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
