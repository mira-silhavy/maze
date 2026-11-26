import { CORRIDOR_FLOOR_OPACITY, type MazeTheme } from '../themes/catalog';

export interface FogCell {
  /** Physical cell id: both levels of a bridge cell share one id. */
  id: string;
  x: number;
  y: number;
}

export interface FogRenderOptions {
  fogColor: string;
  lightTint: string;
  width: number;
  height: number;
  memRadius: number;
  lightRadius: number;
  activeX: number;
  activeY: number;
  explored: Set<string>;
  /** Maps an explored key to its physical cell and centre in canvas pixels. */
  cellOf: (key: string) => FogCell | null;
  /** Identifies the current maze/board instance so a new maze always clears the cache. */
  boardToken: unknown;
}

function createMemBrush(size = 96): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const r = size / 2;
    // Matches inner radius 0.2 / 1.65 ≈ 0.121 of memRadius
    const g = ctx.createRadialGradient(r, r, r * (0.2 / 1.65), r, r, r);
    g.addColorStop(0, 'rgba(0, 0, 0, 0.56)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return canvas;
}

function createLightBrush(size = 128): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const r = size / 2;
    const g = ctx.createRadialGradient(r, r, r * 0.28, r, r, r);
    g.addColorStop(0, 'rgba(0, 0, 0, 1)');
    g.addColorStop(0.64, 'rgba(0, 0, 0, 0.9)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return canvas;
}

/**
 * Incremental Fog of War compositor shared by all maze renderers.
 * Maintains a persistent explored-history surface and applies the live
 * flashlight on a separate scratch surface each frame so history is never mutated.
 */
export class FogCache {
  private exploredCanvas: HTMLCanvasElement | null = null;
  private scratchCanvas: HTMLCanvasElement | null = null;
  private memBrush: HTMLCanvasElement | null = null;
  private lightBrush: HTMLCanvasElement | null = null;
  private stampedCells = new Set<string>();
  private lastBoardToken: unknown = null;
  private lastFogColor = '';
  private lastWidth = 0;
  private lastHeight = 0;
  private lastMemRadius = 0;
  private lastExploredRef: Set<string> | null = null;

  private reset(opts: FogRenderOptions) {
    const { width, height, fogColor } = opts;
    this.exploredCanvas = ensureSizedCanvas(this.exploredCanvas, width, height);
    this.scratchCanvas = ensureSizedCanvas(this.scratchCanvas, width, height);

    const ectx = this.exploredCanvas.getContext('2d');
    if (ectx) {
      ectx.globalCompositeOperation = 'source-over';
      ectx.fillStyle = fogColor;
      ectx.fillRect(0, 0, width, height);
    }

    this.stampedCells.clear();
    this.lastExploredRef = null;
    this.lastBoardToken = opts.boardToken;
    this.lastFogColor = fogColor;
    this.lastWidth = width;
    this.lastHeight = height;
    this.lastMemRadius = opts.memRadius;
  }

  /** True when a cell stamped earlier is no longer explored (restart / retarget on the same board). */
  private lostStampedCell(opts: FogRenderOptions): boolean {
    const current = new Set<string>();
    for (const key of opts.explored) {
      const cell = opts.cellOf(key);
      if (cell) current.add(cell.id);
    }
    if (current.size < this.stampedCells.size) return true;
    for (const id of this.stampedCells) {
      if (!current.has(id)) return true;
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D, opts: FogRenderOptions): void {
    const {
      lightTint,
      width,
      height,
      memRadius,
      lightRadius,
      activeX,
      activeY,
      explored,
      cellOf,
    } = opts;

    if (!this.memBrush) this.memBrush = createMemBrush();
    if (!this.lightBrush) this.lightBrush = createLightBrush();

    const needsRebuild =
      !this.exploredCanvas ||
      this.lastBoardToken !== opts.boardToken ||
      this.lastFogColor !== opts.fogColor ||
      this.lastWidth !== width ||
      this.lastHeight !== height ||
      this.lastMemRadius !== memRadius ||
      (explored !== this.lastExploredRef &&
        this.lastExploredRef !== null &&
        this.lostStampedCell(opts));

    if (needsRebuild) this.reset(opts);

    const exploredCanvas = this.exploredCanvas!;
    const scratchCanvas = this.scratchCanvas!;
    const ectx = exploredCanvas.getContext('2d');
    const sctx = scratchCanvas.getContext('2d');
    if (!ectx || !sctx) return;

    // Stamp only newly explored physical cells
    if (explored !== this.lastExploredRef) {
      const memDia = memRadius * 2;
      ectx.globalCompositeOperation = 'destination-out';
      for (const key of explored) {
        const cell = cellOf(key);
        if (!cell || this.stampedCells.has(cell.id)) continue;
        this.stampedCells.add(cell.id);
        ectx.drawImage(
          this.memBrush,
          cell.x - memRadius,
          cell.y - memRadius,
          memDia,
          memDia,
        );
      }
      this.lastExploredRef = explored;
    }

    // Copy explored history to scratch surface and punch live flashlight cutout
    sctx.globalCompositeOperation = 'copy';
    sctx.drawImage(exploredCanvas, 0, 0);

    const lightDia = lightRadius * 2;
    sctx.globalCompositeOperation = 'destination-out';
    sctx.drawImage(
      this.lightBrush,
      activeX - lightRadius,
      activeY - lightRadius,
      lightDia,
      lightDia,
    );

    ctx.drawImage(scratchCanvas, 0, 0, width, height);

    // Subtle themed flashlight glow tint
    ctx.save();
    const tint = ctx.createRadialGradient(
      activeX,
      activeY,
      2,
      activeX,
      activeY,
      lightRadius,
    );
    tint.addColorStop(0, lightTint);
    tint.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.arc(activeX, activeY, lightRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

const MAX_GAME_DPR_FINE = 2;
const MAX_GAME_DPR_COARSE = 1.5;

export function getMaxGameDpr(): number {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(pointer: coarse)').matches
  ) {
    return MAX_GAME_DPR_COARSE;
  }
  return MAX_GAME_DPR_FINE;
}

export function ensureSizedCanvas(
  existing: HTMLCanvasElement | null,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = existing ?? document.createElement('canvas');
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return canvas;
}

export function paintCorridorFloor(
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number,
  theme: MazeTheme,
): void {
  ctx.save();
  ctx.globalAlpha = CORRIDOR_FLOOR_OPACITY;
  ctx.fillStyle = theme.corridorFloor;
  ctx.fillRect(offsetX, offsetY, width, height);
  ctx.restore();
}

export interface LiveTipStyle {
  color: string;
  width: number;
  alpha: number;
  /** Trail joints this stroke must leave out because another stroke already draws them. */
  cutouts: Array<{ x: number; y: number }>;
  bounds: { x: number; y: number; width: number; height: number };
}

/** Strokes the live trail (committed part and tip) given as an SVG path string. */
export function drawLiveTrailCanvas(
  ctx: CanvasRenderingContext2D,
  d: string,
  style: LiveTipStyle,
): void {
  if (!d) return;
  ctx.save();
  if (style.cutouts.length > 0) {
    const { bounds } = style;
    const r = style.width / 2;
    const clip = new Path2D();
    clip.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    for (const c of style.cutouts) {
      clip.moveTo(c.x + r, c.y);
      clip.arc(c.x, c.y, r, 0, Math.PI * 2);
    }
    ctx.clip(clip, 'evenodd');
  }
  ctx.globalAlpha = style.alpha;
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(d));
  ctx.restore();
}
