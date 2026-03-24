'use client';

import { useState, useEffect } from 'react';

interface RecordButtonProps {
  recording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
}

export function RecordButton({
  recording,
  onStartRecording,
  onStopRecording,
  disabled,
}: RecordButtonProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!recording) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [recording]);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={recording ? onStopRecording : onStartRecording}
        disabled={disabled}
        className={`
          px-4 py-2
          font-heading font-bold text-[13px] uppercase tracking-[0.1em]
          border transition-all
          ${recording
            ? 'bg-accent text-white border-accent animate-pulse'
            : 'bg-surface text-text border-border hover:border-primary hover:text-primary'
          }
          disabled:opacity-30 disabled:cursor-not-allowed
        `}
      >
        {recording ? '[STOP REC]' : '[REC]'}
      </button>

      {recording && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-accent animate-pulse" />
          <span className="font-mono text-sm text-accent tabular-nums">
            {formatElapsed(elapsed)}
          </span>
        </div>
      )}
    </div>
  );
}
