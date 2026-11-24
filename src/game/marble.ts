import { gridStep } from '../maze/generator';
import type { Direction, Level, Maze, Position } from '../maze/types';
import type { TiltVector } from './tilt';

export interface MarbleBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  row: number;
  col: number;
  level?: Level;
}

export interface MarbleStepResult {
  body: MarbleBody;
  enteredCells: Array<{ dx: number; dy: number }>;
  bumpIntensity: number;
  speedNormalized: number;
}

export const MARBLE_RADIUS = 0.27;
const ACCEL = 16.5;
const FRICTION = 3.4;
const MAX_SPEED = 6.5;
const BOUNCE = 0.28;
const SUBSTEPS = 3;

export function createMarbleAt(pos: Position): MarbleBody {
  return {
    x: pos.col + 0.5,
    y: pos.row + 0.5,
    vx: 0,
    vy: 0,
    row: pos.row,
    col: pos.col,
    level: pos.level,
  };
}

export function stepMarblePhysics(
  maze: Maze,
  prev: MarbleBody,
  tilt: TiltVector,
  dtSec: number,
): MarbleStepResult {
  const clampedDt = Math.min(0.05, Math.max(0, dtSec));
  const subDt = clampedDt / SUBSTEPS;

  let { x, y, vx, vy, row, col, level } = prev;
  const enteredCells: Array<{ dx: number; dy: number }> = [];
  let maxBump = 0;

  for (let s = 0; s < SUBSTEPS; s++) {
    vx += tilt.gx * ACCEL * subDt;
    vy += tilt.gy * ACCEL * subDt;

    const damping = Math.exp(-FRICTION * subDt);
    vx *= damping;
    vy *= damping;

    const speed = Math.hypot(vx, vy);
    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed;
      vx *= scale;
      vy *= scale;
    }

    x += vx * subDt;
    y += vy * subDt;

    const curPos: Position = level ? { row, col, level } : { row, col };
    const openTop = gridStep(maze, curPos, 'top') !== null;
    const openBottom = gridStep(maze, curPos, 'bottom') !== null;
    const openLeft = gridStep(maze, curPos, 'left') !== null;
    const openRight = gridStep(maze, curPos, 'right') !== null;

    // Collide with blocked walls of current cell
    if (!openLeft && x < col + MARBLE_RADIUS) {
      x = col + MARBLE_RADIUS;
      if (vx < -0.6) maxBump = Math.max(maxBump, Math.min(1, -vx / MAX_SPEED));
      if (vx < 0) vx = -vx * BOUNCE;
    }
    if (!openRight && x > col + 1 - MARBLE_RADIUS) {
      x = col + 1 - MARBLE_RADIUS;
      if (vx > 0.6) maxBump = Math.max(maxBump, Math.min(1, vx / MAX_SPEED));
      if (vx > 0) vx = -vx * BOUNCE;
    }
    if (!openTop && y < row + MARBLE_RADIUS) {
      y = row + MARBLE_RADIUS;
      if (vy < -0.6) maxBump = Math.max(maxBump, Math.min(1, -vy / MAX_SPEED));
      if (vy < 0) vy = -vy * BOUNCE;
    }
    if (!openBottom && y > row + 1 - MARBLE_RADIUS) {
      y = row + 1 - MARBLE_RADIUS;
      if (vy > 0.6) maxBump = Math.max(maxBump, Math.min(1, vy / MAX_SPEED));
      if (vy > 0) vy = -vy * BOUNCE;
    }

    // Corner-post circle collisions so the marble glides smoothly around open turns without clipping wall ends
    const corners: Array<{ cx: number; cy: number }> = [
      { cx: col, cy: row },
      { cx: col + 1, cy: row },
      { cx: col, cy: row + 1 },
      { cx: col + 1, cy: row + 1 },
    ];
    for (const { cx, cy } of corners) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < MARBLE_RADIUS) {
        const nx = dx / dist;
        const ny = dy / dist;
        x = cx + nx * MARBLE_RADIUS;
        y = cy + ny * MARBLE_RADIUS;
        const vn = vx * nx + vy * ny;
        if (vn < 0) {
          vx -= (1 + BOUNCE * 0.5) * vn * nx;
          vy -= (1 + BOUNCE * 0.5) * vn * ny;
        }
      }
    }

    // Check cell transitions along open passages
    let dir: Direction | null = null;
    if (x < col && openLeft) dir = 'left';
    else if (x >= col + 1 && openRight) dir = 'right';
    else if (y < row && openTop) dir = 'top';
    else if (y >= row + 1 && openBottom) dir = 'bottom';

    if (dir) {
      const next = gridStep(maze, curPos, dir);
      if (next) {
        const dx = next.col - col;
        const dy = next.row - row;
        row = next.row;
        col = next.col;
        level = next.level;
        enteredCells.push({ dx, dy });
      }
    }
  }

  const finalSpeed = Math.hypot(vx, vy);
  return {
    body: { x, y, vx, vy, row, col, level },
    enteredCells,
    bumpIntensity: maxBump,
    speedNormalized: Math.min(1, finalSpeed / (MAX_SPEED * 0.85)),
  };
}
