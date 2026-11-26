import type { Cell, Maze, Position } from '../maze/types';

/**
 * Depth model for bridges, shared by all grid renderers. Layers, bottom to top:
 * board (ground + underpass) → lower live → bridges (decks, bridge-top trail)
 * → upper live → rails → fog.
 */
export type DepthLayer = 'lower' | 'upper';

/** A trail segment touching a bridge-top position is drawn above the bridges, every other one below. */
export function segmentLayer(a: Position, b: Position): DepthLayer {
  return a.level === 'over' || b.level === 'over' ? 'upper' : 'lower';
}

export interface LayeredPath {
  /** Runs of consecutive same-layer segments, as polylines of positions. */
  lower: Position[][];
  upper: Position[][];
  /** Ground joints of bridge-top runs; the ground stroke draws them, so upper strokes leave them out. */
  upperCutouts: Position[];
}

/** Splits the segments of `points[0..endIdx]` by layer, keeping same-layer neighbours joined. */
export function layerPath(points: Position[], endIdx: number): LayeredPath {
  const out: LayeredPath = { lower: [], upper: [], upperCutouts: [] };
  let run: Position[] | null = null;
  let runLayer: DepthLayer | null = null;
  for (let i = 0; i < endIdx; i++) {
    const layer = segmentLayer(points[i], points[i + 1]);
    if (run && layer === runLayer) {
      run.push(points[i + 1]);
      continue;
    }
    run = [points[i], points[i + 1]];
    runLayer = layer;
    out[layer].push(run);
  }
  for (const r of out.upper) {
    for (const end of [r[0], r[r.length - 1]]) {
      if (end.level !== 'over') out.upperCutouts.push(end);
    }
  }
  return out;
}

export interface TipPart {
  from: Position;
  to: Position;
}

/**
 * Sorts the live tip parts (last trail segment up to the marble, then the start of the
 * next one) into layers. Each layer's tip is stroked together with that layer's committed
 * trail, so a joint inside one layer needs no cutout; a joint where the layer changes is
 * drawn by the ground stroke and left out of the upper one.
 */
export function layerTipParts<T extends TipPart>(
  trail: Position[],
  parts: T[],
): Record<DepthLayer, { parts: T[]; cutouts: Position[] }> {
  const out = {
    lower: { parts: [] as T[], cutouts: [] as Position[] },
    upper: { parts: [] as T[], cutouts: [] as Position[] },
  };
  let prevLayer: DepthLayer | null =
    trail.length >= 3
      ? segmentLayer(trail[trail.length - 3], trail[trail.length - 2])
      : null;
  for (const part of parts) {
    const layer = segmentLayer(part.from, part.to);
    out[layer].parts.push(part);
    if (prevLayer && layer !== prevLayer) out.upper.cutouts.push(part.from);
    prevLayer = layer;
  }
  return out;
}

export interface MarbleDepth {
  layer: DepthLayer;
  /** Faded copy drawn on the upper layer while a deck covers the marble. */
  ghost: { cell: Cell; alpha: number } | null;
}

interface MarbleSpot {
  x: number;
  y: number;
  row: number;
  col: number;
  level?: Position['level'];
}

/** How far (in cells) from the deck's centre line a marble beside an underpass still fades. */
const GHOST_REACH = 0.82;

function ghostAlpha(cell: Cell, spot: MarbleSpot): number {
  const d =
    cell.bridge === 'horizontal'
      ? Math.abs(spot.y - (cell.row + 0.5))
      : Math.abs(spot.x - (cell.col + 0.5));
  const t = Math.max(0, Math.min(1, 1 - d / 0.72));
  const smooth = t * t * (3 - 2 * t);
  return 0.85 - smooth * 0.53;
}

/**
 * Layer for the marble, decided by position only (never by direction of travel):
 * on a bridge, or in the cell beside it along its deck, the marble rides above the
 * bridges; under a bridge, or beside its underpass, it is below them with a ghost.
 */
export function marbleDepth(maze: Maze, spot: MarbleSpot): MarbleDepth {
  if (spot.level === 'over') return { layer: 'upper', ghost: null };
  if (spot.level === 'under') {
    const cell = maze.grid[spot.row][spot.col];
    return { layer: 'lower', ghost: { cell, alpha: ghostAlpha(cell, spot) } };
  }

  const neighbors: Array<[number, number, 'horizontal' | 'vertical']> = [
    [spot.row, spot.col - 1, 'horizontal'],
    [spot.row, spot.col + 1, 'horizontal'],
    [spot.row - 1, spot.col, 'vertical'],
    [spot.row + 1, spot.col, 'vertical'],
  ];
  for (const [r, c, axis] of neighbors) {
    const cell = maze.grid[r]?.[c];
    if (!cell?.bridge) continue;
    if (cell.bridge === axis) return { layer: 'upper', ghost: null };
    const d =
      cell.bridge === 'horizontal'
        ? Math.abs(spot.y - (cell.row + 0.5))
        : Math.abs(spot.x - (cell.col + 0.5));
    return {
      layer: 'lower',
      ghost: d < GHOST_REACH ? { cell, alpha: ghostAlpha(cell, spot) } : null,
    };
  }
  return { layer: 'lower', ghost: null };
}
