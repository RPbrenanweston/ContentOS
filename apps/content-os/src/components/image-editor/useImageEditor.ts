'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas as FabricCanvas, Point } from 'fabric';

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

export interface UseImageEditorReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  fabricRef: React.RefObject<FabricCanvas | null>;
  activeTool: EditorTool;
  setActiveTool: (tool: EditorTool) => void;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  zoom: number;
  setCanvasSize: (width: number, height: number) => void;
  setBackgroundColor: (color: string) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  initCanvas: (container: HTMLDivElement) => void;
  disposeCanvas: () => void;
}

export function useImageEditor(): UseImageEditorReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [canvasWidth, setCanvasWidth] = useState(1080);
  const [canvasHeight, setCanvasHeight] = useState(1080);
  const [backgroundColor, setBackgroundColorState] = useState('#ffffff');
  const [zoom, setZoom] = useState(1);

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

    // Pan with middle mouse button or space+drag
    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;

    fc.on('mouse:down', (opt) => {
      const e = opt.e as MouseEvent;
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

    fabricRef.current = fc;
    fc.requestRenderAll();
  }, [canvasWidth, canvasHeight]);

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

  return {
    canvasRef,
    fabricRef,
    activeTool,
    setActiveTool,
    canvasWidth,
    canvasHeight,
    backgroundColor,
    zoom,
    setCanvasSize,
    setBackgroundColor,
    zoomIn,
    zoomOut,
    resetZoom,
    initCanvas,
    disposeCanvas,
  };
}
