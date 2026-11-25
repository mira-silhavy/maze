import { CORRIDOR_FLOOR_OPACITY, type MazeTheme } from '../themes/catalog';

export interface FogRenderOptions {
  fogColor: string;
  lightTint: string;
  width: number;
  height: number;
  cellSize: number;
  offsetX: number;
  offsetY: number;
  activeX: number;
  activeY: number;
  explored: Set<string>;
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
 * Incremental Fog of War compositor for rectangular grid mazes.
 * Maintains a persistent explored-history surface and applies the live
 * flashlight on a separate scratch surface each frame so history is never mutated.
 */
export class GridFogCache {
  private exploredCanvas: HTMLCanvasElement | null = null;
  private scratchCanvas: HTMLCanvasElement | null = null;
  private memBrush: HTMLCanvasElement | null = null;
  private lightBrush: HTMLCanvasElement | null = null;
  private stampedCells = new Set<string>();
  private lastBoardToken: unknown = null;
  private lastFogColor = '';
  private lastWidth = 0;
  private lastHeight = 0;
  private lastCellSize = 0;
  private lastOffsetX = 0;
  private lastOffsetY = 0;
  private lastExploredRef: Set<string> | null = null;

  private ensureBrushes() {
    if (!this.memBrush) this.memBrush = createMemBrush();
    if (!this.lightBrush) this.lightBrush = createLightBrush();
  }

  private reset(
    width: number,
    height: number,
    fogColor: string,
    boardToken: unknown,
    cellSize: number,
    offsetX: number,
    offsetY: number,
  ) {
    if (!this.exploredCanvas) {
      this.exploredCanvas = document.createElement('canvas');
    }
    if (!this.scratchCanvas) {
      this.scratchCanvas = document.createElement('canvas');
    }
    if (
      this.exploredCanvas.width !== width ||
      this.exploredCanvas.height !== height
    ) {
      this.exploredCanvas.width = width;
      this.exploredCanvas.height = height;
    }
    if (
      this.scratchCanvas.width !== width ||
      this.scratchCanvas.height !== height
    ) {
      this.scratchCanvas.width = width;
      this.scratchCanvas.height = height;
    }

    const ectx = this.exploredCanvas.getContext('2d');
    if (ectx) {
      ectx.globalCompositeOperation = 'source-over';
      ectx.fillStyle = fogColor;
      ectx.fillRect(0, 0, width, height);
    }

    this.stampedCells.clear();
    this.lastBoardToken = boardToken;
    this.lastFogColor = fogColor;
    this.lastWidth = width;
    this.lastHeight = height;
    this.lastCellSize = cellSize;
    this.lastOffsetX = offsetX;
    this.lastOffsetY = offsetY;
  }

  draw(ctx: CanvasRenderingContext2D, opts: FogRenderOptions): void {
    const {
      fogColor,
      lightTint,
      width,
      height,
      cellSize,
      offsetX,
      offsetY,
      activeX,
      activeY,
      explored,
      boardToken,
    } = opts;

    this.ensureBrushes();

    let needsRebuild =
      !this.exploredCanvas ||
      this.lastBoardToken !== boardToken ||
      this.lastFogColor !== fogColor ||
      this.lastWidth !== width ||
      this.lastHeight !== height ||
      this.lastCellSize !== cellSize ||
      this.lastOffsetX !== offsetX ||
      this.lastOffsetY !== offsetY;

    // Detect restart/retarget on the same board (even when explored.size matches)
    if (!needsRebuild && explored !== this.lastExploredRef) {
      if (explored.size < this.stampedCells.size) {
        needsRebuild = true;
      } else {
        // Verify every previously stamped physical cell is still represented in explored
        const currentPhysical = new Set<string>();
        for (const key of explored) {
          const comma1 = key.indexOf(',');
          const comma2 = key.indexOf(',', comma1 + 1);
          const cellKey = comma2 === -1 ? key : key.slice(0, comma2);
          currentPhysical.add(cellKey);
        }
        if (currentPhysical.size < this.stampedCells.size) {
          needsRebuild = true;
        } else {
          for (const prevKey of this.stampedCells) {
            if (!currentPhysical.has(prevKey)) {
              needsRebuild = true;
              break;
            }
          }
        }
      }
    }

    if (needsRebuild) {
      this.reset(width, height, fogColor, boardToken, cellSize, offsetX, offsetY);
    }

    const exploredCanvas = this.exploredCanvas!;
    const scratchCanvas = this.scratchCanvas!;
    const ectx = exploredCanvas.getContext('2d');
    const sctx = scratchCanvas.getContext('2d');
    if (!ectx || !sctx) return;

    // Stamp only newly explored physical cells (over & under of a bridge count as one cell)
    if (needsRebuild || explored !== this.lastExploredRef) {
      const memRadius = cellSize * 1.65;
      const memDia = memRadius * 2;
      ectx.globalCompositeOperation = 'destination-out';
      for (const key of explored) {
        const comma1 = key.indexOf(',');
        const comma2 = key.indexOf(',', comma1 + 1);
        const cellKey = comma2 === -1 ? key : key.slice(0, comma2);
        if (this.stampedCells.has(cellKey)) continue;
        this.stampedCells.add(cellKey);
        const r = Number(cellKey.slice(0, comma1));
        const c = Number(cellKey.slice(comma1 + 1));
        const cx = offsetX + (c + 0.5) * cellSize;
        const cy = offsetY + (r + 0.5) * cellSize;
        ectx.drawImage(
          this.memBrush!,
          cx - memRadius,
          cy - memRadius,
          memDia,
          memDia,
        );
      }
      this.lastExploredRef = explored;
    }

    // Copy explored history to scratch surface and punch live flashlight cutout
    sctx.globalCompositeOperation = 'copy';
    sctx.drawImage(exploredCanvas, 0, 0);

    const lightRadius = cellSize * 2.8;
    const lightDia = lightRadius * 2;
    sctx.globalCompositeOperation = 'destination-out';
    sctx.drawImage(
      this.lightBrush!,
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
