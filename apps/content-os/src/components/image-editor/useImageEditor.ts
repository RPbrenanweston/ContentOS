'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  Canvas as FabricCanvas,
  Point,
  Textbox,
  Rect,
  Circle,
  Triangle,
  Line,
  Polygon,
  Path,
  FabricObject,
  FabricImage,
  filters as fabricFilters,
} from 'fabric';

const { Brightness, Contrast, Saturation, Grayscale, Blur, Invert, Sepia } = fabricFilters;
import type { TemplatePreset } from './templatePresets';

export type EditorTool =
  | 'select'
  | 'text'
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'line'
  | 'arrow'
  | 'star'
  | 'hexagon'
  | 'diamond'
  | 'heart'
  | 'speech-bubble';

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

export interface ShapeProperties {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  rx: number;
}

export type ExportFormat = 'png' | 'jpeg' | 'svg' | 'webp';

// ---------------------------------------------------------------------------
// Image filters
// ---------------------------------------------------------------------------

export type FilterType =
  | 'Grayscale'
  | 'Sepia'
  | 'Blur'
  | 'Brightness'
  | 'Contrast'
  | 'Saturation'
  | 'Invert';

export interface ActiveFilter {
  type: FilterType;
  /** 0–100; where 50 = neutral for Brightness/Contrast/Saturation */
  intensity: number;
}

/** Filters with a meaningful 0–100 intensity slider */
export const INTENSITY_FILTERS: FilterType[] = ['Brightness', 'Contrast', 'Saturation', 'Blur'];

/** Filters that are simple on/off toggles */
export const TOGGLE_FILTERS: FilterType[] = ['Grayscale', 'Sepia', 'Invert'];

function buildFabricFilter(type: FilterType, intensity: number) {
  switch (type) {
    case 'Brightness': return new Brightness({ brightness: (intensity - 50) / 50 });
    case 'Contrast':   return new Contrast({ contrast: (intensity - 50) / 50 });
    case 'Saturation': return new Saturation({ saturation: (intensity - 50) / 50 });
    case 'Blur':       return new Blur({ blur: intensity / 100 });
    case 'Grayscale':  return new Grayscale();
    case 'Sepia':      return new Sepia();
    case 'Invert':     return new Invert();
    default:           return null;
  }
}

// Config-driven shape definitions — one entry per shape type
export interface ShapeDef {
  id: EditorTool;
  label: string;
  /** SVG path data for the button icon (viewBox 0 0 24 24) */
  iconPath: string;
}

