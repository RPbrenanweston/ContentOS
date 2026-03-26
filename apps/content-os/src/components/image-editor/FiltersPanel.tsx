'use client';

import {
  type FilterType,
  type ActiveFilter,
  type UseImageEditorReturn,
  INTENSITY_FILTERS,
  TOGGLE_FILTERS,
} from './useImageEditor';

interface FiltersPanelProps {
  editor: UseImageEditorReturn;
}

const FILTER_PRESETS: { type: FilterType; label: string }[] = [
  { type: 'Grayscale', label: 'Grayscale' },
  { type: 'Sepia', label: 'Sepia' },
  { type: 'Invert', label: 'Invert' },
  { type: 'Brightness', label: 'Brightness' },
  { type: 'Contrast', label: 'Contrast' },
  { type: 'Saturation', label: 'Saturation' },
  { type: 'Blur', label: 'Blur' },
];

function getIntensity(activeFilters: ActiveFilter[], type: FilterType): number {
  return activeFilters.find((f) => f.type === type)?.intensity ?? 50;
}

function isActive(activeFilters: ActiveFilter[], type: FilterType): boolean {
  return activeFilters.some((f) => f.type === type);
}

export function FiltersPanel({ editor }: FiltersPanelProps) {
  const { activeFilters, applyFilter, removeFilter, isCropMode, enterCropMode, applyCrop, cancelCrop } = editor;

  return (
    <div style={{ borderBottom: '1px solid var(--theme-border)' }}>
      {/* Crop section */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--theme-border)' }}>
        <h3
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--theme-muted)' }}
        >
          Crop
        </h3>

        {!isCropMode ? (
          <button
            onClick={enterCropMode}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-all hover:opacity-80"
            style={{
              backgroundColor: 'var(--theme-pill-active-bg)',
              color: 'var(--theme-pill-active-text)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 3 3 3 3 6" />
              <polyline points="3 18 3 21 6 21" />
              <polyline points="18 21 21 21 21 18" />
              <polyline points="21 6 21 3 18 3" />
              <rect x="7" y="7" width="10" height="10" />
            </svg>
            Enter Crop Mode
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
              Drag the crop handles, then apply.
            </p>
            <div className="flex gap-2">
              <button
                onClick={applyCrop}
                className="flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: 'var(--theme-pill-active-bg)',
                  color: 'var(--theme-pill-active-text)',
                }}
              >
                Apply Crop
              </button>
              <button
                onClick={cancelCrop}
                className="flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all hover:opacity-80"
                style={{
                  border: '1px solid var(--theme-border)',
                  color: 'var(--theme-muted)',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filters section */}
      <div className="p-4">
        <h3
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--theme-muted)' }}
        >
          Filters
        </h3>

        {/* Toggle filters — on/off */}
        <div className="mb-4">
          <p className="text-[10px] mb-2 uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
            Presets
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {TOGGLE_FILTERS.map((type) => {
              const active = isActive(activeFilters, type);
              const preset = FILTER_PRESETS.find((p) => p.type === type)!;
              return (
                <button
                  key={type}
                  onClick={() => active ? removeFilter(type) : applyFilter(type, 100)}
                  className="px-2 py-2 rounded text-xs font-medium text-center transition-all hover:opacity-80"
                  style={{
                    backgroundColor: active ? 'var(--theme-pill-active-bg)' : 'var(--theme-background)',
                    color: active ? 'var(--theme-pill-active-text)' : 'var(--theme-muted)',
                    border: `1px solid ${active ? 'transparent' : 'var(--theme-border)'}`,
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Intensity filters — with slider */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
            Adjustments
          </p>
          {INTENSITY_FILTERS.map((type) => {
            const active = isActive(activeFilters, type);
            const intensity = getIntensity(activeFilters, type);
            const preset = FILTER_PRESETS.find((p) => p.type === type)!;
            const isBlur = type === 'Blur';

            return (
              <div key={type}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-medium" style={{ color: 'var(--theme-foreground)' }}>
                    {preset.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]" style={{ color: 'var(--theme-muted)' }}>
                      {active
                        ? isBlur
                          ? `${intensity}%`
                          : `${Math.round(intensity - 50 > 0 ? intensity - 50 : intensity - 50)}%`
                        : 'off'}
                    </span>
                    {active && (
                      <button
                        onClick={() => removeFilter(type)}
                        className="text-[10px] hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--theme-muted)' }}
                        title={`Remove ${preset.label} filter`}
                      >
                        x
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={active ? intensity : isBlur ? 0 : 50}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    // For Brightness/Contrast/Saturation: neutral is 50 — don't apply if at 50 and not active
                    if (!isBlur && v === 50 && !active) return;
                    applyFilter(type, v);
                  }}
                  className="w-full accent-indigo-500"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
