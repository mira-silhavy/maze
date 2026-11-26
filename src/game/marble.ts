import { gridStep } from '../maze/grid';
import { hasPolarPassage, polarCellId, type PolarMaze } from '../maze/polar';
import type { Direction, Level, Maze, Position } from '../maze/types';
import type { TiltVector } from './tilt';

export type Vec3 = [number, number, number];

export interface MarbleBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  row: number;
  col: number;
  level?: Level;
  /** Orthonormal 3D basis vectors tracking true rolling orientation on the sphere. */
  u: Vec3;
  v: Vec3;
  /** Brief damped squash pulse on wall impact (0..1). */
  squash: number;
  squashAxis: 'x' | 'y';
}

export interface MarbleStepResult {
  body: MarbleBody;
  enteredCells: Array<{ dx: number; dy: number }>;
  bumpIntensity: number;
  speedNormalized: number;
}

export const MARBLE_RADIUS = 0.27;
const MARBLE_RADIUS_SQ = MARBLE_RADIUS * MARBLE_RADIUS;
const ACCEL = 18.5;
const FRICTION = 3.4;
const MAX_SPEED = 7;
const BOUNCE = 0.28;
const SUBSTEPS = 3;

function rotateVec3(
  vec: Vec3,
  axisX: number,
  axisY: number,
  angle: number,
): Vec3 {
  // Rodrigues' rotation around unit axis (axisX, axisY, 0)
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const [vx, vy, vz] = vec;
  const dot = vx * axisX + vy * axisY;
  // axis × vec = (axisY * vz, -axisX * vz, axisX * vy - axisY * vx)
  const cx = axisY * vz;
  const cy = -axisX * vz;
  const cz = axisX * vy - axisY * vx;

  return [
    vx * cos + cx * sin + axisX * dot * (1 - cos),
    vy * cos + cy * sin + axisY * dot * (1 - cos),
    vz * cos + cz * sin,
  ];
}

