import { useEffect, useRef, type MutableRefObject } from 'react';
import type { MarbleBody } from '../game/marble';
import {
  cellPositions,
  gridStep,
  pathThrough,
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
import type { MazeTheme } from '../themes/catalog';
import {
  drawThemedBridgeDeckCanvas,
  drawThemedBridgeRailsCanvas,
  strokeThemedWallsCanvas,
} from '../themes/sceneCanvas';
import {
  ensureSizedCanvas,
  GridFogCache,
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

const MAX_GAME_DPR = 2;

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fogCacheRef = useRef<GridFogCache | null>(null);
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

  const drawRef = useRef<() => void>(() => {});
  drawRef.current = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: innerWidth, height: innerHeight, dpr } = sizeRef.current;
    const {
      maze: curMaze,
      player: curPlayer,
      visited: curVisited,
      explored: curExplored,
      trail: curTrail,
      hintPath: curHintPath,
      gameMode: curGameMode,
      targets: curTargets,
      collected: curCollected,
      theme: curTheme,
      marbleMode: curMarbleMode,
      marbleRef: curMarbleRef,
      fogOfWar: curFogOfWar,
    } = propsRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padding = 10;
    const cellSize = Math.min(
      (innerWidth - padding * 2) / curMaze.cols,
      (innerHeight - padding * 2) / curMaze.rows,
    );
    const offsetX = (innerWidth - cellSize * curMaze.cols) / 2;
    const offsetY = (innerHeight - cellSize * curMaze.rows) / 2;

    const marble = curMarbleMode && curMarbleRef ? curMarbleRef.current : null;
    const activeRow = marble ? marble.row : curPlayer.row;
    const activeCol = marble ? marble.col : curPlayer.col;
    const activeLevel = marble ? marble.level : curPlayer.level;
    const activeX = marble
      ? offsetX + marble.x * cellSize
      : offsetX + (curPlayer.col + 0.5) * cellSize;
    const activeY = marble
      ? offsetY + marble.y * cellSize
      : offsetY + (curPlayer.row + 0.5) * cellSize;

    // Transparent board so continuous full-page backdrop shines through
    ctx.clearRect(0, 0, innerWidth, innerHeight);

    // Semi-transparent corridor floor
    paintCorridorFloor(
      ctx,
      offsetX,
      offsetY,
      cellSize * curMaze.cols,
      cellSize * curMaze.rows,
      curTheme,
    );

    // Subtle visited cells tint
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

    const strokeTrailCoords = (
      coords: ReadonlyArray<{ x: number; y: number }>,
    ) => {
      if (coords.length < 2) return;
      const lineWidth = Math.max(2.5, cellSize * 0.22);
      ctx.save();
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      coords.forEach((pt, idx) => {
        const x = offsetX + pt.x * cellSize;
        const y = offsetY + pt.y * cellSize;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.strokeStyle = curTheme.pencilGlow;
      ctx.lineWidth = lineWidth * (curTheme.isLight ? 1.55 : 2.1);
      ctx.globalAlpha = curTheme.isLight ? 0.35 : 0.42;
      ctx.stroke();

      ctx.strokeStyle = curTheme.pencilLine;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = curTheme.isLight ? 0.85 : 0.78;
      ctx.stroke();
      ctx.restore();
    };

    const extendFromCenter = (cur: Position): { x: number; y: number } | null => {
      if (!marble) return null;
      const cx = cur.col + 0.5;
      const cy = cur.row + 0.5;
      const relX = marble.x - cx;
      const relY = marble.y - cy;
      if (Math.abs(relX) >= Math.abs(relY)) {
        if (relX > 0.02 && gridStep(curMaze, cur, 'right')) {
          return { x: marble.x, y: cy };
        }
        if (relX < -0.02 && gridStep(curMaze, cur, 'left')) {
          return { x: marble.x, y: cy };
        }
      } else {
        if (relY > 0.02 && gridStep(curMaze, cur, 'bottom')) {
          return { x: cx, y: marble.y };
        }
        if (relY < -0.02 && gridStep(curMaze, cur, 'top')) {
          return { x: cx, y: marble.y };
        }
      }
      return null;
    };

    const projectTrailEnd = (
      prev: Position,
      cur: Position,
    ): Array<{ x: number; y: number }> => {
      if (!marble) return [{ x: cur.col + 0.5, y: cur.row + 0.5 }];
      const dx = cur.col - prev.col;
      const dy = cur.row - prev.row;
      const proj = Math.max(
        0,
        Math.min(
          1,
          (marble.x - (prev.col + 0.5)) * dx +
            (marble.y - (prev.row + 0.5)) * dy,
        ),
      );
      const pts = [
        {
          x: prev.col + 0.5 + dx * proj,
          y: prev.row + 0.5 + dy * proj,
        },
      ];
      if (proj >= 0.999) {
        const ext = extendFromCenter(cur);
        if (ext) pts.push(ext);
      }
      return pts;
    };

    const strokeTrail = (points: Position[], trimLiveEnd = false) => {
      if (points.length === 0) return;
      if (!marble || !trimLiveEnd) {
        strokeTrailCoords(
          points.map((pos) => ({ x: pos.col + 0.5, y: pos.row + 0.5 })),
        );
        return;
      }
      if (points.length === 1) {
        const cur = points[0];
        const ext = extendFromCenter(cur);
        if (ext) {
          strokeTrailCoords([{ x: cur.col + 0.5, y: cur.row + 0.5 }, ext]);
        }
        return;
      }
      const coords = points
        .slice(0, -1)
        .map((pos) => ({ x: pos.col + 0.5, y: pos.row + 0.5 }));
      coords.push(
        ...projectTrailEnd(
          points[points.length - 2],
          points[points.length - 1],
        ),
      );
      strokeTrailCoords(coords);
    };

    const strokeHint = (points: Position[]) => {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = curTheme.hintStroke;
      ctx.lineWidth = Math.max(2, cellSize * 0.16);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([
        Math.max(3, cellSize * 0.2),
        Math.max(4, cellSize * 0.25),
      ]);

      points.forEach((pos, idx) => {
        const x = offsetX + (pos.col + 0.5) * cellSize;
        const y = offsetY + (pos.row + 0.5) * cellSize;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();
    };

    const drawActiveEntity = (under: boolean, alpha?: number) => {
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
            elevated: !under && activeLevel === 'over',
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

    const underAlphaForDistance = (d: number): number => {
      const t = Math.max(0, Math.min(1, 1 - d / 0.72));
      const smooth = t * t * (3 - 2 * t);
      return 0.85 - smooth * 0.53;
    };

    let underBridge: { cell: Cell; alpha: number } | null = null;
    if (activeLevel === 'under') {
      const bridgeCell = curMaze.grid[activeRow]?.[activeCol];
      if (bridgeCell?.bridge) {
        const d = marble
          ? bridgeCell.bridge === 'horizontal'
            ? Math.abs(marble.y - (bridgeCell.row + 0.5))
            : Math.abs(marble.x - (bridgeCell.col + 0.5))
          : 0;
        underBridge = {
          cell: bridgeCell,
          alpha: marble ? underAlphaForDistance(d) : 0.5,
        };
      }
    } else if (marble && activeLevel === undefined) {
      const adjacent: Array<[number, number, 'horizontal' | 'vertical']> = [
        [activeRow - 1, activeCol, 'horizontal'],
        [activeRow + 1, activeCol, 'horizontal'],
        [activeRow, activeCol - 1, 'vertical'],
        [activeRow, activeCol + 1, 'vertical'],
      ];
      for (const [nr, nc, bridgeAxis] of adjacent) {
        const neighbor = curMaze.grid[nr]?.[nc];
        if (neighbor?.bridge !== bridgeAxis) continue;
        const d =
          bridgeAxis === 'horizontal'
            ? Math.abs(marble.y - (nr + 0.5))
            : Math.abs(marble.x - (nc + 0.5));
        if (d < 0.82) {
          underBridge = { cell: neighbor, alpha: underAlphaForDistance(d) };
          break;
        }
      }
    }

    const wallWidth = Math.max(1.5, Math.min(3.5, cellSize * 0.1));

    // Rebuild cached static passes (walls, bridge decks, bridge rails) only when inputs change
    const cache = staticCacheRef.current;
    if (
      cache.maze !== curMaze ||
      cache.theme !== curTheme ||
      cache.width !== innerWidth ||
      cache.height !== innerHeight ||
      cache.dpr !== dpr
    ) {
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
    }

    // Continuous pencil line along player's path (projected cleanly to the live marble without overshooting)
    if (curTrail.length > 0) {
      strokeTrail(curTrail, true);
    }

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

    // Optional hint path
    if (curHintPath.length > 1) {
      strokeHint(curHintPath);
    }

    // Cached maze walls
    if (cache.wallsCanvas) {
      ctx.drawImage(cache.wallsCanvas, 0, 0, innerWidth, innerHeight);
    }

    // Draw the portion of a marble outside the deck before bridges so it slides smoothly underneath
    if (underBridge && marble) {
      drawActiveEntity(false);
    }

    // Cached bridge decks -> clipped upper-route trail/hint & underpass entity -> cached bridge rails
    if (cache.bridges.length > 0) {
      if (cache.bridgeDecksCanvas) {
        ctx.drawImage(cache.bridgeDecksCanvas, 0, 0, innerWidth, innerHeight);
      }

      const half = cellSize / 2;
      const overhang = cellSize * 0.14;
      const deckW = cellSize + overhang * 2;

      for (const cell of cache.bridges) {
        const overTrails = pathThrough(curTrail, cell, 'over');
        const overHints = pathThrough(curHintPath, cell, 'over');
        const hasUnderEntity = underBridge?.cell === cell;
        if (overTrails.length === 0 && overHints.length === 0 && !hasUnderEntity) {
          continue;
        }
        ctx.save();
        ctx.beginPath();
        ctx.save();
        ctx.translate(
          offsetX + (cell.col + 0.5) * cellSize,
          offsetY + (cell.row + 0.5) * cellSize,
        );
        if (cell.bridge === 'vertical') ctx.rotate(Math.PI / 2);
        ctx.rect(-half - overhang, -half, deckW, cellSize);
        ctx.restore();
        ctx.clip();

        for (const part of overTrails) {
          const isLiveEnd =
            marble !== null &&
            part.length >= 2 &&
            part[part.length - 1] === curTrail[curTrail.length - 1];
          strokeTrail(part, isLiveEnd);
        }
        for (const part of overHints) {
          strokeHint(part);
        }
        if (hasUnderEntity && underBridge) {
          drawActiveEntity(true, underBridge.alpha);
        }
        ctx.restore();
      }

      if (cache.bridgeRailsCanvas) {
        ctx.drawImage(cache.bridgeRailsCanvas, 0, 0, innerWidth, innerHeight);
      }
    }

    if (!underBridge) {
      drawActiveEntity(false);
    }

    if (curFogOfWar) {
      if (!fogCacheRef.current) {
        fogCacheRef.current = new GridFogCache();
      }
      fogCacheRef.current.draw(ctx, {
        fogColor: curTheme.fogColor,
        lightTint: curTheme.lightTint,
        width: innerWidth,
        height: innerHeight,
        cellSize,
        offsetX,
        offsetY,
        activeX,
        activeY,
        explored: curExplored,
        boardToken: curMaze,
      });
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const syncSize = () => {
      const rect = container.getBoundingClientRect();
      const innerWidth = Math.max(220, Math.floor(rect.width - 16));
      const innerHeight = Math.max(160, Math.floor(rect.height - 16));
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_GAME_DPR);
      const targetW = Math.floor(innerWidth * dpr);
      const targetH = Math.floor(innerHeight * dpr);

      const prev = sizeRef.current;
      const changed =
        canvas.width !== targetW ||
        canvas.height !== targetH ||
        prev.width !== innerWidth ||
        prev.height !== innerHeight ||
        prev.dpr !== dpr;

      if (changed) {
        sizeRef.current = { width: innerWidth, height: innerHeight, dpr };
        if (canvas.width !== targetW) canvas.width = targetW;
        if (canvas.height !== targetH) canvas.height = targetH;
        canvas.style.width = `${innerWidth}px`;
        canvas.style.height = `${innerHeight}px`;
        drawRef.current();
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
    const draw = () => drawRef.current();
    registerDraw(draw);
    return () => registerDraw(null);
  }, [registerDraw]);

  useEffect(() => {
    drawRef.current();
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
      <canvas ref={canvasRef} className="block rounded-xl" />
    </div>
  );
}
