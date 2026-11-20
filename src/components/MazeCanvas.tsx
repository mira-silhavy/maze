import { useEffect, useRef } from 'react';
import { positionKey } from '../maze/generator';
import type { MazeTheme } from '../maze/themes';
import type { AspectRatioId, GameMode, Maze, Position } from '../maze/types';

interface MazeCanvasProps {
  maze: Maze;
  player: Position;
  visited: Set<string>;
  trail: Position[];
  hintPath: Position[];
  aspectRatioId: AspectRatioId;
  gameMode: GameMode;
  targets: Position[];
  collected: Set<string>;
  theme: MazeTheme;
  fullScreen?: boolean;
}

const CONTAINER_MAX_WIDTH: Record<AspectRatioId, string> = {
  square: 'max-w-[600px]',
  tablet: 'max-w-[820px]',
  widescreen: 'max-w-[1060px]',
};

export function MazeCanvas({
  maze,
  player,
  visited,
  trail,
  hintPath,
  aspectRatioId,
  gameMode,
  targets,
  collected,
  theme,
  fullScreen = false,
}: MazeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const draw = () => {
      const rect = container.getBoundingClientRect();
      const innerWidth = Math.max(220, Math.floor(rect.width - 16));
      const innerHeight = Math.max(160, Math.floor(rect.height - 16));
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(innerWidth * dpr);
      canvas.height = Math.floor(innerHeight * dpr);
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;

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

      // Background
      ctx.fillStyle = theme.background;
      ctx.fillRect(0, 0, innerWidth, innerHeight);

      // Subtle visited cells tint
      ctx.fillStyle = theme.visitedFill;
      for (let r = 0; r < maze.rows; r++) {
        for (let c = 0; c < maze.cols; c++) {
          if (visited.has(positionKey({ row: r, col: c }))) {
            ctx.fillRect(
              offsetX + c * cellSize + 1,
              offsetY + r * cellSize + 1,
              cellSize - 2,
              cellSize - 2,
            );
          }
        }
      }

      // Continuous pencil line along player's path
      if (trail.length > 1) {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = theme.pencilLine;
        ctx.lineWidth = Math.max(2.5, cellSize * 0.22);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = theme.pencilGlow;
        ctx.shadowBlur = theme.isLight ? 3 : 6;
        ctx.globalAlpha = theme.isLight ? 0.85 : 0.78;

        trail.forEach((pos, idx) => {
          const x = offsetX + (pos.col + 0.5) * cellSize;
          const y = offsetY + (pos.row + 0.5) * cellSize;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.restore();
      }

      // Start cell highlight / cross in collect mode
      const startCenterX = offsetX + (maze.start.col + 0.5) * cellSize;
      const startCenterY = offsetY + (maze.start.row + 0.5) * cellSize;

      if (gameMode === 'collect') {
        ctx.fillStyle = theme.startHighlight;
        ctx.fillRect(
          offsetX + maze.start.col * cellSize + 1,
          offsetY + maze.start.row * cellSize + 1,
          cellSize - 2,
          cellSize - 2,
        );
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
      } else {
        ctx.fillStyle = theme.startHighlight;
        ctx.fillRect(
          offsetX + maze.start.col * cellSize + 1,
          offsetY + maze.start.row * cellSize + 1,
          cellSize - 2,
          cellSize - 2,
        );
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

        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = theme.goalFill;
        ctx.shadowColor = theme.goalFill;
        ctx.shadowBlur = theme.isLight ? 4 : Math.max(6, cellSize * 0.45);
        const goalSize = Math.max(5, cellSize * 0.44);
        ctx.roundRect(
          endCenterX - goalSize / 2,
          endCenterY - goalSize / 2,
          goalSize,
          goalSize,
          Math.max(2, cellSize * 0.12),
        );
        ctx.fill();
        ctx.restore();
      } else {
        for (const target of targets) {
          const key = positionKey(target);
          const isCollected = collected.has(key);
          const cx = offsetX + (target.col + 0.5) * cellSize;
          const cy = offsetY + (target.row + 0.5) * cellSize;
          const ringRadius = Math.max(3.5, cellSize * 0.28);

          ctx.save();
          if (isCollected) {
            ctx.beginPath();
            ctx.arc(cx, cy, ringRadius * 0.75, 0, Math.PI * 2);
            ctx.strokeStyle = theme.targetCollected;
            ctx.lineWidth = Math.max(1.5, cellSize * 0.08);
            ctx.stroke();
          } else {
            ctx.fillStyle = theme.targetFill;
            ctx.fillRect(
              offsetX + target.col * cellSize + 1,
              offsetY + target.row * cellSize + 1,
              cellSize - 2,
              cellSize - 2,
            );
            ctx.beginPath();
            ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = theme.targetStroke;
            ctx.shadowColor = theme.targetStroke;
            ctx.shadowBlur = theme.isLight ? 3 : Math.max(6, cellSize * 0.35);
            ctx.lineWidth = Math.max(2, cellSize * 0.12);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // Optional hint path
      if (hintPath.length > 1) {
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

        hintPath.forEach((pos, idx) => {
          const x = offsetX + (pos.col + 0.5) * cellSize;
          const y = offsetY + (pos.row + 0.5) * cellSize;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.restore();
      }

      // Maze walls
      ctx.strokeStyle = theme.wall;
      ctx.lineWidth = Math.max(1.5, Math.min(3.5, cellSize * 0.1));
      ctx.lineCap = 'round';
      ctx.beginPath();

      for (let r = 0; r < maze.rows; r++) {
        for (let c = 0; c < maze.cols; c++) {
          const cell = maze.grid[r][c];
          const x = offsetX + c * cellSize;
          const y = offsetY + r * cellSize;

          if (cell.walls.top) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + cellSize, y);
          }
          if (cell.walls.right) {
            ctx.moveTo(x + cellSize, y);
            ctx.lineTo(x + cellSize, y + cellSize);
          }
          if (cell.walls.bottom) {
            ctx.moveTo(x, y + cellSize);
            ctx.lineTo(x + cellSize, y + cellSize);
          }
          if (cell.walls.left) {
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + cellSize);
          }
        }
      }
      ctx.stroke();

      // Player
      const playerX = offsetX + (player.col + 0.5) * cellSize;
      const playerY = offsetY + (player.row + 0.5) * cellSize;
      const radius = Math.max(3.5, cellSize * 0.3);

      ctx.save();
      ctx.beginPath();
      ctx.arc(playerX, playerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = theme.playerFill;
      ctx.shadowColor = theme.playerFill;
      ctx.shadowBlur = theme.isLight ? 4 : Math.max(8, cellSize * 0.5);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(playerX, playerY, radius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = theme.playerCore;
      ctx.fill();
      ctx.restore();
    };

    draw();

    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [maze, player, visited, trail, hintPath, gameMode, targets, collected, theme]);

  return (
    <div
      ref={containerRef}
      style={fullScreen ? undefined : { aspectRatio: `${maze.cols} / ${maze.rows}` }}
      className={
        fullScreen
          ? `flex h-full w-full items-center justify-center rounded-2xl border p-2 shadow-2xl ${theme.containerClass}`
          : `flex max-h-[68vh] w-full ${CONTAINER_MAX_WIDTH[aspectRatioId]} items-center justify-center rounded-2xl border p-2 shadow-2xl ${theme.containerClass}`
      }
    >
      <canvas ref={canvasRef} className="block rounded-xl" />
    </div>
  );
}