function normalizeVec3(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

export function createMarbleAt(pos: Position): MarbleBody {
  return {
    x: pos.col + 0.5,
    y: pos.row + 0.5,
    vx: 0,
    vy: 0,
    row: pos.row,
    col: pos.col,
    level: pos.level,
    u: [1, 0, 0],
    v: [0, 1, 0],
    squash: 0,
    squashAxis: 'x',
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

  let { x, y, vx, vy, row, col, level, u, v, squash, squashAxis } = prev;
  const enteredCells: Array<{ dx: number; dy: number }> = [];
  let maxBump = 0;

  squash *= Math.exp(-16 * clampedDt);
  if (squash < 0.005) squash = 0;

  for (let s = 0; s < SUBSTEPS; s++) {
    const startX = x;
    const startY = y;

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
      if (vx < -0.6) {
        const hit = Math.min(1, -vx / MAX_SPEED);
        maxBump = Math.max(maxBump, hit);
        if (hit > squash) {
          squash = hit;
          squashAxis = 'x';
        }
      }
      if (vx < 0) vx = -vx * BOUNCE;
    }
    if (!openRight && x > col + 1 - MARBLE_RADIUS) {
      x = col + 1 - MARBLE_RADIUS;
      if (vx > 0.6) {
        const hit = Math.min(1, vx / MAX_SPEED);
        maxBump = Math.max(maxBump, hit);
        if (hit > squash) {
          squash = hit;
          squashAxis = 'x';
        }
      }
      if (vx > 0) vx = -vx * BOUNCE;
    }
    if (!openTop && y < row + MARBLE_RADIUS) {
      y = row + MARBLE_RADIUS;
      if (vy < -0.6) {
        const hit = Math.min(1, -vy / MAX_SPEED);
        maxBump = Math.max(maxBump, hit);
        if (hit > squash) {
          squash = hit;
          squashAxis = 'y';
        }
      }
      if (vy < 0) vy = -vy * BOUNCE;
    }
    if (!openBottom && y > row + 1 - MARBLE_RADIUS) {
      y = row + 1 - MARBLE_RADIUS;
      if (vy > 0.6) {
        const hit = Math.min(1, vy / MAX_SPEED);
        maxBump = Math.max(maxBump, hit);
        if (hit > squash) {
          squash = hit;
          squashAxis = 'y';
        }
      }
      if (vy > 0) vy = -vy * BOUNCE;
    }

    // Corner-post circle collisions so the marble glides smoothly around open turns without clipping wall ends
    const resolveCorner = (cx: number, cy: number) => {
      const dx = x - cx;
      const dy = y - cy;
      const distSq = dx * dx + dy * dy;
      if (distSq > 0 && distSq < MARBLE_RADIUS_SQ) {
        const dist = Math.sqrt(distSq);
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
    };
    resolveCorner(col, row);
    resolveCorner(col + 1, row);
    resolveCorner(col, row + 1);
    resolveCorner(col + 1, row + 1);

    // Roll the 3D sphere basis based on actual distance traveled
    const stepDx = x - startX;
    const stepDy = y - startY;
    const stepDist = Math.hypot(stepDx, stepDy);
    if (stepDist > 1e-5) {
      // Rolling along (stepDx, stepDy) rotates around perpendicular axis (-stepDy, stepDx, 0)
      const axisX = -stepDy / stepDist;
      const axisY = stepDx / stepDist;
      const angle = stepDist / MARBLE_RADIUS;
      u = normalizeVec3(rotateVec3(u, axisX, axisY, angle));
      v = normalizeVec3(rotateVec3(v, axisX, axisY, angle));
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
    body: { x, y, vx, vy, row, col, level, u, v, squash, squashAxis },
    enteredCells,
    bumpIntensity: maxBump,
    speedNormalized: Math.min(1, finalSpeed / (MAX_SPEED * 0.85)),
  };
}

export interface PolarMarbleBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  cellId: string;
  u: Vec3;
  v: Vec3;
}

export interface PolarMarbleStepResult {
  body: PolarMarbleBody;
  enteredCells: Array<{ dx: number; dy: number }>;
  bumpIntensity: number;
  speedNormalized: number;
}

const TWO_PI = Math.PI * 2;

function wrapAngle(a: number): number {
  let r = (a + Math.PI) % TWO_PI;
  if (r < 0) r += TWO_PI;
  return r - Math.PI;
}

function polarCellAt(maze: PolarMaze, x: number, y: number): string {
  const dist = Math.hypot(x, y);
  const ring = Math.min(maze.rings - 1, Math.floor(dist));
  if (ring <= 0) return polarCellId(0, 0);
  const count = maze.ringCounts[ring];
  const rel = (((Math.atan2(y, x) + Math.PI / 2) % TWO_PI) + TWO_PI) % TWO_PI;
  const sector = Math.min(count - 1, Math.floor((rel / TWO_PI) * count));
  return polarCellId(ring, sector);
}

export function createPolarMarbleAt(
  maze: PolarMaze,
  cellId: string,
): PolarMarbleBody {
  const cell = maze.cells.get(cellId);
  return {
    x: cell?.x ?? 0,
    y: cell?.y ?? 0,
    vx: 0,
    vy: 0,
    cellId,
    u: [1, 0, 0],
    v: [0, 1, 0],
  };
}

export function stepPolarMarblePhysics(
  maze: PolarMaze,
  prev: PolarMarbleBody,
  tilt: TiltVector,
  dtSec: number,
): PolarMarbleStepResult {
  const clampedDt = Math.min(0.05, Math.max(0, dtSec));
  const subDt = clampedDt / SUBSTEPS;

  let { x, y, vx, vy, cellId, u, v } = prev;
  const enteredCells: Array<{ dx: number; dy: number }> = [];
  let maxBump = 0;

  const resolvePointCollision = (cx: number, cy: number) => {
    const dx = x - cx;
    const dy = y - cy;
    const distSq = dx * dx + dy * dy;
    if (distSq > 0 && distSq < MARBLE_RADIUS_SQ) {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;
      x = cx + nx * MARBLE_RADIUS;
      y = cy + ny * MARBLE_RADIUS;
      const vn = vx * nx + vy * ny;
      if (vn < 0) {
        if (vn < -0.6) {
          maxBump = Math.max(maxBump, Math.min(1, -vn / MAX_SPEED));
        }
        vx -= (1 + BOUNCE) * vn * nx;
        vy -= (1 + BOUNCE) * vn * ny;
      }
    }
  };

  const collideArc = (radius: number, angleStart: number, angleEnd: number) => {
    const mid = (angleStart + angleEnd) * 0.5;
    const halfSpan = (angleEnd - angleStart) * 0.5;
    const theta = Math.atan2(y, x);
    const diff = wrapAngle(theta - mid);
    const clampedAngle = mid + Math.max(-halfSpan, Math.min(halfSpan, diff));
    resolvePointCollision(
      Math.cos(clampedAngle) * radius,
      Math.sin(clampedAngle) * radius,
    );
  };

  const collideSegment = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) => {
    const sx = x2 - x1;
    const sy = y2 - y1;
    const lenSq = sx * sx + sy * sy;
    if (lenSq <= 0) return;
    const t = Math.max(0, Math.min(1, ((x - x1) * sx + (y - y1) * sy) / lenSq));
    resolvePointCollision(x1 + sx * t, y1 + sy * t);
  };

  for (let s = 0; s < SUBSTEPS; s++) {
    const startX = x;
    const startY = y;

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

    const distFromCenter = Math.hypot(x, y);
    const minRing = Math.max(1, Math.floor(distFromCenter) - 1);
    const maxRing = Math.min(maze.rings - 1, Math.floor(distFromCenter) + 1);
    const relAngle =
      (((Math.atan2(y, x) + Math.PI / 2) % TWO_PI) + TWO_PI) % TWO_PI;
    const safeReach = MARBLE_RADIUS * 2.5;
    const angMargin =
      distFromCenter > safeReach
        ? Math.asin(safeReach / distFromCenter)
        : Math.PI;

    for (let ring = minRing; ring <= maxRing; ring++) {
      const count = maze.ringCounts[ring];
      const innerCount = maze.ringCounts[ring - 1];
      const ratio = count / innerCount;

      const collideSector = (sector: number) => {
        const cell = maze.cells.get(polarCellId(ring, sector));
        if (!cell) return;

        // Inner circular arc wall
        const innerId = polarCellId(ring - 1, Math.floor(sector / ratio));
        if (!hasPolarPassage(maze, cell.id, innerId)) {
          collideArc(cell.rInner, cell.angleStart, cell.angleEnd);
        }

        // Clockwise radial wall
        const cwId = polarCellId(ring, (sector + 1) % count);
        if (!hasPolarPassage(maze, cell.id, cwId)) {
          const cosA = Math.cos(cell.angleEnd);
          const sinA = Math.sin(cell.angleEnd);
          collideSegment(
            cosA * cell.rInner,
            sinA * cell.rInner,
            cosA * cell.rOuter,
            sinA * cell.rOuter,
          );
        }

        // Outer rim boundary
        if (ring === maze.rings - 1) {
          collideArc(cell.rOuter, cell.angleStart, cell.angleEnd);
        }
      };

      const halfSectors = Math.ceil((angMargin / TWO_PI) * count) + 1;
      if (halfSectors * 2 + 1 >= count) {
        for (let sector = 0; sector < count; sector++) {
          collideSector(sector);
        }
      } else {
        const centerSector = Math.min(
          count - 1,
          Math.floor((relAngle / TWO_PI) * count),
        );
        const lo = centerSector - halfSectors;
        const hi = centerSector + halfSectors;
        if (lo < 0) {
          for (let sector = 0; sector <= hi; sector++) collideSector(sector);
          for (let sector = lo + count; sector < count; sector++) {
            collideSector(sector);
          }
        } else if (hi >= count) {
          for (let sector = 0; sector <= hi - count; sector++) {
            collideSector(sector);
          }
          for (let sector = lo; sector < count; sector++) collideSector(sector);
        } else {
          for (let sector = lo; sector <= hi; sector++) collideSector(sector);
        }
      }
    }

    // Roll the 3D sphere basis based on actual distance traveled
    const stepDx = x - startX;
    const stepDy = y - startY;
    const stepDist = Math.hypot(stepDx, stepDy);
    if (stepDist > 1e-5) {
      const axisX = -stepDy / stepDist;
      const axisY = stepDx / stepDist;
      const angle = stepDist / MARBLE_RADIUS;
      u = normalizeVec3(rotateVec3(u, axisX, axisY, angle));
      v = normalizeVec3(rotateVec3(v, axisX, axisY, angle));
    }

    // Track cell transitions along valid open passages
    const nextId = polarCellAt(maze, x, y);
    if (nextId !== cellId && hasPolarPassage(maze, cellId, nextId)) {
      const prevCell = maze.cells.get(cellId);
      const nextCell = maze.cells.get(nextId);
      if (prevCell && nextCell) {
        enteredCells.push({
          dx: nextCell.x - prevCell.x,
          dy: nextCell.y - prevCell.y,
        });
        cellId = nextId;
      }
    }
  }

  const finalSpeed = Math.hypot(vx, vy);
  return {
    body: { x, y, vx, vy, cellId, u, v },
    enteredCells,
    bumpIntensity: maxBump,
    speedNormalized: Math.min(1, finalSpeed / (MAX_SPEED * 0.85)),
  };
}
