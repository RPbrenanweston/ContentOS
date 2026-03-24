'use client';

import { PLATFORM_PRESETS, WIDE_PRESETS, type PlatformPreset } from '@/lib/types/platforms';

interface ExportSettingsProps {
  selectedCount: number;
  selectedPlatforms: Set<string>;
  onTogglePlatform: (id: string) => void;
  onSelectAllShortForm: () => void;
  clipDurations: number[];
}

export function ExportSettings({
  selectedCount,
  selectedPlatforms,
  onTogglePlatform,
  onSelectAllShortForm,
  clipDurations,
}: ExportSettingsProps) {
  const allShortFormSelected = PLATFORM_PRESETS.every((p) => selectedPlatforms.has(p.id));
  const maxClipDuration = clipDurations.length > 0 ? Math.max(...clipDurations) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <span className="font-heading font-bold text-xs uppercase tracking-[0.2em] text-muted">
          EXPORT SETTINGS
        </span>
      </div>

      <div className="p-4 space-y-6">
        {/* Clip count */}
        <div>
          <span className="font-mono text-xs text-muted">CLIPS TO RENDER</span>
          <div className="font-mono text-2xl text-primary mt-1 tabular-nums">
            {selectedCount}
          </div>
        </div>

        {/* Short-form platforms — the main event */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs text-muted">SHORT-FORM</span>
            <button
              onClick={onSelectAllShortForm}
              className="font-mono text-[10px] text-primary hover:text-primary/80 transition-colors"
            >
              [{allShortFormSelected ? 'DESELECT' : 'SELECT'} ALL]
            </button>
          </div>

          <div className="space-y-0">
            {PLATFORM_PRESETS.map((preset) => (
              <PlatformRow
                key={preset.id}
                preset={preset}
                selected={selectedPlatforms.has(preset.id)}
                onToggle={() => onTogglePlatform(preset.id)}
                clipDurationWarning={
                  maxClipDuration > preset.maxDurationSeconds
                    ? `MAX ${preset.maxDurationSeconds}S — CLIPS WILL BE TRIMMED`
                    : null
                }
              />
            ))}
          </div>
        </div>

        {/* Wide formats */}
        <div>
          <span className="font-mono text-xs text-muted block mb-3">WIDE / SQUARE</span>
          <div className="space-y-0">
            {WIDE_PRESETS.map((preset) => (
              <PlatformRow
                key={preset.id}
                preset={preset}
                selected={selectedPlatforms.has(preset.id)}
                onToggle={() => onTogglePlatform(preset.id)}
                clipDurationWarning={null}
              />
            ))}
          </div>
        </div>

        {/* Output summary */}
        {selectedPlatforms.size > 0 && selectedCount > 0 && (
          <div className="border-t border-border pt-4">
            <span className="font-mono text-xs text-muted block mb-2">WILL GENERATE</span>
            <div className="font-mono text-sm text-primary">
              {selectedCount} clip{selectedCount !== 1 ? 's' : ''} x {selectedPlatforms.size} format{selectedPlatforms.size !== 1 ? 's' : ''} = {selectedCount * selectedPlatforms.size} file{selectedCount * selectedPlatforms.size !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlatformRow({
  preset,
  selected,
  onToggle,
  clipDurationWarning,
}: {
  preset: PlatformPreset;
  selected: boolean;
  onToggle: () => void;
  clipDurationWarning: string | null;
}) {
  return (
    <button
      onClick={onToggle}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5
        border border-border -mt-px first:mt-0
        transition-colors text-left
        ${selected ? 'bg-surface border-primary/30' : 'hover:bg-surface/50'}
      `}
    >
      {/* Checkbox */}
      <span className={`font-mono text-xs ${selected ? 'text-primary' : 'text-muted'}`}>
        [{selected ? 'X' : ' '}]
      </span>

      {/* Platform icon */}
      <span className={`
        font-mono text-[10px] font-bold w-6 text-center
        ${selected ? 'text-primary' : 'text-muted'}
      `}>
        {preset.icon}
      </span>

      {/* Name + spec */}
      <div className="flex-1 min-w-0">
        <div className={`font-heading text-[12px] font-semibold uppercase tracking-wider ${selected ? 'text-text' : 'text-muted'}`}>
          {preset.name}
        </div>
        <div className="font-mono text-[10px] text-muted/70">
          {preset.description}
        </div>
      </div>

      {/* Duration warning */}
      {selected && clipDurationWarning && (
        <span className="font-mono text-[9px] text-accent">
          {clipDurationWarning}
        </span>
      )}
    </button>
  );
}
