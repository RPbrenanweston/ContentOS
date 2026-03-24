'use client';

import type { DrawingTool } from './DrawingCanvas';

interface DrawingToolbarProps {
  activeTool: DrawingTool | null;
  onSelectTool: (tool: DrawingTool | null) => void;
  onClear: () => void;
  onUndo: () => void;
}

export function DrawingToolbar({ activeTool, onSelectTool, onClear, onUndo }: DrawingToolbarProps) {
  const tools: { id: DrawingTool; label: string; icon: string }[] = [
    { id: 'pen', label: 'DRAW', icon: '/' },
    { id: 'circle', label: 'CIRCLE', icon: 'O' },
    { id: 'arrow', label: 'ARROW', icon: '>' },
  ];

  return (
    <div className="flex items-center gap-0">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onSelectTool(activeTool === tool.id ? null : tool.id)}
          className={`
            px-3 py-1.5 border border-border -ml-px first:ml-0
            font-mono text-[10px] uppercase tracking-wider
            transition-colors
            ${activeTool === tool.id
              ? 'bg-primary text-background border-primary'
              : 'text-muted hover:text-text bg-surface/50'
            }
          `}
        >
          {tool.icon} {tool.label}
        </button>
      ))}
      <button
        onClick={onUndo}
        className="px-2 py-1.5 border border-border -ml-px font-mono text-[10px] text-muted hover:text-text transition-colors"
      >
        UNDO
      </button>
      <button
        onClick={onClear}
        className="px-2 py-1.5 border border-border -ml-px font-mono text-[10px] text-accent hover:text-accent/80 transition-colors"
      >
        CLEAR
      </button>
    </div>
  );
}
