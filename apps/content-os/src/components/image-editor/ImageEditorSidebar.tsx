'use client';

import { CANVAS_PRESETS, SHAPE_DEFS, type ShapeProperties, type UseImageEditorReturn } from './useImageEditor';
import { LayerPanel } from './LayerPanel';

interface ImageEditorSidebarProps {
  editor: UseImageEditorReturn;
}

// ---------------------------------------------------------------------------
// Shape Properties Panel
// ---------------------------------------------------------------------------

interface ShapePropertiesPanelProps {
  props: ShapeProperties;
  isRect: boolean;
  onUpdate: (key: keyof ShapeProperties, value: string | number) => void;
}

function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] mb-1" style={{ color: 'var(--theme-muted)' }}>
      {children}
    </label>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <SidebarLabel>{label}</SidebarLabel>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith('#') ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border-0 flex-shrink-0"
          style={{ backgroundColor: 'transparent' }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
          className="flex-1 px-2 py-1 rounded text-xs font-mono"
          style={{
            backgroundColor: 'var(--theme-background)',
            border: '1px solid var(--theme-border)',
            color: 'var(--theme-foreground)',
          }}
          maxLength={7}
        />
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <SidebarLabel>{label}</SidebarLabel>
        <span className="text-[10px]" style={{ color: 'var(--theme-muted)' }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-500"
      />
    </div>
  );
}

