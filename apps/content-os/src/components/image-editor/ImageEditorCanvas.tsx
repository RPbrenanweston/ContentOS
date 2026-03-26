'use client';

import { useEffect, useRef, useState } from 'react';
import type { UseImageEditorReturn } from './useImageEditor';

interface ImageEditorCanvasProps {
  editor: UseImageEditorReturn;
}

export function ImageEditorCanvas({ editor }: ImageEditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;
    editor.initCanvas(containerRef.current);

    return () => {
      editor.disposeCanvas();
      initializedRef.current = false;
    };
  }, [editor]);

  // Wire up drag-and-drop on the canvas container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Only highlight if files are being dragged
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragOver(true);
      }
    };

    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      // Only clear if leaving the container entirely
      if (!container.contains(e.relatedTarget as Node)) {
        setIsDragOver(false);
      }
    };

    const onDrop = (e: DragEvent) => {
      setIsDragOver(false);
      editor.handleImageDrop(e);
    };

    container.addEventListener('dragover', onDragOver);
    container.addEventListener('dragleave', onDragLeave);
    container.addEventListener('drop', onDrop);

    return () => {
      container.removeEventListener('dragover', onDragOver);
      container.removeEventListener('dragleave', onDragLeave);
      container.removeEventListener('drop', onDrop);
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
          Scroll to zoom | Alt+drag to pan | Drop images here
        </span>
      </div>

      {/* Canvas container with drag-and-drop support */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden transition-all"
        style={{
          backgroundColor: 'var(--theme-background)',
          backgroundImage:
            'radial-gradient(circle, var(--theme-border) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          outline: isDragOver ? '2px dashed var(--theme-primary)' : undefined,
          outlineOffset: isDragOver ? '-4px' : undefined,
        }}
      >
        <canvas ref={editor.canvasRef} />

        {/* Drop overlay */}
        {isDragOver && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              backgroundColor: 'rgba(var(--theme-primary-rgb, 99 102 241) / 0.08)',
            }}
          >
            <div
              className="flex flex-col items-center gap-2 px-6 py-4 rounded-lg"
              style={{
                backgroundColor: 'var(--theme-surface)',
                border: '2px dashed var(--theme-primary)',
                color: 'var(--theme-foreground)',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="text-sm font-medium">Drop image to add to canvas</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