export const SHAPE_DEFS: ShapeDef[] = [
  {
    id: 'rectangle',
    label: 'Rectangle',
    iconPath: 'M3 3h18v18H3z',
  },
  {
    id: 'circle',
    label: 'Circle',
    iconPath: 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z',
  },
  {
    id: 'triangle',
    label: 'Triangle',
    iconPath: 'M12 3L22 21H2L12 3z',
  },
  {
    id: 'line',
    label: 'Line',
    iconPath: 'M4 20L20 4',
  },
  {
    id: 'arrow',
    label: 'Arrow',
    iconPath: 'M4 12h16M14 6l6 6-6 6',
  },
  {
    id: 'star',
    label: 'Star',
    iconPath:
      'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  },
  {
    id: 'hexagon',
    label: 'Hexagon',
    iconPath: 'M12 2l8.66 5v10L12 22l-8.66-5V7z',
  },
  {
    id: 'diamond',
    label: 'Diamond',
    iconPath: 'M12 2l10 10-10 10L2 12z',
  },
  {
    id: 'heart',
    label: 'Heart',
    iconPath:
      'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  },
  {
    id: 'speech-bubble',
    label: 'Speech Bubble',
    iconPath: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  },
];

// ---------------------------------------------------------------------------
// Layer management types
// ---------------------------------------------------------------------------

export interface LayerInfo {
  object: FabricObject;
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  /** Zero-based index in canvas._objects (0 = back, highest = front) */
  index: number;
}

let _layerCounter = 0;

function _generateLayerName(type: string): string {
  _layerCounter += 1;
  const label =
    type === 'textbox' || type === 'i-text' || type === 'text'
      ? 'Text'
      : type === 'rect'
      ? 'Rectangle'
      : type === 'circle'
      ? 'Circle'
      : type === 'triangle'
      ? 'Triangle'
      : type === 'image'
      ? 'Image'
      : type === 'line'
      ? 'Line'
      : type === 'path'
      ? 'Path'
      : type === 'polygon'
      ? 'Shape'
      : 'Object';
  return `${label} ${_layerCounter}`;
}

function _ensureLayerMeta(obj: FabricObject): { id: string; name: string } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = (obj as any).__layerMeta as { id: string; name: string } | undefined;
  if (existing) return existing;
  const meta = {
    id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: _generateLayerName(obj.type ?? 'object'),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (obj as any).__layerMeta = meta;
  return meta;
}

function _getLayerMeta(obj: FabricObject): { id: string; name: string } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (obj as any).__layerMeta ?? _ensureLayerMeta(obj);
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
  selectedShapeProps: ShapeProperties | null;
  selectedImageProps: ImageProperties | null;
  uploadedImages: UploadedImage[];
  layers: LayerInfo[];
  // Image filter state
  activeFilters: ActiveFilter[];
  isCropMode: boolean;
  // Image filter and crop operations
  applyFilter: (type: FilterType, intensity: number) => void;
  removeFilter: (type: FilterType) => void;
  enterCropMode: () => void;
  applyCrop: () => void;
  cancelCrop: () => void;
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
  loadTemplate: (template: TemplatePreset) => Promise<void>;
  exportCanvas: (format: ExportFormat, quality?: number) => void;
  isCanvasEmpty: () => boolean;
  updateTextProperty: <K extends keyof TextProperties>(key: K, value: TextProperties[K]) => void;
  addShape: (shapeId: EditorTool) => void;
  updateShapeProperty: (key: keyof ShapeProperties, value: string | number) => void;
  // Layer management
  getLayers: () => LayerInfo[];
  selectLayer: (obj: FabricObject) => void;
  toggleLayerVisibility: (obj: FabricObject) => void;
  toggleLayerLock: (obj: FabricObject) => void;
  deleteLayer: (obj: FabricObject) => void;
  duplicateLayer: (obj: FabricObject) => void;
  reorderLayer: (obj: FabricObject, newIndex: number) => void;
  renameLayer: (obj: FabricObject, name: string) => void;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function getCanvasWorldCenter(fc: FabricCanvas): { x: number; y: number } {
  const vpt = fc.viewportTransform ?? [1, 0, 0, 1, 0, 0];
  const scale = vpt[0] || 1;
  const panX = vpt[4] ?? 0;
  const panY = vpt[5] ?? 0;
  const el = fc.getElement();
  return {
    x: (el.width / 2 - panX) / scale,
    y: (el.height / 2 - panY) / scale,
  };
}

function makeStarPoints(n: number, outer: number, inner: number): { x: number; y: number }[] {
  return Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (i * Math.PI) / n - Math.PI / 2;
    return { x: r * Math.cos(angle), y: r * Math.sin(angle) };
  });
}

function makeHexagonPoints(r: number): { x: number; y: number }[] {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3 - Math.PI / 6;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  });
}

