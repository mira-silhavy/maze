import { useCallback, useEffect, useRef } from 'react';
import {
  FOG_LIGHT_RADIUS,
  FOG_MEMORY_RADIUS,
  type MazeTheme,
} from '../themes/catalog';
import { FogCache, type FogCell } from './canvasLayers';
import { useViewBoxCanvas, type ViewBox } from './viewBoxCanvas';

interface Point {
  x: number;
  y: number;
}

export interface SvgFogInput {
  viewBox: ViewBox;
  /** Size of one cell in viewBox units; fog radii scale with it. */
  cellUnit: number;
  theme: MazeTheme;
  explored: Set<string>;
  /** Maps an explored key to its physical cell and centre in viewBox units. */
  cellOf: (key: string) => FogCell | null;
  boardToken: unknown;
  /** Flashlight centre in viewBox units for non-animated redraws. */
  active: Point;
}

const EMPTY_VIEWBOX: ViewBox = { x: 0, y: 0, width: 1, height: 1 };

/**
 * Fog of War for SVG boards, drawn on a canvas over the board SVG so moving
 * the flashlight never repaints the board. Returns the canvas ref and a
 * per-frame `draw(active)`.
 */
export function useSvgFogCanvas(input: SvgFogInput | null) {
  const inputRef = useRef(input);
  inputRef.current = input;
  const cacheRef = useRef<FogCache | null>(null);
  const lastActiveRef = useRef<Point | null>(null);

  const drawRef = useRef<(active?: Point) => void>(() => {});
  const layer = useViewBoxCanvas(
    input?.viewBox ?? EMPTY_VIEWBOX,
    input !== null,
    () => drawRef.current(),
  );

  drawRef.current = (active?: Point) => {
    const cur = inputRef.current;
    if (!cur) return;
    const frame = layer.begin();
    if (!frame) return;
    const { ctx, width, height, scale } = frame;
    const vb = cur.viewBox;
    const toPx = (p: Point) => ({
      x: (p.x - vb.x) * scale,
      y: (p.y - vb.y) * scale,
    });
    if (active) lastActiveRef.current = active;
    const at = toPx(active ?? lastActiveRef.current ?? cur.active);

    if (!cacheRef.current) cacheRef.current = new FogCache();
    cacheRef.current.draw(ctx, {
      fogColor: cur.theme.fogColor,
      lightTint: cur.theme.lightTint,
      width,
      height,
      memRadius: cur.cellUnit * FOG_MEMORY_RADIUS * scale,
      lightRadius: cur.cellUnit * FOG_LIGHT_RADIUS * scale,
      activeX: at.x,
      activeY: at.y,
      explored: cur.explored,
      cellOf: (key) => {
        const cell = cur.cellOf(key);
        return cell && { id: cell.id, ...toPx(cell) };
      },
      boardToken: cur.boardToken,
    });
  };

  const draw = useCallback((active?: Point) => drawRef.current(active), []);

  // Redraw after every render: explored, theme, board or player may have changed.
  useEffect(() => {
    lastActiveRef.current = null;
    drawRef.current();
  });

  return { canvasRef: layer.canvasRef, draw };
}
