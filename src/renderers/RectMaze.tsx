import { useEffect, useRef, type MutableRefObject } from 'react';
import { layerPath, layerTipParts, marbleDepth } from '../game/bridgeDepth';
import type { MarbleBody } from '../game/marble';
import {
  cellPositions,
  gridStep,
  positionKey,
} from '../maze/grid';
import type {
  AspectRatioId,
  Cell,
  GameMode,
  Maze,
  Position,
} from '../maze/types';
import {
  drawMarbleCanvas,
  drawThemedGoalCanvas,
  drawThemedPlayerCanvas,
  drawThemedTargetCanvas,
} from '../themes/art';
import {
  FOG_LIGHT_RADIUS,
  FOG_MEMORY_RADIUS,
  type MazeTheme,
} from '../themes/catalog';
import {
  drawThemedBridgeDeckCanvas,
  drawThemedBridgeRailsCanvas,
  strokeThemedWallsCanvas,
} from '../themes/sceneCanvas';
import {
  ensureSizedCanvas,
  FogCache,
  getMaxGameDpr,
  paintCorridorFloor,
} from './canvasLayers';

interface RectMazeProps {
  maze: Maze;
  player: Position;
  visited: Set<string>;
  explored: Set<string>;
  trail: Position[];
  hintPath: Position[];
  aspectRatioId: AspectRatioId;
  gameMode: GameMode;
  targets: Position[];
  collected: Set<string>;
  theme: MazeTheme;
  marbleMode?: boolean;
  marbleRef?: MutableRefObject<MarbleBody>;
  registerDraw?: (fn: (() => void) | null) => void;
  fogOfWar?: boolean;
  fullScreen?: boolean;
}

const CONTAINER_MAX_WIDTH: Record<AspectRatioId, string> = {
  square: 'max-w-[600px]',
  tablet: 'max-w-[820px]',
  widescreen: 'max-w-[1060px]',
};

interface RectStaticCache {
  maze: Maze | null;
  theme: MazeTheme | null;
  width: number;
  height: number;
  dpr: number;
  bridges: Cell[];
  wallsCanvas: HTMLCanvasElement | null;
  bridgeDecksCanvas: HTMLCanvasElement | null;
  bridgeRailsCanvas: HTMLCanvasElement | null;
}

