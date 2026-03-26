'use client';

import type { EditorTool, UseImageEditorReturn } from './useImageEditor';

interface ImageEditorToolbarProps {
  editor: UseImageEditorReturn;
}

interface ToolDef {
  id: EditorTool;
  label: string;
  icon: React.ReactNode;
}

const TOOLS: ToolDef[] = [
  {
    id: 'select',
    label: 'Select',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        <path d="M13 13l6 6" />
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Text',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9" y1="20" x2="15" y2="20" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    ),
  },
  {
    id: 'rectangle',
    label: 'Rectangle',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    ),
  },
  {
    id: 'circle',
    label: 'Circle',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  {
    id: 'line',
    label: 'Line',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="19" x2="19" y2="5" />
      </svg>
    ),
  },
];

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

      <div
        className="w-px h-5 mx-1"
        style={{ backgroundColor: 'var(--theme-border)' }}
      />

      {TOOLS.map((tool) => {
        const isActive = editor.activeTool === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => editor.setActiveTool(tool.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
            style={{
              backgroundColor: isActive
                ? 'var(--theme-pill-active-bg)'
                : 'transparent',
              color: isActive
                ? 'var(--theme-pill-active-text)'
                : 'var(--theme-muted)',
            }}
            title={tool.label}
          >
            {tool.icon}
            <span>{tool.label}</span>
          </button>
        );
      })}
    </div>
  );
}
