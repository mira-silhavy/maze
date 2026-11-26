import { useCallback, useEffect, useRef } from 'react';
import { getMaxGameDpr } from './canvasLayers';

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewBoxFrame {
  ctx: CanvasRenderingContext2D;
  /** Canvas size in CSS pixels. */
  width: number;
  height: number;
  /** CSS pixels per viewBox unit. */
  scale: number;
  /** Switches the context to draw in viewBox units, like the SVG it covers. */
  useViewBoxUnits: () => void;
}

/**
 * Canvas stacked over an SVG drawn with `preserveAspectRatio="xMidYMid meet"`,
 * sized and positioned to cover exactly the SVG's viewBox. Must be rendered as an
 * absolutely positioned child of the same container as the SVG.
 */
export function useViewBoxCanvas(
  viewBox: ViewBox,
  enabled: boolean,
  redraw: () => void,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewBoxRef = useRef(viewBox);
  viewBoxRef.current = viewBox;
  const redrawRef = useRef(redraw);
  redrawRef.current = redraw;

  /** Sizes the canvas, clears it and returns a pixel-space context, or null if not mounted. */
  const begin = useCallback((): ViewBoxFrame | null => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return null;

    const vb = viewBoxRef.current;
    const scale = Math.min(
      parent.clientWidth / vb.width,
      parent.clientHeight / vb.height,
    );
    if (!(scale > 0)) return null;
    const width = Math.floor(vb.width * scale);
    const height = Math.floor(vb.height * scale);
    const dpr = Math.min(window.devicePixelRatio || 1, getMaxGameDpr());
    const pixelW = Math.round(width * dpr);
    const pixelH = Math.round(height * dpr);
    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW;
      canvas.height = pixelH;
    }
    const style = canvas.style;
    style.width = `${width}px`;
    style.height = `${height}px`;
    style.left = `${(parent.clientWidth - width) / 2}px`;
    style.top = `${(parent.clientHeight - height) / 2}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const k = dpr * scale;
    return {
      ctx,
      width,
      height,
      scale,
      useViewBoxUnits: () => ctx.setTransform(k, 0, 0, k, -vb.x * k, -vb.y * k),
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const parent = canvasRef.current?.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(() => redrawRef.current());
    observer.observe(parent);
    return () => observer.disconnect();
  }, [enabled]);

  return { canvasRef, begin };
}
