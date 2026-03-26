'use client';

import { useState, useRef, useCallback } from 'react';
import type { FabricObject } from 'fabric';
import type { LayerInfo, UseImageEditorReturn } from './useImageEditor';

interface LayerPanelProps {
  editor: UseImageEditorReturn;
}

function typeIcon(type: string): string {
  switch (type) {
    case 'textbox':
    case 'i-text':
    case 'text':
      return 'T';
    case 'rect':
      return '\u25A1';
    case 'circle':
      return '\u25CB';
    case 'triangle':
      return '\u25B3';
    case 'image':
      return '\uD83D\uDDBC';
    case 'line':
      return '/';
    case 'path':
    case 'polygon':
      return '\u2B21';
    default:
      return '\u25A2';
  }
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function LockIcon({ locked }: { locked: boolean }) {
  if (locked) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

interface LayerRowProps {
  layer: LayerInfo;
  isActive: boolean;
  dragIndex: number;
  onDragStart: (e: React.DragEvent, idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
  dragOverIndex: number | null;
  onClick: (obj: FabricObject) => void;
  onToggleVisibility: (obj: FabricObject) => void;
  onToggleLock: (obj: FabricObject) => void;
  onDelete: (obj: FabricObject) => void;
  onDuplicate: (obj: FabricObject) => void;
  onRename: (obj: FabricObject, name: string) => void;
}

function LayerRow({
  layer,
  isActive,
  dragIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dragOverIndex,
  onClick,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onDuplicate,
  onRename,
}: LayerRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(layer.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(layer.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }, [layer.name]);

  const commitEdit = useCallback(() => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== layer.name) {
      onRename(layer.object, trimmed);
    }
    setEditing(false);
  }, [editName, layer.name, layer.object, onRename]);

  const isDragOver = dragOverIndex === dragIndex;
  const isBeingDragged = false; // We don't track which item is dragged in state here

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, dragIndex)}
      onDragOver={(e) => onDragOver(e, dragIndex)}
      onDrop={(e) => onDrop(e, dragIndex)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(layer.object)}
      className="group flex items-center gap-1.5 px-2 py-1.5 cursor-pointer select-none transition-colors"
      style={{
        backgroundColor: isActive
          ? 'var(--theme-pill-active-bg, rgba(100,100,255,0.15))'
          : 'transparent',
        borderTop: isDragOver ? '2px solid var(--theme-primary, #6366f1)' : '2px solid transparent',
        opacity: layer.visible ? 1 : 0.45,
      }}
      title={layer.name}
    >
      {/* Drag handle */}
      <span
        className="text-[10px] opacity-30 group-hover:opacity-60 cursor-grab active:cursor-grabbing"
        style={{ color: 'var(--theme-muted)' }}
      >
        &#8942;&#8942;
      </span>

      {/* Visibility toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.object); }}
        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        style={{ color: layer.visible ? 'var(--theme-foreground)' : 'var(--theme-muted)' }}
        title={layer.visible ? 'Hide layer' : 'Show layer'}
      >
        <EyeIcon open={layer.visible} />
      </button>

      {/* Lock toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleLock(layer.object); }}
        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        style={{ color: layer.locked ? 'var(--theme-primary, #6366f1)' : 'var(--theme-muted)' }}
        title={layer.locked ? 'Unlock layer' : 'Lock layer'}
      >
        <LockIcon locked={layer.locked} />
      </button>

      {/* Type icon */}
      <span
        className="flex-shrink-0 w-5 text-center text-[11px] font-mono"
        style={{ color: 'var(--theme-muted)' }}
      >
        {typeIcon(layer.type)}
      </span>

      {/* Name — double-click to rename */}
      <div className="flex-1 min-w-0" onDoubleClick={startEdit}>
        {editing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') setEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-1 py-0 text-xs rounded"
            style={{
              background: 'var(--theme-background)',
              border: '1px solid var(--theme-primary, #6366f1)',
              color: 'var(--theme-foreground)',
              outline: 'none',
            }}
            autoFocus
          />
        ) : (
          <span
            className="block truncate text-xs"
            style={{ color: 'var(--theme-foreground)' }}
          >
            {layer.name}
          </span>
        )}
      </div>

      {/* Action buttons — shown on hover */}
      <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(layer.object); }}
          className="p-0.5 rounded hover:opacity-80 transition-opacity"
          style={{ color: 'var(--theme-muted)' }}
          title="Duplicate layer"
        >
          <CopyIcon />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(layer.object); }}
          className="p-0.5 rounded hover:opacity-80 transition-opacity"
          style={{ color: '#dc2626' }}
          title="Delete layer"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

export function LayerPanel({ editor }: LayerPanelProps) {
  const { layers, fabricRef } = editor;
  const dragSourceIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Determine which layer is currently active on canvas
  const activeObject = fabricRef.current?.getActiveObject();

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    dragSourceIndex.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(idx);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const sourceIdx = dragSourceIndex.current;
    if (sourceIdx === null || sourceIdx === targetIdx) {
      setDragOverIndex(null);
      dragSourceIndex.current = null;
      return;
    }

    const sourceLayer = layers[sourceIdx];
    if (!sourceLayer) {
      setDragOverIndex(null);
      dragSourceIndex.current = null;
      return;
    }

    // layers[] is reversed (index 0 = front). canvas._objects index 0 = back.
    // sourceLayer.index is the canvas _objects index.
    // targetIdx in our UI list corresponds to layers[targetIdx].index canvas index.
    const targetLayer = layers[targetIdx];
    if (!targetLayer) {
      setDragOverIndex(null);
      dragSourceIndex.current = null;
      return;
    }

    editor.reorderLayer(sourceLayer.object, targetLayer.index);
    setDragOverIndex(null);
    dragSourceIndex.current = null;
  }, [layers, editor]);

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null);
    dragSourceIndex.current = null;
  }, []);

  if (layers.length === 0) {
    return (
      <div className="p-3 text-center">
        <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
          No layers yet. Add objects to the canvas.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden flex-1">
      {/* Toolbar row */}
      <div
        className="flex items-center justify-between px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
        style={{
          color: 'var(--theme-muted)',
          borderBottom: '1px solid var(--theme-border)',
        }}
      >
        <span>{layers.length} layer{layers.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Layer list */}
      <div className="overflow-y-auto flex-1">
        {layers.map((layer, idx) => (
          <LayerRow
            key={layer.id}
            layer={layer}
            isActive={layer.object === activeObject}
            dragIndex={idx}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            dragOverIndex={dragOverIndex}
            onClick={editor.selectLayer}
            onToggleVisibility={editor.toggleLayerVisibility}
            onToggleLock={editor.toggleLayerLock}
            onDelete={editor.deleteLayer}
            onDuplicate={editor.duplicateLayer}
            onRename={editor.renameLayer}
          />
        ))}
      </div>
    </div>
  );
}