function ShapePropertiesPanel({ props, isRect, onUpdate }: ShapePropertiesPanelProps) {
  return (
    <div className="p-4 space-y-4" style={{ borderBottom: '1px solid var(--theme-border)' }}>
      <h3
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--theme-muted)' }}
      >
        Shape Properties
      </h3>

      <ColorRow
        label="Fill Color"
        value={props.fill}
        onChange={(v) => onUpdate('fill', v)}
      />

      <ColorRow
        label="Stroke Color"
        value={props.stroke}
        onChange={(v) => onUpdate('stroke', v)}
      />

      <SliderRow
        label="Stroke Width"
        value={props.strokeWidth}
        min={0}
        max={40}
        unit="px"
        onChange={(v) => onUpdate('strokeWidth', v)}
      />

      <SliderRow
        label="Opacity"
        value={props.opacity}
        min={0}
        max={100}
        unit="%"
        onChange={(v) => onUpdate('opacity', v)}
      />

      {isRect && (
        <SliderRow
          label="Corner Radius"
          value={props.rx}
          min={0}
          max={100}
          unit="px"
          onChange={(v) => onUpdate('rx', v)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shapes palette in sidebar
// ---------------------------------------------------------------------------

function ShapesPalette({ onAddShape }: { onAddShape: (id: UseImageEditorReturn['activeTool']) => void }) {
  return (
    <div className="p-4" style={{ borderBottom: '1px solid var(--theme-border)' }}>
      <h3
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'var(--theme-muted)' }}
      >
        Shapes
      </h3>
      <div className="grid grid-cols-5 gap-1.5">
        {SHAPE_DEFS.map((shape) => (
          <button
            key={shape.id}
            onClick={() => onAddShape(shape.id)}
            className="flex flex-col items-center gap-1 p-2 rounded transition-all hover:opacity-80"
            style={{
              border: '1px solid var(--theme-border)',
              backgroundColor: 'var(--theme-background)',
            }}
            title={shape.label}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: 'var(--theme-foreground)' }}
            >
              <path d={shape.iconPath} />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main sidebar
// ---------------------------------------------------------------------------

export function ImageEditorSidebar({ editor }: ImageEditorSidebarProps) {
  const isRectSelected = editor.activeTool === 'rectangle' && editor.selectedShapeProps !== null;

  return (
    <div
      className="w-[260px] flex flex-col overflow-y-auto"
      style={{
        borderLeft: '1px solid var(--theme-border)',
        backgroundColor: 'var(--theme-surface)',
      }}
    >
      {/* Shape properties — shown when a non-text object is selected */}
      {editor.selectedShapeProps && (
        <ShapePropertiesPanel
          props={editor.selectedShapeProps}
          isRect={isRectSelected}
          onUpdate={editor.updateShapeProperty}
        />
      )}

      {/* Shapes palette */}
      <ShapesPalette onAddShape={editor.addShape} />

      {/* Canvas Size Presets */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--theme-border)' }}>
        <h3
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--theme-muted)' }}
        >
          Canvas Size
        </h3>
        <div className="space-y-1">
          {CANVAS_PRESETS.map((preset) => {
            const isActive =
              editor.canvasWidth === preset.width &&
              editor.canvasHeight === preset.height;
            return (
              <button
                key={preset.label}
                onClick={() => editor.setCanvasSize(preset.width, preset.height)}
                className="w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-all"
                style={{
                  backgroundColor: isActive ? 'var(--theme-pill-active-bg)' : 'transparent',
                  color: isActive ? 'var(--theme-pill-active-text)' : 'var(--theme-foreground)',
                }}
              >
                <span className="font-medium">{preset.label}</span>
                <span style={{ color: isActive ? 'var(--theme-pill-active-text)' : 'var(--theme-muted)' }}>
                  {preset.width}x{preset.height}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Size */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--theme-border)' }}>
        <h3
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--theme-muted)' }}
        >
          Custom Size
        </h3>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-[10px] mb-1" style={{ color: 'var(--theme-muted)' }}>
              Width
            </label>
            <input
              type="number"
              value={editor.canvasWidth}
              onChange={(e) => {
                const w = parseInt(e.target.value) || 100;
                editor.setCanvasSize(w, editor.canvasHeight);
              }}
              className="w-full px-2 py-1.5 rounded text-xs"
              style={{
                backgroundColor: 'var(--theme-background)',
                border: '1px solid var(--theme-border)',
                color: 'var(--theme-foreground)',
              }}
              min={100}
              max={4096}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] mb-1" style={{ color: 'var(--theme-muted)' }}>
              Height
            </label>
            <input
              type="number"
              value={editor.canvasHeight}
              onChange={(e) => {
                const h = parseInt(e.target.value) || 100;
                editor.setCanvasSize(editor.canvasWidth, h);
              }}
              className="w-full px-2 py-1.5 rounded text-xs"
              style={{
                backgroundColor: 'var(--theme-background)',
                border: '1px solid var(--theme-border)',
                color: 'var(--theme-foreground)',
              }}
              min={100}
              max={4096}
            />
          </div>
        </div>
      </div>

      {/* Background Color */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--theme-border)' }}>
        <h3
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--theme-muted)' }}
        >
          Background
        </h3>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={editor.backgroundColor}
            onChange={(e) => editor.setBackgroundColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0"
            style={{ backgroundColor: 'transparent' }}
            title="Background color"
          />
          <input
            type="text"
            value={editor.backgroundColor}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                editor.setBackgroundColor(v);
              }
            }}
            className="flex-1 px-2 py-1.5 rounded text-xs font-mono"
            style={{
              backgroundColor: 'var(--theme-background)',
              border: '1px solid var(--theme-border)',
              color: 'var(--theme-foreground)',
            }}
            maxLength={7}
          />
        </div>
        <div className="flex gap-1.5 mt-3">
          {['#ffffff', '#000000', '#f3f4f6', '#1f2937', '#dc2626', '#2563eb', '#16a34a', '#d4f85a'].map(
            (color) => (
              <button
                key={color}
                onClick={() => editor.setBackgroundColor(color)}
                className="w-6 h-6 rounded-full border transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: editor.backgroundColor === color ? 'var(--theme-primary)' : 'var(--theme-border)',
                  borderWidth: editor.backgroundColor === color ? '2px' : '1px',
                }}
                title={color}
              />
            )
          )}
        </div>
      </div>

      {/* No selection state */}
      {!editor.selectedShapeProps && (
        <div className="p-4">
          <h3
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--theme-muted)' }}
          >
            Properties
          </h3>
          <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
            Select an object to edit its properties.
          </p>
        </div>
      )}

      {/* Layers panel */}
      <div
        className="flex flex-col flex-1 min-h-[120px]"
        style={{ borderTop: '1px solid var(--theme-border)' }}
      >
        <div className="px-4 pt-4 pb-1">
          <h3
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--theme-muted)' }}
          >
            Layers
          </h3>
        </div>
        <LayerPanel editor={editor} />
      </div>
    </div>
  );
}
