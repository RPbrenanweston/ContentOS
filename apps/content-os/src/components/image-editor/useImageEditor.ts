'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas as FabricCanvas, Point, Textbox } from 'fabric';

export type EditorTool = 'select' | 'text' | 'rectangle' | 'circle' | 'line';

export interface CanvasPreset {
  label: string;
  width: number;
  height: number;
}

export const CANVAS_PRESETS: CanvasPreset[] = [
  { label: 'Instagram Post', width: 1080, height: 1080 },
  { label: 'Instagram Story', width: 1080, height: 1920 },
  { label: 'LinkedIn Post', width: 1200, height: 627 },
  { label: 'Twitter Post', width: 1600, height: 900 },
  { label: 'Blog Header', width: 1200, height: 630 },
];

const MAX_HISTORY = 50;
const LOCAL_STORAGE_KEY = 'contentos-image-editor-canvas';

export const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Impact',
  'Comic Sans MS',
  'Palatino',
  'Garamond',
  'Bookman',
  'Tahoma',
  'Lucida Console',
  'Gill Sans',
];

export const TEXT_PRESET_COLORS = [
  '#000000',
  '#ffffff',
  '#dc2626',
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#7c3aed',
  '#db2777',
];

export interface TextProperties {
  fontFamily: string;
  fontSize: number;
  fill: string;
  fontWeight: string;
  fontStyle: string;
  underline: boolean;
  textAlign: string;
}

export interface UseImageEditorReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  fabricRef: React.RefObject<FabricCanvas | null>;
  activeTool: EditorTool;
  setActiveTool: (tool: EditorTool) => void;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  selectedTextProps: TextProperties | null;
  setCanvasSize: (width: number, height: number) => void;
  setBackgroundColor: (color: string) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  initCanvas: (container: HTMLDivElement) => void;
  disposeCanvas: () => void;
  undo: () => void;
  redo: () => void;
  captureState: () => void;
  saveToLocal: () => void;
  loadFromLocal: () => void;
  exportJSON: () => void;
  updateTextProperty: <K extends keyof TextProperties>(key: K, value: TextProperties[K]) => void;
}

