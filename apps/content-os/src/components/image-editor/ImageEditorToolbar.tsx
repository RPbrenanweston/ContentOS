'use client';

import { useState, useRef, useEffect } from 'react';
import type { EditorTool, UseImageEditorReturn } from './useImageEditor';
import { SHAPE_DEFS } from './useImageEditor';

interface ImageEditorToolbarProps {
  editor: UseImageEditorReturn;
}

const SHAPE_TOOL_IDS = new Set<EditorTool>([
  'rectangle', 'circle', 'triangle', 'line', 'arrow',
  'star', 'hexagon', 'diamond', 'heart', 'speech-bubble',
]);

function Divider() {
  return (
    <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--theme-border)' }} />
  );
}

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ActionButton({ onClick, disabled, title, children }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ color: 'var(--theme-muted)' }}
      title={title}
    >
      {children}
    </button>
  );
}

/** Shapes dropdown button in the toolbar */
function ShapesDropdown({ editor }: { editor: UseImageEditorReturn }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isShapeActive = SHAPE_TOOL_IDS.has(editor.activeTool);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const activeShape = SHAPE_DEFS.find((s) => s.id === editor.activeTool);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
        style={{
          backgroundColor: isShapeActive ? 'var(--theme-pill-active-bg)' : 'transparent',
          color: isShapeActive ? 'var(--theme-pill-active-text)' : 'var(--theme-muted)',
        }}
        title="Shapes"
      >
        {activeShape ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={activeShape.iconPath} />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        )}
        <span>{activeShape ? activeShape.label : 'Shapes'}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 rounded shadow-lg p-2"
          style={{
            backgroundColor: 'var(--theme-surface)',
            border: '1px solid var(--theme-border)',
            minWidth: '180px',
          }}
        >
          <div className="grid grid-cols-2 gap-1">
            {SHAPE_DEFS.map((shape) => {
              const isActive = editor.activeTool === shape.id;
              return (
                <button
                  key={shape.id}
                  onClick={() => {
                    editor.addShape(shape.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-all text-left"
                  style={{
                    backgroundColor: isActive ? 'var(--theme-pill-active-bg)' : 'transparent',
                    color: isActive ? 'var(--theme-pill-active-text)' : 'var(--theme-foreground)',
                  }}
                  title={shape.label}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={shape.iconPath} />
                  </svg>
                  <span>{shape.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function ImageEditorToolbar({ editor }: ImageEditorToolbarProps) {
  return (
    <div
      className="flex items-center gap-1 px-4 py-2"
      style={{
        borderBottom: '1px solid var(--theme-border)',
        backgroundColor: 'var(--theme-surface)',
      }}
    >
      <span
        className="text-xs font-semibold mr-3 tracking-tight"
        style={{ color: 'var(--theme-foreground)' }}
      >
        Image Editor
      </span>

      <Divider />

      {/* Select tool */}
      <button
        onClick={() => editor.setActiveTool('select')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
        style={{
          backgroundColor: editor.activeTool === 'select' ? 'var(--theme-pill-active-bg)' : 'transparent',
          color: editor.activeTool === 'select' ? 'var(--theme-pill-active-text)' : 'var(--theme-muted)',
        }}
        title="Select"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          <path d="M13 13l6 6" />
        </svg>
        <span>Select</span>
      </button>

      {/* Text tool */}
      <button
        onClick={() => editor.setActiveTool('text')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
        style={{
          backgroundColor: editor.activeTool === 'text' ? 'var(--theme-pill-active-bg)' : 'transparent',
          color: editor.activeTool === 'text' ? 'var(--theme-pill-active-text)' : 'var(--theme-muted)',
        }}
        title="Text"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" y1="20" x2="15" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
        <span>Text</span>
      </button>

      {/* Shapes dropdown */}
      <ShapesDropdown editor={editor} />

      <Divider />

      {/* Undo */}
      <ActionButton onClick={editor.undo} disabled={!editor.canUndo} title="Undo (Ctrl+Z)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 14 4 9 9 4" />
          <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
        </svg>
        <span>Undo</span>
      </ActionButton>

      {/* Redo */}
      <ActionButton onClick={editor.redo} disabled={!editor.canRedo} title="Redo (Ctrl+Shift+Z)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 14 20 9 15 4" />
          <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
        </svg>
        <span>Redo</span>
      </ActionButton>

      <Divider />

      {/* Save */}
      <ActionButton onClick={editor.saveToLocal} title="Save to browser (Ctrl+S)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        <span>Save</span>
      </ActionButton>

      {/* Load */}
      <ActionButton onClick={editor.loadFromLocal} title="Load from browser">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span>Load</span>
      </ActionButton>

      {/* Export JSON */}
      <ActionButton onClick={editor.exportJSON} title="Export as JSON file">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>Export JSON</span>
      </ActionButton>
    </div>
  );
}
