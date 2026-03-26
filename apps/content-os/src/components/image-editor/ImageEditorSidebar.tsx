'use client';

import { CANVAS_PRESETS, type UseImageEditorReturn } from './useImageEditor';

interface ImageEditorSidebarProps {
  editor: UseImageEditorReturn;
}

export function ImageEditorSidebar({ editor }: ImageEditorSidebarProps) {
  return (
    <div
      className="w-[260px] flex flex-col overflow-y-auto"
      style={{
        borderLeft: '1px solid var(--theme-border)',
        backgroundColor: 'var(--theme-surface)',
      }}
    >
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
                  backgroundColor: isActive
                    ? 'var(--theme-pill-active-bg)'
                    : 'transparent',
                  color: isActive
                    ? 'var(--theme-pill-active-text)'
                    : 'var(--theme-foreground)',
                }}
              >
                <span className="font-medium">{preset.label}</span>
                <span
                  style={{
                    color: isActive
                      ? 'var(--theme-pill-active-text)'
                      : 'var(--theme-muted)',
                  }}
                >
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
            <label
              className="block text-[10px] mb-1"
              style={{ color: 'var(--theme-muted)' }}
            >
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
            <label
              className="block text-[10px] mb-1"
              style={{ color: 'var(--theme-muted)' }}
            >
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
            style={{
              backgroundColor: 'transparent',
            }}
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
        {/* Quick colors */}
        <div className="flex gap-1.5 mt-3">
          {['#ffffff', '#000000', '#f3f4f6', '#1f2937', '#dc2626', '#2563eb', '#16a34a', '#d4f85a'].map(
            (color) => (
              <button
                key={color}
                onClick={() => editor.setBackgroundColor(color)}
                className="w-6 h-6 rounded-full border transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor:
                    editor.backgroundColor === color
                      ? 'var(--theme-primary)'
                      : 'var(--theme-border)',
                  borderWidth: editor.backgroundColor === color ? '2px' : '1px',
                }}
                title={color}
              />
            )
          )}
        </div>
      </div>

      {/* Properties placeholder for future stories */}
      <div className="p-4 flex-1">
        <h3
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--theme-muted)' }}
        >
          Properties
        </h3>
        <p
          className="text-xs"
          style={{ color: 'var(--theme-muted)' }}
        >
          Select an object to edit its properties.
        </p>
      </div>
    </div>
  );
}