export function useImageEditor(): UseImageEditorReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Keep a ref so canvas event handlers always see the current tool
  const activeToolRef = useRef<EditorTool>('select');

  const historyStack = useRef<object[]>([]);
  const redoStack = useRef<object[]>([]);

  const [activeTool, setActiveToolState] = useState<EditorTool>('select');
  const [canvasWidth, setCanvasWidth] = useState(1080);
  const [canvasHeight, setCanvasHeight] = useState(1080);
  const [backgroundColor, setBackgroundColorState] = useState('#ffffff');
  const [zoom, setZoom] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [selectedTextProps, setSelectedTextProps] = useState<TextProperties | null>(null);

  const setActiveTool = useCallback((tool: EditorTool) => {
    activeToolRef.current = tool;
    setActiveToolState(tool);
  }, []);

  const readTextProps = useCallback((obj: Textbox): TextProperties => ({
    fontFamily: (obj.fontFamily as string) || 'Arial',
    fontSize: (obj.fontSize as number) || 24,
    fill: (obj.fill as string) || '#000000',
    fontWeight: (obj.fontWeight as string) || 'normal',
    fontStyle: (obj.fontStyle as string) || 'normal',
    underline: (obj.underline as boolean) || false,
    textAlign: (obj.textAlign as string) || 'left',
  }), []);

  const syncHistoryState = useCallback(() => {
    setCanUndo(historyStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const captureState = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    const snapshot = fc.toObject();
    historyStack.current.push(snapshot);
    if (historyStack.current.length > MAX_HISTORY) {
      historyStack.current.shift();
    }
    redoStack.current = [];
    syncHistoryState();
  }, [syncHistoryState]);

  const undo = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || historyStack.current.length === 0) return;

    const currentSnapshot = fc.toObject();
    redoStack.current.push(currentSnapshot);

    const previousSnapshot = historyStack.current.pop()!;
    fc.loadFromJSON(previousSnapshot).then(() => {
      fc.requestRenderAll();
      syncHistoryState();
    });
  }, [syncHistoryState]);

  const redo = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || redoStack.current.length === 0) return;

    const currentSnapshot = fc.toObject();
    historyStack.current.push(currentSnapshot);
    if (historyStack.current.length > MAX_HISTORY) {
      historyStack.current.shift();
    }

    const nextSnapshot = redoStack.current.pop()!;
    fc.loadFromJSON(nextSnapshot).then(() => {
      fc.requestRenderAll();
      syncHistoryState();
    });
  }, [syncHistoryState]);

  const saveToLocal = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    const json = JSON.stringify(fc.toJSON());
    localStorage.setItem(LOCAL_STORAGE_KEY, json);
  }, []);

  const loadFromLocal = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as object;
      fc.loadFromJSON(parsed).then(() => {
        fc.requestRenderAll();
      });
    } catch {
      // Silently ignore malformed localStorage data
    }
  }, []);

  const exportJSON = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    const json = JSON.stringify(fc.toJSON(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canvas-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const initCanvas = useCallback((container: HTMLDivElement) => {
    if (fabricRef.current) return;
    if (!canvasRef.current) return;

    containerRef.current = container;

    const fc = new FabricCanvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#ffffff',
      selection: true,
    });

    // Fit canvas view to container
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const scale = Math.min(
      (containerWidth - 80) / canvasWidth,
      (containerHeight - 80) / canvasHeight,
      1
    );
    fc.setZoom(scale);
    setZoom(scale);

    // Center the canvas viewport
    const vpw = canvasWidth * scale;
    const vph = canvasHeight * scale;
    const panX = (containerWidth - vpw) / 2;
    const panY = (containerHeight - vph) / 2;
    fc.viewportTransform = [scale, 0, 0, scale, panX, panY];

    // Mouse wheel zoom
    fc.on('mouse:wheel', (opt) => {
      const e = opt.e as WheelEvent;
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY;
      let newZoom = fc.getZoom();
      newZoom *= 0.999 ** delta;
      newZoom = Math.max(0.1, Math.min(5, newZoom));

      fc.zoomToPoint(new Point(e.offsetX, e.offsetY), newZoom);
      setZoom(newZoom);
      fc.requestRenderAll();
    });

    // Pan with middle mouse button or alt+drag
    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;

    fc.on('mouse:down', (opt) => {
      const e = opt.e as MouseEvent;

      // Text tool: place a new Textbox at click position
      if (activeToolRef.current === 'text') {
        const pointer = fc.getViewportPoint(e);
        const textbox = new Textbox('Text', {
          left: pointer.x,
          top: pointer.y,
          fontFamily: 'Arial',
          fontSize: 24,
          fill: '#000000',
          width: 200,
          editable: true,
        });
        fc.add(textbox);
        fc.setActiveObject(textbox);
        textbox.enterEditing();
        textbox.selectAll();
        fc.requestRenderAll();
        // Switch back to select after placing text
        activeToolRef.current = 'select';
        setActiveToolState('select');
        return;
      }

      if (e.button === 1 || (e.altKey && e.button === 0)) {
        isPanning = true;
        lastPosX = e.clientX;
        lastPosY = e.clientY;
        fc.selection = false;
      }
    });

    fc.on('mouse:move', (opt) => {
      if (!isPanning) return;
      const e = opt.e as MouseEvent;
      const vpt = fc.viewportTransform;
      if (!vpt) return;
      vpt[4] += e.clientX - lastPosX;
      vpt[5] += e.clientY - lastPosY;
      lastPosX = e.clientX;
      lastPosY = e.clientY;
      fc.requestRenderAll();
    });

    fc.on('mouse:up', () => {
      isPanning = false;
      fc.selection = true;
    });

    // Capture history after modifications
    fc.on('object:added', () => captureState());
    fc.on('object:removed', () => captureState());
    fc.on('object:modified', () => captureState());

    fabricRef.current = fc;
    fc.requestRenderAll();
  }, [canvasWidth, canvasHeight, captureState]);

  const disposeCanvas = useCallback(() => {
    if (fabricRef.current) {
      fabricRef.current.dispose();
      fabricRef.current = null;
    }
  }, []);

  const setCanvasSize = useCallback((width: number, height: number) => {
    setCanvasWidth(width);
    setCanvasHeight(height);

    const fc = fabricRef.current;
    const container = containerRef.current;
    if (!fc || !container) return;

    fc.setDimensions({ width, height });

    // Recalculate fit
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const scale = Math.min(
      (containerWidth - 80) / width,
      (containerHeight - 80) / height,
      1
    );

    const vpw = width * scale;
    const vph = height * scale;
    const panX = (containerWidth - vpw) / 2;
    const panY = (containerHeight - vph) / 2;
    fc.viewportTransform = [scale, 0, 0, scale, panX, panY];
    fc.setZoom(scale);
    setZoom(scale);
    fc.requestRenderAll();
  }, []);

  const setBackgroundColor = useCallback((color: string) => {
    setBackgroundColorState(color);
    const fc = fabricRef.current;
    if (!fc) return;
    fc.backgroundColor = color;
    fc.requestRenderAll();
  }, []);

  const zoomIn = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const newZoom = Math.min(fc.getZoom() * 1.2, 5);
    const center = fc.getCenterPoint();
    fc.zoomToPoint(center, newZoom);
    setZoom(newZoom);
    fc.requestRenderAll();
  }, []);

  const zoomOut = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const newZoom = Math.max(fc.getZoom() / 1.2, 0.1);
    const center = fc.getCenterPoint();
    fc.zoomToPoint(center, newZoom);
    setZoom(newZoom);
    fc.requestRenderAll();
  }, []);

  const resetZoom = useCallback(() => {
    const fc = fabricRef.current;
    const container = containerRef.current;
    if (!fc || !container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const scale = Math.min(
      (containerWidth - 80) / canvasWidth,
      (containerHeight - 80) / canvasHeight,
      1
    );
    const vpw = canvasWidth * scale;
    const vph = canvasHeight * scale;
    const panX = (containerWidth - vpw) / 2;
    const panY = (containerHeight - vph) / 2;
    fc.viewportTransform = [scale, 0, 0, scale, panX, panY];
    fc.setZoom(scale);
    setZoom(scale);
    fc.requestRenderAll();
  }, [canvasWidth, canvasHeight]);

  // Update tool behavior
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    if (activeTool === 'select') {
      fc.selection = true;
      fc.defaultCursor = 'default';
      fc.hoverCursor = 'move';
    } else {
      fc.selection = false;
      fc.defaultCursor = 'crosshair';
      fc.hoverCursor = 'crosshair';
    }
  }, [activeTool]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (ctrlOrCmd && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      }

      if (ctrlOrCmd && e.key === 's') {
        e.preventDefault();
        saveToLocal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, saveToLocal]);

  return {
    canvasRef,
    fabricRef,
    activeTool,
    setActiveTool,
    canvasWidth,
    canvasHeight,
    backgroundColor,
    zoom,
    canUndo,
    canRedo,
    setCanvasSize,
    setBackgroundColor,
    zoomIn,
    zoomOut,
    resetZoom,
    initCanvas,
    disposeCanvas,
    undo,
    redo,
    captureState,
    saveToLocal,
    loadFromLocal,
    exportJSON,
  };
}
