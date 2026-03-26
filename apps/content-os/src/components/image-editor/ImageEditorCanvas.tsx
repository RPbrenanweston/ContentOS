'use client';

import { useEffect, useRef } from 'react';
import type { UseImageEditorReturn } from './useImageEditor';

interface ImageEditorCanvasProps {
  editor: UseImageEditorReturn;
}

export function ImageEditorCanvas({ editor }: ImageEditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;
    editor.initCanvas(containerRef.current);

    return () => {
      editor.disposeCanvas();
      initializedRef.current = false;
    };
  }, [editor]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Zoom controls bar */}
      <div
        className="flex items-center justify-between px-4 py-2 text-xs"
        style={{
          borderBottom: '1px solid var(--theme-border)',
          backgroundColor: 'var(--theme-surface)',
          color: 'var(--theme-muted)',
        }}
      >
        <span>
          {editor.canvasWidth} x {editor.canvasHeight}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={editor.zoomOut}
            className="px-2 py-1 rounded hover:opacity-80 transition-opacity"
            style={{
              border: '1px solid var(--theme-border)',
              color: 'var(--theme-foreground)',
            }}
            title="Zoom out"
          >
            -
          </button>
          <button
            onClick={editor.resetZoom}
            className="px-2 py-1 rounded hover:opacity-80 transition-opacity min-w-[60px] text-center"
            style={{
              border: '1px solid var(--theme-border)',
              color: 'var(--theme-foreground)',
            }}
            title="Reset zoom"
          >
            {Math.round(editor.zoom * 100)}%
          </button>
          <button
            onClick={editor.zoomIn}
            className="px-2 py-1 rounded hover:opacity-80 transition-opacity"
            style={{
              border: '1px solid var(--theme-border)',
              color: 'var(--theme-foreground)',
            }}
            title="Zoom in"
          >
            +
          </button>
        </div>
        <span className="text-[10px]" style={{ color: 'var(--theme-muted)' }}>
          Scroll to zoom | Alt+drag to pan
        </span>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{
          backgroundColor: 'var(--theme-background)',
          backgroundImage:
            'radial-gradient(circle, var(--theme-border) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <canvas ref={editor.canvasRef} />
      </div>
    </div>
  );
}
