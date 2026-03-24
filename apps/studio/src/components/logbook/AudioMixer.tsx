'use client';

interface AudioMixerProps {
  originalMuted: boolean;
  onToggleOriginal: () => void;
  micEnabled: boolean;
  onToggleMic: () => void;
  musicVolume: number;
  onMusicVolumeChange: (volume: number) => void;
  hasMusic: boolean;
}

export function AudioMixer({
  originalMuted,
  onToggleOriginal,
  micEnabled,
  onToggleMic,
  musicVolume,
  onMusicVolumeChange,
  hasMusic,
}: AudioMixerProps) {
  return (
    <div className="space-y-3">
      <span className="font-heading font-bold text-[10px] uppercase tracking-[0.2em] text-muted block">
        AUDIO MIX
      </span>

      {/* Original audio */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-text">ORIGINAL</span>
        <button
          onClick={onToggleOriginal}
          className={`
            px-3 py-1 border font-mono text-[10px] uppercase tracking-wider
            ${originalMuted
              ? 'border-accent text-accent bg-accent/10'
              : 'border-primary text-primary bg-primary/10'
            }
          `}
        >
          {originalMuted ? '[MUTED]' : '[ON]'}
        </button>
      </div>

      {/* Mic */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-text">COMMENTARY</span>
        <button
          onClick={onToggleMic}
          className={`
            px-3 py-1 border font-mono text-[10px] uppercase tracking-wider
            ${micEnabled
              ? 'border-primary text-primary bg-primary/10'
              : 'border-border text-muted'
            }
          `}
        >
          {micEnabled ? '[MIC ON]' : '[MIC OFF]'}
        </button>
      </div>

      {/* Music volume */}
      {hasMusic && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-text">MUSIC</span>
            <span className="font-mono text-[10px] text-muted tabular-nums">
              {Math.round(musicVolume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={musicVolume}
            onChange={(e) => onMusicVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-border appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:bg-primary
              [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
