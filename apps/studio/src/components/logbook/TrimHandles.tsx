// @crumb trim-handles
// [UI] | Trim drag handles | Boundary controls
// why: Draggable handles for adjusting clip trim points on timeline
// in:[trim position, drag events, constraints] out:[handle DOM, updated trim position] err:[drag, event errors]
// hazard: Drag handlers not constrained—could drag trim point beyond opposite boundary
// hazard: Mouse/touch events not properly cleaned up—may leak event listeners
// edge:apps/studio/src/components/logbook/ClipTrimmer.tsx -> CALLS
// prompt: Add constraint validation during drag, implement proper cleanup in useEffect

'use client';

interface TrimHandlesProps {
  startTime: number;
  endTime: number;
  onTrimStart: (deltaSeconds: number) => void;
  onTrimEnd: (deltaSeconds: number) => void;
}

export function TrimHandles({ onTrimStart, onTrimEnd }: TrimHandlesProps) {
  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {/* Trim start earlier */}
      <button
        onClick={() => onTrimStart(-1)}
        className="font-mono text-xs text-muted hover:text-text transition-colors px-1"
        title="Start 1s earlier"
      >
        [&lt;]
      </button>
      {/* Trim start later */}
      <button
        onClick={() => onTrimStart(1)}
        className="font-mono text-xs text-muted hover:text-text transition-colors px-1"
        title="Start 1s later"
      >
        [&gt;]
      </button>

      <span className="text-border mx-1">|</span>

      {/* Trim end earlier */}
      <button
        onClick={() => onTrimEnd(-1)}
        className="font-mono text-xs text-muted hover:text-text transition-colors px-1"
        title="End 1s earlier"
      >
        [&lt;]
      </button>
      {/* Trim end later */}
      <button
        onClick={() => onTrimEnd(1)}
        className="font-mono text-xs text-muted hover:text-text transition-colors px-1"
        title="End 1s later"
      >
        [&gt;]
      </button>
    </div>
  );
}
