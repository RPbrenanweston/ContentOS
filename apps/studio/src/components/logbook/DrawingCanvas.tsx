'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

export type DrawingTool = 'pen' | 'circle' | 'arrow';

interface DrawingCanvasProps {
  width: number;
  height: number;
  enabled: boolean;
  tool: DrawingTool;
  color?: string;
  lineWidth?: number;
}

interface Stroke {
  points: { x: number; y: number }[];
  tool: DrawingTool;
  color: string;
  lineWidth: number;
}

export function DrawingCanvas({
  width,
  height,
  enabled,
  tool,
  color = '#D4F85A',
  lineWidth = 3,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);

  // Redraw all strokes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }

    // Draw current in-progress stroke
    if (currentStrokeRef.current) {
      drawStroke(ctx, currentStrokeRef.current);
    }
  }, [strokes]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    redraw();
  }, [width, height, redraw]);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();
    setDrawing(true);
    const point = getCanvasPoint(e);
    currentStrokeRef.current = {
      points: [point],
      tool,
      color,
      lineWidth,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !currentStrokeRef.current || !enabled) return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    currentStrokeRef.current.points.push(point);
    redraw();
  };

  const handleMouseUp = () => {
    if (!drawing || !currentStrokeRef.current) return;
    setStrokes((prev) => [...prev, currentStrokeRef.current!]);
    currentStrokeRef.current = null;
    setDrawing(false);
  };

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 z-10 ${enabled ? 'cursor-crosshair' : 'pointer-events-none'}`}
      style={{ width: '100%', height: '100%' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}

// Expose undo/clear as functions the parent can call
export function useDrawingControls() {
  const [strokeCount, setStrokeCount] = useState(0);

  return {
    strokeCount,
    setStrokeCount,
  };
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.points.length === 0) return;

  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = stroke.color;
  ctx.shadowBlur = 4;

  if (stroke.tool === 'pen') {
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  } else if (stroke.tool === 'circle') {
    if (stroke.points.length < 2) return;
    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    const rx = Math.abs(end.x - start.x) / 2;
    const ry = Math.abs(end.y - start.y) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (stroke.tool === 'arrow') {
    if (stroke.points.length < 2) return;
    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];

    // Line
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Arrowhead
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const headLen = 15;
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLen * Math.cos(angle - Math.PI / 6),
      end.y - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLen * Math.cos(angle + Math.PI / 6),
      end.y - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
}
