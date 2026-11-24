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
import { CORRIDOR_FLOOR_OPACITY, type MazeTheme } from '../themes/catalog';
import {
  drawThemedBridgeDeckCanvas,
  drawThemedBridgeRailsCanvas,
  strokeThemedWallsCanvas,
} from '../themes/scene';

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
  fogOfWar?: boolean;
  fullScreen?: boolean;
}

const CONTAINER_MAX_WIDTH: Record<AspectRatioId, string> = {
  square: 'max-w-[600px]',
  tablet: 'max-w-[820px]',
  widescreen: 'max-w-[1060px]',
};

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
  fogOfWar = false,
  fullScreen = false,
}: RectMazeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let innerWidth = 220;
    let innerHeight = 160;
    let dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      innerWidth = Math.max(220, Math.floor(rect.width - 16));
      innerHeight = Math.max(160, Math.floor(rect.height - 16));
      dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(innerWidth * dpr);
      canvas.height = Math.floor(innerHeight * dpr);
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
    };

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const padding = 10;
      const cellSize = Math.min(
        (innerWidth - padding * 2) / maze.cols,
        (innerHeight - padding * 2) / maze.rows,
      );
      const offsetX = (innerWidth - cellSize * maze.cols) / 2;
      const offsetY = (innerHeight - cellSize * maze.rows) / 2;

      const marble = marbleMode && marbleRef ? marbleRef.current : null;
      const activeRow = marble ? marble.row : player.row;
      const activeCol = marble ? marble.col : player.col;
      const activeLevel = marble ? marble.level : player.level;
      const activeX = marble
        ? offsetX + marble.x * cellSize
        : offsetX + (player.col + 0.5) * cellSize;
      const activeY = marble
        ? offsetY + marble.y * cellSize
        : offsetY + (player.row + 0.5) * cellSize;

      // Transparent board so continuous full-page backdrop shines through
      ctx.clearRect(0, 0, innerWidth, innerHeight);

      // Semi-transparent corridor floor
      ctx.save();
      ctx.globalAlpha = CORRIDOR_FLOOR_OPACITY;
      ctx.fillStyle = theme.corridorFloor;
      ctx.fillRect(offsetX, offsetY, cellSize * maze.cols, cellSize * maze.rows);
      ctx.restore();

      // Subtle visited cells tint
      ctx.fillStyle = theme.visitedFill;
      for (let r = 0; r < maze.rows; r++) {
        for (let c = 0; c < maze.cols; c++) {
          const isVisited = cellPositions(maze.grid[r][c]).some((pos) =>
            visited.has(positionKey(pos)),
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
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = theme.pencilLine;
        ctx.lineWidth = Math.max(2.5, cellSize * 0.22);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = theme.pencilGlow;
        ctx.shadowBlur = theme.isLight ? 3 : 6;
        ctx.globalAlpha = theme.isLight ? 0.85 : 0.78;

        coords.forEach((pt, idx) => {
          const x = offsetX + pt.x * cellSize;
          const y = offsetY + pt.y * cellSize;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
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
          if (relX > 0.02 && gridStep(maze, cur, 'right')) {
            return { x: marble.x, y: cy };
          }
          if (relX < -0.02 && gridStep(maze, cur, 'left')) {
            return { x: marble.x, y: cy };
          }
        } else {
          if (relY > 0.02 && gridStep(maze, cur, 'bottom')) {
            return { x: cx, y: marble.y };
          }
          if (relY < -0.02 && gridStep(maze, cur, 'top')) {
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
        ctx.strokeStyle = theme.hintStroke;
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
            theme,
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
          drawThemedPlayerCanvas(ctx, activeX, activeY, cellSize, theme, under);
        }
      };

      const underAlphaForDistance = (d: number): number => {
        const t = Math.max(0, Math.min(1, 1 - d / 0.72));
        const smooth = t * t * (3 - 2 * t);
        return 0.85 - smooth * 0.53;
      };

      let underBridge: { cell: Cell; alpha: number } | null = null;
      if (activeLevel === 'under') {
        const bridgeCell = maze.grid[activeRow]?.[activeCol];
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
          const neighbor = maze.grid[nr]?.[nc];
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

      const drawBridge = (cell: Cell) => {
        const half = cellSize / 2;
        const overhang = cellSize * 0.14;
        const deckW = cellSize + overhang * 2;
        const local = (paint: () => void) => {
          ctx.save();
          ctx.translate(
            offsetX + (cell.col + 0.5) * cellSize,
            offsetY + (cell.row + 0.5) * cellSize,
          );
          if (cell.bridge === 'vertical') ctx.rotate(Math.PI / 2);
          paint();
          ctx.restore();
        };
        const deck = () => ctx.rect(-half - overhang, -half, deckW, cellSize);

        // Tunnel mouth shadows into underpass + wooden plank deck
        local(() => {
          const tunnelDepth = cellSize * 0.32;
          const tunnelSpan = Math.max(2, cellSize - wallWidth);
          const gTop = ctx.createLinearGradient(0, -half - tunnelDepth, 0, -half);
          gTop.addColorStop(0, 'rgba(0, 0, 0, 0)');
          gTop.addColorStop(
            1,
            theme.isLight ? 'rgba(0, 0, 0, 0.30)' : 'rgba(0, 0, 0, 0.74)',
          );
          ctx.fillStyle = gTop;
          ctx.fillRect(-half + wallWidth * 0.5, -half - tunnelDepth, tunnelSpan, tunnelDepth);

          const gBot = ctx.createLinearGradient(0, half, 0, half + tunnelDepth);
          gBot.addColorStop(
            0,
            theme.isLight ? 'rgba(0, 0, 0, 0.34)' : 'rgba(0, 0, 0, 0.78)',
          );
          gBot.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = gBot;
          ctx.fillRect(-half + wallWidth * 0.5, half, tunnelSpan, tunnelDepth);

          drawThemedBridgeDeckCanvas(
            ctx,
            half,
            overhang,
            deckW,
            cellSize,
            wallWidth,
            theme,
          );
        });

        ctx.save();
        ctx.beginPath();
        local(deck);
        ctx.clip();
        for (const part of pathThrough(trail, cell, 'over')) {
          const isLiveEnd =
            marble !== null &&
            part.length >= 2 &&
            part[part.length - 1] === trail[trail.length - 1];
          strokeTrail(part, isLiveEnd);
        }
        for (const part of pathThrough(hintPath, cell, 'over')) {
          strokeHint(part);
        }
        if (underBridge && underBridge.cell === cell) {
          drawActiveEntity(true, underBridge.alpha);
        }
        ctx.restore();

        // Side beams and corner posts
        local(() => {
          drawThemedBridgeRailsCanvas(
            ctx,
            half,
            overhang,
            cellSize,
            wallWidth,
            theme,
          );
        });
      };

      // Continuous pencil line along player's path (projected cleanly to the live marble without overshooting)
      if (trail.length > 0) {
        strokeTrail(trail, true);
      }

      // Start cell highlight / cross in collect mode
      const startCenterX = offsetX + (maze.start.col + 0.5) * cellSize;
      const startCenterY = offsetY + (maze.start.row + 0.5) * cellSize;

      ctx.fillStyle = theme.startHighlight;
      ctx.fillRect(
        offsetX + maze.start.col * cellSize + 1,
        offsetY + maze.start.row * cellSize + 1,
        cellSize - 2,
        cellSize - 2,
      );

      if (gameMode === 'collect') {
        const crossArm = Math.max(4, cellSize * 0.24);
        ctx.save();
        ctx.strokeStyle = theme.startCross;
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
      if (gameMode === 'classic') {
        const endCenterX = offsetX + (maze.end.col + 0.5) * cellSize;
        const endCenterY = offsetY + (maze.end.row + 0.5) * cellSize;
        ctx.fillStyle = theme.goalHighlight;
        ctx.fillRect(
          offsetX + maze.end.col * cellSize + 1,
          offsetY + maze.end.row * cellSize + 1,
          cellSize - 2,
          cellSize - 2,
        );
        drawThemedGoalCanvas(ctx, endCenterX, endCenterY, cellSize, theme);
      } else {
        for (const target of targets) {
          const key = positionKey(target);
          const isCollected = collected.has(key);
          const cx = offsetX + (target.col + 0.5) * cellSize;
          const cy = offsetY + (target.row + 0.5) * cellSize;
          if (!isCollected) {
            ctx.fillStyle = theme.targetFill;
            ctx.fillRect(
              offsetX + target.col * cellSize + 1,
              offsetY + target.row * cellSize + 1,
              cellSize - 2,
              cellSize - 2,
            );
          }
          drawThemedTargetCanvas(ctx, cx, cy, cellSize, theme, isCollected);
        }
      }

      // Optional hint path
      if (hintPath.length > 1) {
        strokeHint(hintPath);
      }

      // Maze walls
      const wallSegments: Array<[number, number, number, number]> = [];
      for (let r = 0; r < maze.rows; r++) {
        for (let c = 0; c < maze.cols; c++) {
          const cell = maze.grid[r][c];
          if (cell.bridge) continue;
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
            (r === maze.rows - 1 || maze.grid[r + 1][c].bridge)
          ) {
            wallSegments.push([x, y + cellSize, x + cellSize, y + cellSize]);
          }
          if (
            cell.walls.right &&
            (c === maze.cols - 1 || maze.grid[r][c + 1].bridge)
          ) {
            wallSegments.push([x + cellSize, y, x + cellSize, y + cellSize]);
          }
        }
      }

      strokeThemedWallsCanvas(ctx, wallSegments, wallWidth, cellSize, theme);

      // Draw the portion of a marble outside the deck before bridges so it slides smoothly underneath
      if (underBridge && marble) {
        drawActiveEntity(false);
      }

      // Bridges (drawn after walls so beams and posts anchor cleanly over wall junctions)
      for (const row of maze.grid) {
        for (const cell of row) {
          if (cell.bridge) drawBridge(cell);
        }
      }

      if (!underBridge) {
        drawActiveEntity(false);
      }

      if (fogOfWar) {
        if (!fogCanvasRef.current) {
          fogCanvasRef.current = document.createElement('canvas');
        }
        const fogCanvas = fogCanvasRef.current;
        if (fogCanvas.width !== innerWidth || fogCanvas.height !== innerHeight) {
          fogCanvas.width = innerWidth;
          fogCanvas.height = innerHeight;
        }
        const fctx = fogCanvas.getContext('2d');
        if (fctx) {
          fctx.globalCompositeOperation = 'source-over';
          fctx.fillStyle = theme.fogColor;
          fctx.fillRect(0, 0, innerWidth, innerHeight);

          fctx.globalCompositeOperation = 'destination-out';

          // Dim memory cutouts for explored cells
          const memRadius = cellSize * 1.65;
          const seenCells = new Set<string>();
          for (const key of explored) {
            const parts = key.split(',');
            const r = Number(parts[0]);
            const c = Number(parts[1]);
            const cellKey = `${r},${c}`;
            if (seenCells.has(cellKey)) continue;
            seenCells.add(cellKey);
            const cx = offsetX + (c + 0.5) * cellSize;
            const cy = offsetY + (r + 0.5) * cellSize;
            const mg = fctx.createRadialGradient(
              cx,
              cy,
              cellSize * 0.2,
              cx,
              cy,
              memRadius,
            );
            mg.addColorStop(0, 'rgba(0, 0, 0, 0.56)');
            mg.addColorStop(1, 'rgba(0, 0, 0, 0)');
            fctx.fillStyle = mg;
            fctx.beginPath();
            fctx.arc(cx, cy, memRadius, 0, Math.PI * 2);
            fctx.fill();
          }

          // Live middle-range flashlight circle tracking the player / marble smoothly
          const lightRadius = cellSize * 2.8;
          const lg = fctx.createRadialGradient(
            activeX,
            activeY,
            lightRadius * 0.28,
            activeX,
            activeY,
            lightRadius,
          );
          lg.addColorStop(0, 'rgba(0, 0, 0, 1)');
          lg.addColorStop(0.64, 'rgba(0, 0, 0, 0.9)');
          lg.addColorStop(1, 'rgba(0, 0, 0, 0)');
          fctx.fillStyle = lg;
          fctx.beginPath();
          fctx.arc(activeX, activeY, lightRadius, 0, Math.PI * 2);
          fctx.fill();

          ctx.drawImage(fogCanvas, 0, 0, innerWidth, innerHeight);

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
          tint.addColorStop(0, theme.lightTint);
          tint.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = tint;
          ctx.beginPath();
          ctx.arc(activeX, activeY, lightRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    };

    resize();
    draw();

    const observer = new ResizeObserver(() => {
      resize();
      draw();
    });
    observer.observe(container);

    if (!marbleMode || !marbleRef) {
      return () => observer.disconnect();
    }

    let rafId = 0;
    const tick = () => {
      draw();
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
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
    marbleRef,
    fogOfWar,
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
