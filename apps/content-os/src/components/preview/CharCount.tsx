'use client';

// @crumb preview-char-count
// UI | preview | character-count-indicator
// why: Reusable character count badge with green/yellow/red color warnings for platform limits

interface CharCountProps {
  current: number;
  limit: number;
  className?: string;
}

export function CharCount({ current, limit, className = '' }: CharCountProps) {
  const pct = current / limit;
  const remaining = limit - current;

  let colorClass = 'text-green-600';
  let bgClass = 'bg-green-50 border-green-200';

  if (pct >= 1) {
    colorClass = 'text-red-600';
    bgClass = 'bg-red-50 border-red-200';
  } else if (pct >= 0.85) {
    colorClass = 'text-yellow-600';
    bgClass = 'bg-yellow-50 border-yellow-200';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-[10px] font-mono rounded ${bgClass} ${colorClass} ${className}`}
    >
      {current > limit ? (
        <span>{Math.abs(remaining)} over</span>
      ) : (
        <span>{remaining} left</span>
      )}
      <span className="opacity-60">/ {limit}</span>
    </span>
  );
}

interface CharBarProps {
  current: number;
  limit: number;
}

export function CharBar({ current, limit }: CharBarProps) {
  const pct = Math.min(current / limit, 1);

  let barColor = 'bg-green-500';
  if (pct >= 1) barColor = 'bg-red-500';
  else if (pct >= 0.85) barColor = 'bg-yellow-500';

  return (
    <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-150 ${barColor}`}
        style={{ width: `${pct * 100}%` }}
      />
    </div>
  );
}
