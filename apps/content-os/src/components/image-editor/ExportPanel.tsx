'use client';

// @crumb image-editor-export-panel
// UI | image-editor | export-panel
// why: Canvas export to PNG/JPG/SVG/WebP with quality control and browser file download
// in:[format-selection,quality-slider,export-click] out:[file-download] err:[no-canvas]
// hazard: Export resets viewport transform temporarily — must restore to avoid display glitch

import { useState } from 'react';
import type { ExportFormat, UseImageEditorReturn } from './useImageEditor';

interface ExportPanelProps {
  editor: UseImageEditorReturn;
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; supportsQuality: boolean }[] = [
  { value: 'png',  label: 'PNG',  supportsQuality: false },
  { value: 'jpeg', label: 'JPG',  supportsQuality: true  },
  { value: 'webp', label: 'WebP', supportsQuality: true  },
  { value: 'svg',  label: 'SVG',  supportsQuality: false },
];

export function ExportPanel({ editor }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [quality, setQuality] = useState(90);

  const selectedFormat = FORMAT_OPTIONS.find((f) => f.value === format)!;

  const handleExport = () => {
    editor.exportCanvas(format, quality / 100);
  };

  return (
    <div className="p-4" style={{ borderBottom: '1px solid var(--theme-border)' }}>
      <h3
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'var(--theme-muted)' }}
      >
        Export
      </h3>

      {/* Format selector */}
      <div className="mb-3">
        <label
          className="block text-[10px] mb-1.5"
          style={{ color: 'var(--theme-muted)' }}
        >
          Format
        </label>
        <div className="grid grid-cols-4 gap-1">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFormat(opt.value)}
              className="px-2 py-1.5 rounded text-[10px] font-medium transition-all"
              style={{
                backgroundColor:
                  format === opt.value
                    ? 'var(--theme-pill-active-bg)'
                    : 'var(--theme-background)',
                color:
                  format === opt.value
                    ? 'var(--theme-pill-active-text)'
                    : 'var(--theme-foreground)',
                border: '1px solid var(--theme-border)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quality slider — only for JPG and WebP */}
      {selectedFormat.supportsQuality && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px]" style={{ color: 'var(--theme-muted)' }}>
              Quality
            </label>
            <span
              className="text-[10px] font-mono"
              style={{ color: 'var(--theme-foreground)' }}
            >
              {quality}%
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full"
            aria-label="Export quality"
          />
        </div>
      )}

      {/* Canvas dimensions info */}
      <p className="text-[10px] mb-3" style={{ color: 'var(--theme-muted)' }}>
        Output: {editor.canvasWidth} x {editor.canvasHeight}px
      </p>

      {/* Export button */}
      <button
        onClick={handleExport}
        className="w-full px-3 py-2 rounded text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
        style={{
          backgroundColor: 'var(--theme-primary)',
          color: 'var(--theme-primary-foreground, #ffffff)',
        }}
      >
        Download {selectedFormat.label}
      </button>
    </div>
  );
}