export function RectMaze({
  maze,
  player,
  visited,
  explored,
  trail,
  hintPath,
  aspectRatioId,
  gameMode,
  targets,
  collected,
  theme,
  marbleMode = false,
  marbleRef,
  registerDraw,
  fogOfWar = false,
  fullScreen = false,
}: RectMazeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const boardCanvasRef = useRef<HTMLCanvasElement>(null);
  const lowerCanvasRef = useRef<HTMLCanvasElement>(null);
  const bridgesCanvasRef = useRef<HTMLCanvasElement>(null);
  const railsCanvasRef = useRef<HTMLCanvasElement>(null);
  const upperCanvasRef = useRef<HTMLCanvasElement>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement>(null);
  const fogCacheRef = useRef<FogCache | null>(null);
  const staticCacheRef = useRef<RectStaticCache>({
    maze: null,
    theme: null,
    width: 0,
    height: 0,
    dpr: 0,
    bridges: [],
    wallsCanvas: null,
    bridgeDecksCanvas: null,
    bridgeRailsCanvas: null,
  });
  const sizeRef = useRef({ width: 220, height: 160, dpr: 1 });
  const propsRef = useRef({
    maze,
    player,
    visited,
    explored,
    trail,
    hintPath,
    gameMode,
    targets,
    collected,
    theme,
    marbleMode,
    marbleRef,
    fogOfWar,
  });
  propsRef.current = {
    maze,
    player,
    visited,
    explored,
    trail,
    hintPath,
    gameMode,
    targets,
    collected,
    theme,
    marbleMode,
    marbleRef,
    fogOfWar,
  };

  const computeLayout = (innerWidth: number, innerHeight: number, curMaze: Maze) => {
    const padding = 10;
    const cellSize = Math.min(
      (innerWidth - padding * 2) / curMaze.cols,
      (innerHeight - padding * 2) / curMaze.rows,
    );
    const offsetX = (innerWidth - cellSize * curMaze.cols) / 2;
    const offsetY = (innerHeight - cellSize * curMaze.rows) / 2;
    const wallWidth = Math.max(1.5, Math.min(3.5, cellSize * 0.1));
    return { cellSize, offsetX, offsetY, wallWidth };
  };

  const ensureStaticCache = (
    curMaze: Maze,
    curTheme: MazeTheme,
    innerWidth: number,
    innerHeight: number,
    dpr: number,
    cellSize: number,
    offsetX: number,
    offsetY: number,
    wallWidth: number,
  ): RectStaticCache => {
    const cache = staticCacheRef.current;
    if (
      cache.maze === curMaze &&
      cache.theme === curTheme &&
      cache.width === innerWidth &&
      cache.height === innerHeight &&
      cache.dpr === dpr
    ) {
      return cache;
    }

    const targetW = Math.floor(innerWidth * dpr);
    const targetH = Math.floor(innerHeight * dpr);
    const wallSegments: Array<[number, number, number, number]> = [];
    const bridges: Cell[] = [];

    for (let r = 0; r < curMaze.rows; r++) {
      for (let c = 0; c < curMaze.cols; c++) {
        const cell = curMaze.grid[r][c];
        if (cell.bridge) {
          bridges.push(cell);
          continue;
        }
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;

        if (cell.walls.top) {
          wallSegments.push([x, y, x + cellSize, y]);
        }
        if (cell.walls.left) {
          wallSegments.push([x, y, x, y + cellSize]);
        }
        if (
          cell.walls.bottom &&
          (r === curMaze.rows - 1 || curMaze.grid[r + 1][c].bridge)
        ) {
          wallSegments.push([x, y + cellSize, x + cellSize, y + cellSize]);
        }
        if (
          cell.walls.right &&
          (c === curMaze.cols - 1 || curMaze.grid[r][c + 1].bridge)
        ) {
          wallSegments.push([x + cellSize, y, x + cellSize, y + cellSize]);
        }
      }
    }

    cache.wallsCanvas = ensureSizedCanvas(cache.wallsCanvas, targetW, targetH);
    const wctx = cache.wallsCanvas.getContext('2d');
    if (wctx) {
      wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      wctx.clearRect(0, 0, innerWidth, innerHeight);
      strokeThemedWallsCanvas(wctx, wallSegments, wallWidth, cellSize, curTheme);
    }

    cache.bridges = bridges;
    if (bridges.length > 0) {
      const half = cellSize / 2;
      const overhang = cellSize * 0.14;
      const deckW = cellSize + overhang * 2;

      cache.bridgeDecksCanvas = ensureSizedCanvas(
        cache.bridgeDecksCanvas,
        targetW,
        targetH,
      );
      const dctx = cache.bridgeDecksCanvas.getContext('2d');
      if (dctx) {
        dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        dctx.clearRect(0, 0, innerWidth, innerHeight);
        const tunnelDepth = cellSize * 0.32;
        const tunnelSpan = Math.max(2, cellSize - wallWidth);
        for (const cell of bridges) {
          dctx.save();
          dctx.translate(
            offsetX + (cell.col + 0.5) * cellSize,
            offsetY + (cell.row + 0.5) * cellSize,
          );
          if (cell.bridge === 'vertical') dctx.rotate(Math.PI / 2);

          const gTop = dctx.createLinearGradient(0, -half - tunnelDepth, 0, -half);
          gTop.addColorStop(0, 'rgba(0, 0, 0, 0)');
          gTop.addColorStop(
            1,
            curTheme.isLight ? 'rgba(0, 0, 0, 0.30)' : 'rgba(0, 0, 0, 0.74)',
          );
          dctx.fillStyle = gTop;
          dctx.fillRect(
            -half + wallWidth * 0.5,
            -half - tunnelDepth,
            tunnelSpan,
            tunnelDepth,
          );

          const gBot = dctx.createLinearGradient(0, half, 0, half + tunnelDepth);
          gBot.addColorStop(
            0,
            curTheme.isLight ? 'rgba(0, 0, 0, 0.34)' : 'rgba(0, 0, 0, 0.78)',
          );
          gBot.addColorStop(1, 'rgba(0, 0, 0, 0)');
          dctx.fillStyle = gBot;
          dctx.fillRect(-half + wallWidth * 0.5, half, tunnelSpan, tunnelDepth);

          drawThemedBridgeDeckCanvas(
            dctx,
            half,
            overhang,
            deckW,
            cellSize,
            wallWidth,
            curTheme,
          );
          dctx.restore();
        }
      }

      cache.bridgeRailsCanvas = ensureSizedCanvas(
        cache.bridgeRailsCanvas,
        targetW,
        targetH,
      );
      const rctx = cache.bridgeRailsCanvas.getContext('2d');
      if (rctx) {
        rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        rctx.clearRect(0, 0, innerWidth, innerHeight);
        for (const cell of bridges) {
          rctx.save();
          rctx.translate(
            offsetX + (cell.col + 0.5) * cellSize,
            offsetY + (cell.row + 0.5) * cellSize,
          );
          if (cell.bridge === 'vertical') rctx.rotate(Math.PI / 2);
          drawThemedBridgeRailsCanvas(
            rctx,
            half,
            overhang,
            cellSize,
            wallWidth,
            curTheme,
          );
          rctx.restore();
        }
      }
    }

    cache.maze = curMaze;
    cache.theme = curTheme;
    cache.width = innerWidth;
    cache.height = innerHeight;
    cache.dpr = dpr;
    return cache;
  };

  /** Leaves `cutouts` (grid units) out of everything stroked until the matching restore. */
  const clipOutJoints = (
    ctx: CanvasRenderingContext2D,
    cutouts: ReadonlyArray<{ x: number; y: number }>,
    radius: number,
    cellSize: number,
    offsetX: number,
    offsetY: number,
  ) => {
    if (cutouts.length === 0) return;
    const { width, height } = sizeRef.current;
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    for (const c of cutouts) {
      const x = offsetX + c.x * cellSize;
      const y = offsetY + c.y * cellSize;
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
    ctx.clip('evenodd');
  };

  const strokeTrailRuns = (
    ctx: CanvasRenderingContext2D,
    runs: ReadonlyArray<ReadonlyArray<{ x: number; y: number }>>,
    cellSize: number,
    offsetX: number,
    offsetY: number,
    curTheme: MazeTheme,
    cutouts: ReadonlyArray<{ x: number; y: number }> = [],
  ) => {
    if (!runs.some((run) => run.length >= 2)) return;
    const lineWidth = Math.max(2.5, cellSize * 0.22);
    const glowWidth = lineWidth * (curTheme.isLight ? 1.55 : 2.1);

    const tracePath = () => {
      ctx.beginPath();
      for (const run of runs) {
        run.forEach((p, i) => {
          const x = offsetX + p.x * cellSize;
          const y = offsetY + p.y * cellSize;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
      }
    };

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.save();
    clipOutJoints(ctx, cutouts, glowWidth / 2, cellSize, offsetX, offsetY);
    tracePath();
    ctx.strokeStyle = curTheme.pencilGlow;
    ctx.lineWidth = glowWidth;
    ctx.globalAlpha = curTheme.isLight ? 0.35 : 0.42;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    clipOutJoints(ctx, cutouts, lineWidth / 2, cellSize, offsetX, offsetY);
    tracePath();
    ctx.strokeStyle = curTheme.pencilLine;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = curTheme.isLight ? 0.85 : 0.78;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  };

  const strokeHintRuns = (
    ctx: CanvasRenderingContext2D,
    runs: Position[][],
    cellSize: number,
    offsetX: number,
    offsetY: number,
    curTheme: MazeTheme,
    cutouts: Position[] = [],
  ) => {
    if (runs.length === 0) return;
    const lineWidth = Math.max(2, cellSize * 0.16);
    ctx.save();
    clipOutJoints(ctx, cutouts.map(centerOf), lineWidth / 2, cellSize, offsetX, offsetY);
    ctx.beginPath();
    ctx.strokeStyle = curTheme.hintStroke;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([
      Math.max(3, cellSize * 0.2),
      Math.max(4, cellSize * 0.25),
    ]);
    for (const run of runs) {
      run.forEach((p, i) => {
        const x = offsetX + (p.col + 0.5) * cellSize;
        const y = offsetY + (p.row + 0.5) * cellSize;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
    }
    ctx.stroke();
    ctx.restore();
  };

  const drawBoardRef = useRef<() => void>(() => {});
  drawBoardRef.current = () => {
    const canvas = boardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: innerWidth, height: innerHeight, dpr } = sizeRef.current;
    const {
      maze: curMaze,
      visited: curVisited,
      trail: curTrail,
      hintPath: curHintPath,
      gameMode: curGameMode,
      targets: curTargets,
      collected: curCollected,
      theme: curTheme,
      marbleMode: curMarbleMode,
    } = propsRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { cellSize, offsetX, offsetY, wallWidth } = computeLayout(
      innerWidth,
      innerHeight,
      curMaze,
    );

    const cache = ensureStaticCache(
      curMaze,
      curTheme,
      innerWidth,
      innerHeight,
      dpr,
      cellSize,
      offsetX,
      offsetY,
      wallWidth,
    );

    ctx.clearRect(0, 0, innerWidth, innerHeight);

    paintCorridorFloor(
      ctx,
      offsetX,
      offsetY,
      cellSize * curMaze.cols,
      cellSize * curMaze.rows,
      curTheme,
    );

    // Visited cells tint
    if (curVisited.size > 0) {
      ctx.fillStyle = curTheme.visitedFill;
      for (let r = 0; r < curMaze.rows; r++) {
        for (let c = 0; c < curMaze.cols; c++) {
          const isVisited = cellPositions(curMaze.grid[r][c]).some((pos) =>
            curVisited.has(positionKey(pos)),
          );
          if (isVisited) {
            ctx.fillRect(
              offsetX + c * cellSize + 1,
              offsetY + r * cellSize + 1,
              cellSize - 2,
              cellSize - 2,
            );
          }
        }
      }
    }

    // Committed ground / underpass trail (in Marble Mode the last segment lives on the live layers)
    const trail = layerPath(
      curTrail,
      curMarbleMode ? curTrail.length - 2 : curTrail.length - 1,
    );
    const drawCommittedTrail = () =>
      strokeTrailRuns(
        ctx,
        trail.lower.map((run) => run.map(centerOf)),
        cellSize,
        offsetX,
        offsetY,
        curTheme,
      );
    // The live tip is drawn above the markers, so a marble trail goes above them too.
    if (!curMarbleMode) drawCommittedTrail();

    // Start cell highlight / cross in collect mode
    const startCenterX = offsetX + (curMaze.start.col + 0.5) * cellSize;
    const startCenterY = offsetY + (curMaze.start.row + 0.5) * cellSize;

    ctx.fillStyle = curTheme.startHighlight;
    ctx.fillRect(
      offsetX + curMaze.start.col * cellSize + 1,
      offsetY + curMaze.start.row * cellSize + 1,
      cellSize - 2,
      cellSize - 2,
    );

    if (curGameMode === 'collect') {
      const crossArm = Math.max(4, cellSize * 0.24);
      ctx.save();
      ctx.strokeStyle = curTheme.startCross;
      ctx.lineWidth = Math.max(2, cellSize * 0.12);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(startCenterX - crossArm, startCenterY - crossArm);
      ctx.lineTo(startCenterX + crossArm, startCenterY + crossArm);
      ctx.moveTo(startCenterX + crossArm, startCenterY - crossArm);
      ctx.lineTo(startCenterX - crossArm, startCenterY + crossArm);
      ctx.stroke();
      ctx.restore();
    }

    // Goal(s)
    if (curGameMode === 'classic') {
      const endCenterX = offsetX + (curMaze.end.col + 0.5) * cellSize;
      const endCenterY = offsetY + (curMaze.end.row + 0.5) * cellSize;
      ctx.fillStyle = curTheme.goalHighlight;
      ctx.fillRect(
        offsetX + curMaze.end.col * cellSize + 1,
        offsetY + curMaze.end.row * cellSize + 1,
        cellSize - 2,
        cellSize - 2,
      );
      drawThemedGoalCanvas(ctx, endCenterX, endCenterY, cellSize, curTheme);
    } else {
      for (const target of curTargets) {
        const key = positionKey(target);
        const isCollected = curCollected.has(key);
        const cx = offsetX + (target.col + 0.5) * cellSize;
        const cy = offsetY + (target.row + 0.5) * cellSize;
        if (!isCollected) {
          ctx.fillStyle = curTheme.targetFill;
          ctx.fillRect(
            offsetX + target.col * cellSize + 1,
            offsetY + target.row * cellSize + 1,
            cellSize - 2,
            cellSize - 2,
          );
        }
        drawThemedTargetCanvas(ctx, cx, cy, cellSize, curTheme, isCollected);
      }
    }

    if (curMarbleMode) drawCommittedTrail();

    // Optional hint path (ground / underpass part)
    const hint = layerPath(curHintPath, curHintPath.length - 1);
    strokeHintRuns(ctx, hint.lower, cellSize, offsetX, offsetY, curTheme);

    // Cached maze walls
    if (cache.wallsCanvas) {
      ctx.drawImage(cache.wallsCanvas, 0, 0, innerWidth, innerHeight);
    }

    // Bridges layer: cached decks -> bridge-top trail & hint. Rails get their own layer above the live ones.
    const bctx = bridgesCanvasRef.current?.getContext('2d');
    const rctx = railsCanvasRef.current?.getContext('2d');
    if (!bctx || !rctx) return;
    for (const c of [bctx, rctx]) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, innerWidth, innerHeight);
    }
    if (cache.bridges.length === 0) return;
    if (cache.bridgeDecksCanvas) {
      bctx.drawImage(cache.bridgeDecksCanvas, 0, 0, innerWidth, innerHeight);
    }
    strokeTrailRuns(
      bctx,
      trail.upper.map((run) => run.map(centerOf)),
      cellSize,
      offsetX,
      offsetY,
      curTheme,
      trail.upperCutouts.map(centerOf),
    );
    strokeHintRuns(
      bctx,
      hint.upper,
      cellSize,
      offsetX,
      offsetY,
      curTheme,
      hint.upperCutouts,
    );
    if (cache.bridgeRailsCanvas) {
      rctx.drawImage(cache.bridgeRailsCanvas, 0, 0, innerWidth, innerHeight);
    }
  };

  const drawLiveRef = useRef<() => void>(() => {});
  drawLiveRef.current = () => {
    const lower = lowerCanvasRef.current?.getContext('2d');
    const upper = upperCanvasRef.current?.getContext('2d');
    if (!lower || !upper) return;

    const { width: innerWidth, height: innerHeight, dpr } = sizeRef.current;
    const {
      maze: curMaze,
      player: curPlayer,
      explored: curExplored,
      trail: curTrail,
      theme: curTheme,
      marbleMode: curMarbleMode,
      marbleRef: curMarbleRef,
      fogOfWar: curFogOfWar,
    } = propsRef.current;

    const layers = { lower, upper };
    for (const ctx of [lower, upper]) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
    }

    const { cellSize, offsetX, offsetY } = computeLayout(
      innerWidth,
      innerHeight,
      curMaze,
    );

    const marble = curMarbleMode && curMarbleRef ? curMarbleRef.current : null;
    const spot = marble ?? {
      x: curPlayer.col + 0.5,
      y: curPlayer.row + 0.5,
      row: curPlayer.row,
      col: curPlayer.col,
      level: curPlayer.level,
    };
    const activeX = offsetX + spot.x * cellSize;
    const activeY = offsetY + spot.y * cellSize;

    const drawActiveEntity = (
      ctx: CanvasRenderingContext2D,
      under: boolean,
      alpha?: number,
    ) => {
      if (marble) {
        drawMarbleCanvas(
          ctx,
          activeX,
          activeY,
          Math.max(4, cellSize * 0.29),
          curTheme,
          {
            under,
            alpha,
            elevated: !under && marble.level === 'over',
            u: marble.u,
            v: marble.v,
            squash: marble.squash,
            squashAxis: marble.squashAxis,
          },
        );
      } else {
        drawThemedPlayerCanvas(ctx, activeX, activeY, cellSize, curTheme, under);
      }
    };

    // Live trail tip (Marble Mode only): last segment up to the marble, then the start of the next
    if (marble) {
      const tip = layerTipParts(curTrail, rectTipParts(curMaze, marble, curTrail));
      for (const layer of ['lower', 'upper'] as const) {
        strokeTrailRuns(
          layers[layer],
          tip[layer].parts.map((part) => part.coords),
          cellSize,
          offsetX,
          offsetY,
          curTheme,
          tip[layer].cutouts.map(centerOf),
        );
      }
    }

    const depth = marbleDepth(curMaze, spot);
    drawActiveEntity(layers[depth.layer], false);
    if (depth.ghost) {
      // Ghost only where the deck covers the entity, so tunnel shadows still shade it.
      const cell = depth.ghost.cell;
      const half = cellSize / 2;
      const overhang = cellSize * 0.14;
      upper.save();
      upper.beginPath();
      upper.save();
      upper.translate(
        offsetX + (cell.col + 0.5) * cellSize,
        offsetY + (cell.row + 0.5) * cellSize,
      );
      if (cell.bridge === 'vertical') upper.rotate(Math.PI / 2);
      upper.rect(-half - overhang, -half, cellSize + overhang * 2, cellSize);
      upper.restore();
      upper.clip();
      drawActiveEntity(upper, true, depth.ghost.alpha);
      upper.restore();
    }

    const fogCtx = fogCanvasRef.current?.getContext('2d');
    if (!fogCtx) return;
    fogCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fogCtx.clearRect(0, 0, innerWidth, innerHeight);
    if (!curFogOfWar) return;
    if (!fogCacheRef.current) {
      fogCacheRef.current = new FogCache();
    }
    fogCacheRef.current.draw(fogCtx, {
      fogColor: curTheme.fogColor,
      lightTint: curTheme.lightTint,
      width: innerWidth,
      height: innerHeight,
      memRadius: cellSize * FOG_MEMORY_RADIUS,
      lightRadius: cellSize * FOG_LIGHT_RADIUS,
      activeX,
      activeY,
      explored: curExplored,
      cellOf: (key) => {
        const comma1 = key.indexOf(',');
        const comma2 = key.indexOf(',', comma1 + 1);
        const id = comma2 === -1 ? key : key.slice(0, comma2);
        const r = Number(id.slice(0, comma1));
        const c = Number(id.slice(comma1 + 1));
        return {
          id,
          x: offsetX + (c + 0.5) * cellSize,
          y: offsetY + (r + 0.5) * cellSize,
        };
      },
      boardToken: curMaze,
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvases = [
      boardCanvasRef.current,
      lowerCanvasRef.current,
      bridgesCanvasRef.current,
      upperCanvasRef.current,
      railsCanvasRef.current,
      fogCanvasRef.current,
    ];
    if (!container || canvases.some((c) => !c)) return;
    const layers = canvases as HTMLCanvasElement[];

    const syncSize = () => {
      const rect = container.getBoundingClientRect();
      const innerWidth = Math.max(220, Math.floor(rect.width - 16));
      const innerHeight = Math.max(160, Math.floor(rect.height - 16));
      const dpr = Math.min(window.devicePixelRatio || 1, getMaxGameDpr());
      const targetW = Math.floor(innerWidth * dpr);
      const targetH = Math.floor(innerHeight * dpr);

      const prev = sizeRef.current;
      const changed =
        layers.some((c) => c.width !== targetW || c.height !== targetH) ||
        prev.width !== innerWidth ||
        prev.height !== innerHeight ||
        prev.dpr !== dpr;

      if (changed) {
        sizeRef.current = { width: innerWidth, height: innerHeight, dpr };
        for (const c of layers) {
          if (c.width !== targetW) c.width = targetW;
          if (c.height !== targetH) c.height = targetH;
          c.style.width = `${innerWidth}px`;
          c.style.height = `${innerHeight}px`;
        }
        drawBoardRef.current();
        drawLiveRef.current();
      }
    };

    syncSize();
    const observer = new ResizeObserver(syncSize);
    observer.observe(container);
    window.addEventListener('resize', syncSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncSize);
    };
  }, []);

  useEffect(() => {
    if (!registerDraw) return;
    const drawLive = () => drawLiveRef.current();
    registerDraw(drawLive);
    return () => registerDraw(null);
  }, [registerDraw]);

  useEffect(() => {
    drawBoardRef.current();
    drawLiveRef.current();
  }, [
    maze,
    player,
    visited,
    explored,
    trail,
    hintPath,
    gameMode,
    targets,
    collected,
    theme,
    marbleMode,
    fogOfWar,
    fullScreen,
    aspectRatioId,
  ]);

  const overlayClass = 'pointer-events-none absolute inset-0 block rounded-xl';
  return (
    <div
      ref={containerRef}
      style={fullScreen ? undefined : { aspectRatio: `${maze.cols} / ${maze.rows}` }}
      className={
        fullScreen
          ? `flex h-full w-full items-center justify-center rounded-2xl border p-2 ${theme.containerClass}`
          : `flex max-h-[68vh] w-full ${CONTAINER_MAX_WIDTH[aspectRatioId]} items-center justify-center rounded-2xl border p-2 ${theme.containerClass}`
      }
    >
      <div className="relative shrink-0">
        {/* Bottom to top: board, lower live, bridges, upper live, rails, fog (see game/bridgeDepth) */}
        <canvas ref={boardCanvasRef} className="block rounded-xl" />
        <canvas ref={lowerCanvasRef} className={overlayClass} />
        <canvas ref={bridgesCanvasRef} className={overlayClass} />
        <canvas ref={upperCanvasRef} className={overlayClass} />
        <canvas ref={railsCanvasRef} className={overlayClass} />
        <canvas ref={fogCanvasRef} className={overlayClass} />
      </div>
    </div>
  );
}

function centerOf(pos: Position): { x: number; y: number } {
  return { x: pos.col + 0.5, y: pos.row + 0.5 };
}

interface RectTipPart {
  from: Position;
  to: Position;
  coords: Array<{ x: number; y: number }>;
}

/** Start of the next segment, from `cur`'s centre toward the marble (grid units). */
function extendFromCenter(
  maze: Maze,
  marble: MarbleBody,
  cur: Position,
): RectTipPart | null {
  const c = centerOf(cur);
  const relX = marble.x - c.x;
  const relY = marble.y - c.y;
  const horizontal = Math.abs(relX) >= Math.abs(relY);
  const rel = horizontal ? relX : relY;
  if (Math.abs(rel) <= 0.02) return null;
  const dir = horizontal
    ? rel > 0
      ? 'right'
      : 'left'
    : rel > 0
      ? 'bottom'
      : 'top';
  const next = gridStep(maze, cur, dir);
  if (!next) return null;
  const end = horizontal ? { x: marble.x, y: c.y } : { x: c.x, y: marble.y };
  return { from: cur, to: next, coords: [c, end] };
}

function rectTipParts(
  maze: Maze,
  marble: MarbleBody,
  trail: Position[],
): RectTipPart[] {
  if (trail.length === 0) return [];
  const cur = trail[trail.length - 1];
  if (trail.length === 1) {
    const ext = extendFromCenter(maze, marble, cur);
    return ext ? [ext] : [];
  }
  const prev = trail[trail.length - 2];
  const dx = cur.col - prev.col;
  const dy = cur.row - prev.row;
  const start = centerOf(prev);
  const proj = Math.max(
    0,
    Math.min(1, (marble.x - start.x) * dx + (marble.y - start.y) * dy),
  );
  const parts: RectTipPart[] = [
    {
      from: prev,
      to: cur,
      coords: [start, { x: start.x + dx * proj, y: start.y + dy * proj }],
    },
  ];
  if (proj >= 0.999) {
    const ext = extendFromCenter(maze, marble, cur);
    if (ext) parts.push(ext);
  }
  return parts;
}