function makeDiamondPoints(w: number, h: number): { x: number; y: number }[] {
  return [
    { x: 0, y: -h / 2 },
    { x: w / 2, y: 0 },
    { x: 0, y: h / 2 },
    { x: -w / 2, y: 0 },
  ];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useImageEditor(): UseImageEditorReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
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
  const [selectedShapeProps, setSelectedShapeProps] = useState<ShapeProperties | null>(null);
  const [selectedImageProps, setSelectedImageProps] = useState<ImageProperties | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const canvasWidthRef = useRef(1080);
  const canvasHeightRef = useRef(1080);
  const [layers, setLayers] = useState<LayerInfo[]>([]);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [isCropMode, setIsCropMode] = useState(false);

  // Ref to the currently selected FabricImage — used by filter/crop functions
  const selectedImageRef = useRef<FabricImage | null>(null);
  // Ref to the draggable crop rectangle overlay
  const cropRectRef = useRef<Rect | null>(null);

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

  const readShapeProps = useCallback((obj: FabricObject): ShapeProperties => ({
    fill: typeof obj.fill === 'string' ? obj.fill : '#4f46e5',
    stroke: typeof obj.stroke === 'string' ? obj.stroke : '#1e1b4b',
    strokeWidth: typeof obj.strokeWidth === 'number' ? obj.strokeWidth : 2,
    opacity: Math.round((typeof obj.opacity === 'number' ? obj.opacity : 1) * 100),
    rx: (obj as Rect).rx ?? 0,
  }), []);


  const buildLayers = useCallback((fc: FabricCanvas): LayerInfo[] => {
    const objects = fc.getObjects();
    return objects
      .slice()
      .reverse()
      .map((obj, reverseIdx) => {
        const meta = _getLayerMeta(obj);
        return {
          object: obj,
          id: meta.id,
          name: meta.name,
          type: obj.type ?? 'object',
          visible: obj.visible ?? true,
          locked: !(obj.selectable ?? true),
          index: objects.length - 1 - reverseIdx,
        };
      });
  }, []);

  const syncLayers = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) { setLayers([]); return; }
    setLayers(buildLayers(fc));
  }, [buildLayers]);

  const readImageProps = useCallback((obj: FabricImage): ImageProperties => ({
    opacity: Math.round((obj.opacity ?? 1) * 100),
    flipX: obj.flipX ?? false,
    flipY: obj.flipY ?? false,
  }), []);

  const scaleImageToFit = useCallback((img: FabricImage, cw: number, ch: number) => {
    const maxW = cw * 0.8;
    const maxH = ch * 0.8;
    const naturalW = img.width ?? 1;
    const naturalH = img.height ?? 1;
    const scale = Math.min(maxW / naturalW, maxH / naturalH, 1);
    img.scale(scale);
    img.set({ left: cw / 2, top: ch / 2, originX: 'center', originY: 'center' });
  }, []);

  const placeUploadedImage = useCallback((dataUrl: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const cw = canvasWidthRef.current;
    const ch = canvasHeightRef.current;
    FabricImage.fromURL(dataUrl).then((img) => {
      scaleImageToFit(img, cw, ch);
      fc.add(img);
      fc.setActiveObject(img);
      fc.requestRenderAll();
    });
  }, [scaleImageToFit]);

  const addImage = useCallback(async (file: File): Promise<void> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) { resolve(); return; }
        const entry: UploadedImage = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          dataUrl,
          name: file.name,
        };
        setUploadedImages((prev) => [...prev, entry]);
        placeUploadedImage(dataUrl);
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }, [placeUploadedImage]);

  const handleImageDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) addImage(file);
    }
  }, [addImage]);

  const setSelectedImageOpacity = useCallback((opacity: number) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (!(obj instanceof FabricImage)) return;
    obj.set({ opacity: opacity / 100 });
    fc.requestRenderAll();
    setSelectedImageProps(readImageProps(obj));
  }, [readImageProps]);

  const flipSelectedImageHorizontal = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (!(obj instanceof FabricImage)) return;
    obj.set({ flipX: !obj.flipX });
    fc.requestRenderAll();
    setSelectedImageProps(readImageProps(obj));
  }, [readImageProps]);

  const flipSelectedImageVertical = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (!(obj instanceof FabricImage)) return;
    obj.set({ flipY: !obj.flipY });
    fc.requestRenderAll();
    setSelectedImageProps(readImageProps(obj));
  }, [readImageProps]);

  const syncHistoryState = useCallback(() => {
    setCanUndo(historyStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const captureState = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const snapshot = fc.toObject();
    historyStack.current.push(snapshot);
    if (historyStack.current.length > MAX_HISTORY) historyStack.current.shift();
    redoStack.current = [];
    syncHistoryState();
    syncLayers();
  }, [syncHistoryState, syncLayers]);

  const undo = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || historyStack.current.length === 0) return;
    redoStack.current.push(fc.toObject());
    const prev = historyStack.current.pop()!;
    fc.loadFromJSON(prev).then(() => { fc.requestRenderAll(); syncHistoryState(); });
  }, [syncHistoryState]);

  const redo = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || redoStack.current.length === 0) return;
    historyStack.current.push(fc.toObject());
    if (historyStack.current.length > MAX_HISTORY) historyStack.current.shift();
    const next = redoStack.current.pop()!;
    fc.loadFromJSON(next).then(() => { fc.requestRenderAll(); syncHistoryState(); });
  }, [syncHistoryState]);

  const saveToLocal = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fc.toJSON()));
  }, []);

  const loadFromLocal = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return;
    try {
      fc.loadFromJSON(JSON.parse(raw) as object).then(() => fc.requestRenderAll());
    } catch { /* ignore */ }
  }, []);

  const exportJSON = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const blob = new Blob([JSON.stringify(fc.toJSON(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canvas-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const loadTemplate = useCallback(async (template: TemplatePreset): Promise<void> => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.clear();
    fc.setDimensions({ width: template.width, height: template.height });
    setCanvasWidth(template.width);
    setCanvasHeight(template.height);
    fc.backgroundColor = template.backgroundColor;
    setBackgroundColorState(template.backgroundColor);
    await fc.loadFromJSON({ version: '5.3.0', objects: template.objects, background: template.backgroundColor });
    fc.requestRenderAll();
  }, []);

  const exportCanvas = useCallback((format: ExportFormat, quality = 1) => {
    const fc = fabricRef.current;
    if (!fc) return;
    if (format === 'svg') {
      const blob = new Blob([fc.toSVG()], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `canvas.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const dataUrl = fc.toDataURL({ format, quality, multiplier: 1 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `canvas.${format}`;
      a.click();
    }
  }, []);

  const isCanvasEmpty = useCallback((): boolean => {
    const fc = fabricRef.current;
    return !fc || fc.getObjects().length === 0;
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

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const scale = Math.min(
      (containerWidth - 80) / canvasWidth,
      (containerHeight - 80) / canvasHeight,
      1
    );
    fc.setZoom(scale);
    setZoom(scale);

    const vpw = canvasWidth * scale;
    const vph = canvasHeight * scale;
    fc.viewportTransform = [scale, 0, 0, scale, (containerWidth - vpw) / 2, (containerHeight - vph) / 2];

    fc.on('mouse:wheel', (opt) => {
      const e = opt.e as WheelEvent;
      e.preventDefault();
      e.stopPropagation();
      let newZoom = fc.getZoom() * (0.999 ** e.deltaY);
      newZoom = Math.max(0.1, Math.min(5, newZoom));
      fc.zoomToPoint(new Point(e.offsetX, e.offsetY), newZoom);
      setZoom(newZoom);
      fc.requestRenderAll();
    });

    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;

    fc.on('mouse:down', (opt) => {
      const e = opt.e as MouseEvent;

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

    fc.on('mouse:up', () => { isPanning = false; fc.selection = true; });

    fc.on('object:added', (e) => { if (e.target) { _ensureLayerMeta(e.target); } captureState(); });
    fc.on('object:removed', () => captureState());
    fc.on('object:modified', () => captureState());

    const handleSelectionChange = (selected: unknown[] | undefined) => {
      const obj = selected?.[0];
      if (obj instanceof FabricImage) {
        selectedImageRef.current = obj;
        setSelectedTextProps(null);
        setSelectedShapeProps(readShapeProps(obj));
        // Sync active filters from the image's current filter array
        const synced: ActiveFilter[] = obj.filters.map((f) => {
          const type = (f as { type?: string }).type as FilterType;
          let intensity = 100;
          if ('brightness' in f) intensity = ((f as { brightness: number }).brightness + 1) / 2 * 100;
          else if ('contrast' in f) intensity = ((f as { contrast: number }).contrast + 1) / 2 * 100;
          else if ('saturation' in f) intensity = ((f as { saturation: number }).saturation + 1) / 2 * 100;
          else if ('blur' in f) intensity = (f as { blur: number }).blur * 100;
          return { type, intensity };
        });
        setActiveFilters(synced);
      } else if (obj instanceof Textbox) {
        selectedImageRef.current = null;
        setSelectedTextProps(readTextProps(obj));
        setSelectedShapeProps(null);
        setActiveFilters([]);
      } else if (obj instanceof FabricObject) {
        selectedImageRef.current = null;
        setSelectedTextProps(null);
        setSelectedShapeProps(readShapeProps(obj));
        setActiveFilters([]);
      } else {
        selectedImageRef.current = null;
        setSelectedTextProps(null);
        setSelectedShapeProps(null);
        setActiveFilters([]);
      }
    };

    fc.on('selection:created', (opt) => handleSelectionChange(opt.selected));
    fc.on('selection:updated', (opt) => handleSelectionChange(opt.selected));
    fc.on('selection:cleared', () => {
      selectedImageRef.current = null;
      setSelectedTextProps(null);
      setSelectedShapeProps(null);
      setActiveFilters([]);
    });

    fabricRef.current = fc;
    fc.requestRenderAll();
    syncLayers();
  }, [canvasWidth, canvasHeight, captureState, readTextProps, readShapeProps]);

  const disposeCanvas = useCallback(() => {
    if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null; }
  }, []);

  const setCanvasSize = useCallback((width: number, height: number) => {
    setCanvasWidth(width);
    setCanvasHeight(height);
    canvasWidthRef.current = width;
    canvasHeightRef.current = height;
    const fc = fabricRef.current;
    const container = containerRef.current;
    if (!fc || !container) return;
    fc.setDimensions({ width, height });
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scale = Math.min((cw - 80) / width, (ch - 80) / height, 1);
    const vpw = width * scale;
    const vph = height * scale;
    fc.viewportTransform = [scale, 0, 0, scale, (cw - vpw) / 2, (ch - vph) / 2];
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
    fc.zoomToPoint(fc.getCenterPoint(), newZoom);
    setZoom(newZoom);
    fc.requestRenderAll();
  }, []);

  const zoomOut = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const newZoom = Math.max(fc.getZoom() / 1.2, 0.1);
    fc.zoomToPoint(fc.getCenterPoint(), newZoom);
    setZoom(newZoom);
    fc.requestRenderAll();
  }, []);

  const resetZoom = useCallback(() => {
    const fc = fabricRef.current;
    const container = containerRef.current;
    if (!fc || !container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scale = Math.min((cw - 80) / canvasWidth, (ch - 80) / canvasHeight, 1);
    const vpw = canvasWidth * scale;
    const vph = canvasHeight * scale;
    fc.viewportTransform = [scale, 0, 0, scale, (cw - vpw) / 2, (ch - vph) / 2];
    fc.setZoom(scale);
    setZoom(scale);
    fc.requestRenderAll();
  }, [canvasWidth, canvasHeight]);

  // ---------------------------------------------------------------------------
  // Shape creation
  // ---------------------------------------------------------------------------

  const addShape = useCallback((shapeId: EditorTool) => {
    const fc = fabricRef.current;
    if (!fc) return;

    const { x: cx, y: cy } = getCanvasWorldCenter(fc);
    const base = {
      fill: '#4f46e5',
      stroke: '#1e1b4b',
      strokeWidth: 2,
      opacity: 1,
      originX: 'center' as const,
      originY: 'center' as const,
      left: cx,
      top: cy,
    };

    let obj: FabricObject | null = null;

    switch (shapeId) {
      case 'rectangle':
        obj = new Rect({ ...base, width: 200, height: 150, rx: 0, ry: 0 });
        break;
      case 'circle':
        obj = new Circle({ ...base, radius: 80 });
        break;
      case 'triangle':
        obj = new Triangle({ ...base, width: 180, height: 160 });
        break;
      case 'line':
        obj = new Line([cx - 80, cy, cx + 80, cy], {
          stroke: base.stroke, strokeWidth: base.strokeWidth, opacity: base.opacity,
          originX: 'center', originY: 'center', left: cx, top: cy,
        });
        break;
      case 'arrow':
        obj = new Path('M -80 0 L 60 0 M 40 -20 L 80 0 L 40 20', {
          ...base, fill: '', strokeLineCap: 'round', strokeLineJoin: 'round',
        });
        break;
      case 'star':
        obj = new Polygon(makeStarPoints(5, 80, 36), base);
        break;
      case 'hexagon':
        obj = new Polygon(makeHexagonPoints(80), base);
        break;
      case 'diamond':
        obj = new Polygon(makeDiamondPoints(160, 180), base);
        break;
      case 'heart':
        obj = new Path(
          'M 0 30 C -5 25 -50 -5 -50 -25 C -50 -50 -25 -60 0 -35 C 25 -60 50 -50 50 -25 C 50 -5 5 25 0 30 Z',
          base
        );
        break;
      case 'speech-bubble':
        obj = new Path(
          'M -80 -60 Q -80 -80 -60 -80 L 60 -80 Q 80 -80 80 -60 L 80 20 Q 80 40 60 40 L -10 40 L -30 70 L -30 40 L -60 40 Q -80 40 -80 20 Z',
          base
        );
        break;
      default:
        break;
    }

    if (obj) {
      fc.add(obj);
      fc.setActiveObject(obj);
      fc.requestRenderAll();
      setSelectedShapeProps(readShapeProps(obj));
      setActiveTool('select');
    }
  }, [readShapeProps, setActiveTool]);

  // ---------------------------------------------------------------------------
  // Image filters
  // ---------------------------------------------------------------------------

  const applyFilter = (type: FilterType, intensity: number) => {
    const img = selectedImageRef.current;
    if (!img) return;
    img.filters = img.filters.filter((f) => (f as { type?: string }).type !== type);
    const newFilter = buildFabricFilter(type, intensity);
    if (newFilter) img.filters.push(newFilter);
    img.applyFilters();
    fabricRef.current?.requestRenderAll();
    setActiveFilters((prev) => [...prev.filter((f) => f.type !== type), { type, intensity }]);
  };

  const removeFilter = (type: FilterType) => {
    const img = selectedImageRef.current;
    if (!img) return;
    img.filters = img.filters.filter((f) => (f as { type?: string }).type !== type);
    img.applyFilters();
    fabricRef.current?.requestRenderAll();
    setActiveFilters((prev) => prev.filter((f) => f.type !== type));
  };

  // ---------------------------------------------------------------------------
  // Crop mode
  // ---------------------------------------------------------------------------

  const enterCropMode = () => {
    const fc = fabricRef.current;
    const img = selectedImageRef.current;
    if (!fc || !img) return;
    setIsCropMode(true);
    fc.discardActiveObject();
    const imgLeft = img.left ?? 0;
    const imgTop = img.top ?? 0;
    const imgW = img.getScaledWidth();
    const imgH = img.getScaledHeight();
    const cropRect = new Rect({
      left: imgLeft,
      top: imgTop,
      width: imgW,
      height: imgH,
      fill: 'rgba(0,0,0,0.25)',
      stroke: '#ffffff',
      strokeWidth: 2,
      strokeDashArray: [6, 3],
      selectable: true,
      hasControls: true,
      hasBorders: true,
      lockRotation: true,
      transparentCorners: false,
      cornerColor: '#ffffff',
      cornerStrokeColor: '#555',
      cornerSize: 10,
    });
    cropRectRef.current = cropRect;
    fc.add(cropRect);
    fc.setActiveObject(cropRect);
    fc.requestRenderAll();
  };

  const applyCrop = () => {
    const fc = fabricRef.current;
    const img = selectedImageRef.current;
    const cropRect = cropRectRef.current;
    if (!fc || !img || !cropRect) return;
    const scaleX = img.scaleX ?? 1;
    const scaleY = img.scaleY ?? 1;
    const imgLeft = img.left ?? 0;
    const imgTop = img.top ?? 0;
    const rectLeft = cropRect.left ?? 0;
    const rectTop = cropRect.top ?? 0;
    const rectW = (cropRect.width ?? 0) * (cropRect.scaleX ?? 1);
    const rectH = (cropRect.height ?? 0) * (cropRect.scaleY ?? 1);
    const cropX = Math.max(0, (rectLeft - imgLeft) / scaleX);
    const cropY = Math.max(0, (rectTop - imgTop) / scaleY);
    const cropW = Math.max(1, rectW / scaleX);
    const cropH = Math.max(1, rectH / scaleY);
    const naturalW = img.width ?? cropW;
    const naturalH = img.height ?? cropH;
    img.set({
      cropX: Math.round(cropX),
      cropY: Math.round(cropY),
      width: Math.round(Math.min(cropW, naturalW - cropX)),
      height: Math.round(Math.min(cropH, naturalH - cropY)),
      left: rectLeft,
      top: rectTop,
    });
    fc.remove(cropRect);
    cropRectRef.current = null;
    img.applyFilters();
    fc.setActiveObject(img);
    fc.requestRenderAll();
    captureState();
    setIsCropMode(false);
  };

  const cancelCrop = () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const cropRect = cropRectRef.current;
    if (cropRect) { fc.remove(cropRect); cropRectRef.current = null; }
    if (selectedImageRef.current) fc.setActiveObject(selectedImageRef.current);
    fc.requestRenderAll();
    setIsCropMode(false);
  };

  // ---------------------------------------------------------------------------
  // Shape property updates
  // ---------------------------------------------------------------------------

  const updateShapeProperty = useCallback((key: keyof ShapeProperties, value: string | number) => {
    const fc = fabricRef.current;
    const active = fc?.getActiveObject();

    setSelectedShapeProps((prev) => prev ? { ...prev, [key]: value } : null);

    if (!active) return;

    if (key === 'fill') active.set('fill', value as string);
    else if (key === 'stroke') active.set('stroke', value as string);
    else if (key === 'strokeWidth') active.set('strokeWidth', value as number);
    else if (key === 'opacity') active.set('opacity', (value as number) / 100);
    else if (key === 'rx') {
      (active as Rect).set('rx', value as number);
      (active as Rect).set('ry', value as number);
    }

    fc?.requestRenderAll();
  }, []);

  // ---------------------------------------------------------------------------
  // Text property updates
  // ---------------------------------------------------------------------------

  const updateTextProperty = useCallback(<K extends keyof TextProperties>(
    key: K,
    value: TextProperties[K]
  ) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (!(obj instanceof Textbox)) return;
    obj.set(key as string, value);
    fc.requestRenderAll();
    setSelectedTextProps((prev) => prev ? { ...prev, [key]: value } : null);
  }, []);

  // ---------------------------------------------------------------------------
  // Tool cursor behavior
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    if (activeTool === 'select') {
      fc.selection = true;
      fc.defaultCursor = 'default';
      fc.hoverCursor = 'move';
    } else if (activeTool === 'text') {
      fc.selection = false;
      fc.defaultCursor = 'text';
      fc.hoverCursor = 'text';
    } else {
      fc.selection = false;
      fc.defaultCursor = 'crosshair';
      fc.hoverCursor = 'crosshair';
    }
  }, [activeTool]);

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      if (ctrlOrCmd && e.key === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (ctrlOrCmd && e.key === 's') {
        e.preventDefault();
        saveToLocal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, saveToLocal]);


  // ---------------------------------------------------------------------------
  // Layer management
  // ---------------------------------------------------------------------------

  const getLayers = useCallback((): LayerInfo[] => {
    const fc = fabricRef.current;
    if (!fc) return [];
    return buildLayers(fc);
  }, [buildLayers]);

  const selectLayer = useCallback((obj: FabricObject) => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.setActiveObject(obj);
    fc.requestRenderAll();
  }, []);

  const toggleLayerVisibility = useCallback((obj: FabricObject) => {
    const fc = fabricRef.current;
    if (!fc) return;
    obj.visible = !(obj.visible ?? true);
    fc.requestRenderAll();
    syncLayers();
  }, [syncLayers]);

  const toggleLayerLock = useCallback((obj: FabricObject) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const isCurrentlyLocked = !(obj.selectable ?? true);
    obj.selectable = isCurrentlyLocked;
    obj.evented = isCurrentlyLocked;
    if (!isCurrentlyLocked && fc.getActiveObject() === obj) {
      fc.discardActiveObject();
    }
    fc.requestRenderAll();
    syncLayers();
  }, [syncLayers]);

  const deleteLayer = useCallback((obj: FabricObject) => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.remove(obj);
    fc.requestRenderAll();
    captureState();
  }, [captureState]);

  const duplicateLayer = useCallback((obj: FabricObject) => {
    const fc = fabricRef.current;
    if (!fc) return;
    obj.clone().then((clone: FabricObject) => {
      const originalMeta = _getLayerMeta(obj);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (clone as any).__layerMeta = undefined;
      const newMeta = _ensureLayerMeta(clone);
      newMeta.name = `${originalMeta.name} copy`;
      clone.set({ left: (obj.left ?? 0) + 15, top: (obj.top ?? 0) + 15 });
      fc.add(clone);
      fc.setActiveObject(clone);
      fc.requestRenderAll();
      captureState();
    });
  }, [captureState]);

  const reorderLayer = useCallback((obj: FabricObject, newIndex: number) => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.moveObjectTo(obj, newIndex);
    fc.requestRenderAll();
    syncLayers();
    captureState();
  }, [syncLayers, captureState]);

  const renameLayer = useCallback((obj: FabricObject, name: string) => {
    const meta = _getLayerMeta(obj);
    meta.name = name;
    syncLayers();
  }, [syncLayers]);

  // Filter and crop stubs — implemented in IMG-005
  const applyFilter = useCallback((_type: FilterType, _intensity: number) => {
    // Placeholder — IMG-005
  }, []);

  const removeFilter = useCallback((_type: FilterType) => {
    // Placeholder — IMG-005
  }, []);

  const enterCropMode = useCallback(() => {
    // Placeholder — IMG-005
  }, []);

  const applyCrop = useCallback(() => {
    // Placeholder — IMG-005
    setIsCropMode(false);
  }, []);

  const cancelCrop = useCallback(() => {
    setIsCropMode(false);
  }, []);

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
    selectedTextProps,
    selectedShapeProps,
    selectedImageProps,
    uploadedImages,
    layers,
    activeFilters,
    isCropMode,
    applyFilter,
    removeFilter,
    enterCropMode,
    applyCrop,
    cancelCrop,
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
    loadTemplate,
    exportCanvas,
    isCanvasEmpty,
    updateTextProperty,
    addShape,
    updateShapeProperty,
    getLayers,
    selectLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    deleteLayer,
    duplicateLayer,
    reorderLayer,
    renameLayer,
    addImage,
    handleImageDrop,
    setSelectedImageOpacity,
    flipSelectedImageHorizontal,
    flipSelectedImageVertical,
    placeUploadedImage,
  };
}
