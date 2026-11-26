import { describe, expect, it } from 'vitest';
import { curvedPointFromGrid } from '../renderers/CurvedMaze';
import { generateMaze } from '../maze/grid';
import {
  generatePolarMaze,
  hasPolarPassage,
  polarCellId,
  type PolarMaze,
} from '../maze/polar';
import type { Maze } from '../maze/types';
import {
  createMarbleAt,
  createPolarMarbleAt,
  MARBLE_RADIUS,
  stepMarblePhysics,
  stepPolarMarblePhysics,
  type PolarMarbleBody,
  type PolarMarbleStepResult,
} from './marble';
import type { TiltVector } from './tilt';

function buildBridgeCrossMaze(): Maze {
  const maze = generateMaze(3, 3);
  for (const row of maze.grid) {
    for (const cell of row) {
      cell.walls = { top: true, right: true, bottom: true, left: true };
    }
  }
  const g = maze.grid;
  // Horizontal over bridge: (1,0) <-> (1,1,over) <-> (1,2)
  g[1][0].walls.right = false;
  g[1][1].walls.left = false;
  g[1][1].walls.right = false;
  g[1][2].walls.left = false;
  // Vertical under bridge: (0,1) <-> (1,1,under) <-> (2,1)
  g[0][1].walls.bottom = false;
  g[2][1].walls.top = false;
  g[1][1].bridge = 'horizontal';
  return maze;
}

describe('marble physics', () => {
  it('stops at closed walls and reports bump intensity', () => {
    const maze = buildBridgeCrossMaze();
    let body = createMarbleAt({ row: 1, col: 0 });
    let bumped = false;

    // Tilt upward into a closed top wall
    for (let i = 0; i < 40; i++) {
      const res = stepMarblePhysics(maze, body, { gx: 0, gy: -1 }, 0.016);
      body = res.body;
      if (res.bumpIntensity > 0) bumped = true;
    }

    expect(body.row).toBe(1);
    expect(body.col).toBe(0);
    expect(body.y).toBeGreaterThanOrEqual(1 + MARBLE_RADIUS - 1e-6);
    expect(bumped).toBe(true);
  });

  it('rolls smoothly over a bridge and cannot turn off the deck', () => {
    const maze = buildBridgeCrossMaze();
    let body = createMarbleAt({ row: 1, col: 0 });
    const entered: Array<{ dx: number; dy: number }> = [];

    for (let i = 0; i < 90; i++) {
      const res = stepMarblePhysics(maze, body, { gx: 1, gy: 0.4 }, 0.016);
      body = res.body;
      entered.push(...res.enteredCells);
    }

    expect(entered).toEqual([
      { dx: 1, dy: 0 },
      { dx: 1, dy: 0 },
    ]);
    expect(body.row).toBe(1);
    expect(body.col).toBe(2);
    expect(body.level).toBeUndefined();
  });

  it('rolls smoothly under a bridge and enters level under', () => {
    const maze = buildBridgeCrossMaze();
    let body = createMarbleAt({ row: 0, col: 1 });
    let sawUnder = false;
    const entered: Array<{ dx: number; dy: number }> = [];

    for (let i = 0; i < 90; i++) {
      const res = stepMarblePhysics(maze, body, { gx: 0.35, gy: 1 }, 0.016);
      body = res.body;
      if (body.row === 1 && body.col === 1 && body.level === 'under') {
        sawUnder = true;
      }
      entered.push(...res.enteredCells);
    }

    expect(sawUnder).toBe(true);
    expect(entered).toEqual([
      { dx: 0, dy: 1 },
      { dx: 0, dy: 1 },
    ]);
    expect(body.row).toBe(2);
    expect(body.col).toBe(1);
  });

  it('maps curved SVG marble coordinates continuously across cell boundaries', () => {
    const rows = 5;
    const cols = 5;
    const step = 0.01;

    // Sweep horizontally across all cell boundaries and outer margins
    let prev = curvedPointFromGrid(0.25, 1.5, rows, cols);
    for (let x = 0.25 + step; x <= cols - 0.25; x += step) {
      const cur = curvedPointFromGrid(x, 1.5, rows, cols);
      expect(Math.hypot(cur.x - prev.x, cur.y - prev.y)).toBeLessThan(1);
      prev = cur;
    }

    // Sweep vertically across all cell boundaries and outer margins
    prev = curvedPointFromGrid(2.5, 0.25, rows, cols);
    for (let y = 0.25 + step; y <= rows - 0.25; y += step) {
      const cur = curvedPointFromGrid(2.5, y, rows, cols);
      expect(Math.hypot(cur.x - prev.x, cur.y - prev.y)).toBeLessThan(1);
      prev = cur;
    }
  });

  it('rolls smoothly through open polar passages and stops at closed polar arcs', () => {
    const maze = generatePolarMaze(4);
    const centerId = maze.endId;
    const centerCell = maze.cells.get(centerId)!;
    const openNeighborId = centerCell.neighbors.find((n) =>
      hasPolarPassage(maze, centerId, n),
    )!;
    const closedNeighborId = centerCell.neighbors.find(
      (n) => !hasPolarPassage(maze, centerId, n),
    )!;
    const openNeighbor = maze.cells.get(openNeighborId)!;
    const closedNeighbor = maze.cells.get(closedNeighborId)!;

    // 1. Tilt toward a closed arc wall from center -> stays in ring 0 and bumps
    let body = createPolarMarbleAt(maze, centerId);
    const cLen = Math.hypot(closedNeighbor.x, closedNeighbor.y);
    let bumped = false;
    for (let i = 0; i < 45; i++) {
      const res = stepPolarMarblePhysics(
        maze,
        body,
        { gx: closedNeighbor.x / cLen, gy: closedNeighbor.y / cLen },
        0.016,
      );
      body = res.body;
      if (res.bumpIntensity > 0) bumped = true;
    }
    expect(body.cellId).toBe(centerId);
    expect(Math.hypot(body.x, body.y)).toBeLessThanOrEqual(
      1 - MARBLE_RADIUS + 0.02,
    );
    expect(bumped).toBe(true);

    // 2. Tilt toward the open neighbor -> rolls continuously into ring 1 and spins
    body = createPolarMarbleAt(maze, centerId);
    const oLen = Math.hypot(openNeighbor.x, openNeighbor.y);
    const entered: Array<{ dx: number; dy: number }> = [];
    for (let i = 0; i < 60; i++) {
      const res = stepPolarMarblePhysics(
        maze,
        body,
        { gx: openNeighbor.x / oLen, gy: openNeighbor.y / oLen },
        0.016,
      );
      body = res.body;
      entered.push(...res.enteredCells);
    }
    expect(entered.length).toBeGreaterThanOrEqual(1);
    expect(body.cellId).not.toBe(centerId);
    // Verify 3D orientation basis actually rotated while rolling (check both u and v)
    const uDelta = Math.hypot(body.u[0] - 1, body.u[1], body.u[2]);
    const vDelta = Math.hypot(body.v[0], body.v[1] - 1, body.v[2]);
    expect(Math.max(uDelta, vDelta)).toBeGreaterThan(0.1);
  });

  it('matches full-ring polar collision scan across inner arcs, radial walls, outer rim, and seam', () => {
    const TWO_PI = Math.PI * 2;
    const ACCEL = 18.5;
    const FRICTION = 3.4;
    const MAX_SPEED = 7;
    const BOUNCE = 0.28;
    const SUBSTEPS = 3;

    const wrapAngle = (a: number) => {
      let r = (a + Math.PI) % TWO_PI;
      if (r < 0) r += TWO_PI;
      return r - Math.PI;
    };

    const polarCellAtRef = (maze: PolarMaze, x: number, y: number): string => {
      const dist = Math.hypot(x, y);
      const ring = Math.min(maze.rings - 1, Math.floor(dist));
      if (ring <= 0) return polarCellId(0, 0);
      const count = maze.ringCounts[ring];
      const rel = (((Math.atan2(y, x) + Math.PI / 2) % TWO_PI) + TWO_PI) % TWO_PI;
      const sector = Math.min(count - 1, Math.floor((rel / TWO_PI) * count));
      return polarCellId(ring, sector);
    };

    const referenceStepPolar = (
      maze: PolarMaze,
      prev: PolarMarbleBody,
      tilt: TiltVector,
      dtSec: number,
    ): PolarMarbleStepResult => {
      const clampedDt = Math.min(0.05, Math.max(0, dtSec));
      const subDt = clampedDt / SUBSTEPS;
      let { x, y, vx, vy, cellId } = prev;
      const enteredCells: Array<{ dx: number; dy: number }> = [];
      let maxBump = 0;

      const resolvePoint = (cx: number, cy: number) => {
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
            if (vn < -0.6) maxBump = Math.max(maxBump, Math.min(1, -vn / MAX_SPEED));
            vx -= (1 + BOUNCE) * vn * nx;
            vy -= (1 + BOUNCE) * vn * ny;
          }
        }
      };

      const collideArc = (radius: number, a0: number, a1: number) => {
        const mid = (a0 + a1) * 0.5;
        const halfSpan = (a1 - a0) * 0.5;
        const diff = wrapAngle(Math.atan2(y, x) - mid);
        const clampedAngle = mid + Math.max(-halfSpan, Math.min(halfSpan, diff));
        resolvePoint(Math.cos(clampedAngle) * radius, Math.sin(clampedAngle) * radius);
      };

      const collideSeg = (x1: number, y1: number, x2: number, y2: number) => {
        const sx = x2 - x1;
        const sy = y2 - y1;
        const lenSq = sx * sx + sy * sy;
        if (lenSq <= 0) return;
        const t = Math.max(0, Math.min(1, ((x - x1) * sx + (y - y1) * sy) / lenSq));
        resolvePoint(x1 + sx * t, y1 + sy * t);
      };

      for (let s = 0; s < SUBSTEPS; s++) {
        vx += tilt.gx * ACCEL * subDt;
        vy += tilt.gy * ACCEL * subDt;
        const damping = Math.exp(-FRICTION * subDt);
        vx *= damping;
        vy *= damping;
        const speed = Math.hypot(vx, vy);
        if (speed > MAX_SPEED) {
          const sc = MAX_SPEED / speed;
          vx *= sc;
          vy *= sc;
        }
        x += vx * subDt;
        y += vy * subDt;

        const distFromCenter = Math.hypot(x, y);
        const minRing = Math.max(1, Math.floor(distFromCenter) - 1);
        const maxRing = Math.min(maze.rings - 1, Math.floor(distFromCenter) + 1);
        for (let ring = minRing; ring <= maxRing; ring++) {
          const count = maze.ringCounts[ring];
          const innerCount = maze.ringCounts[ring - 1];
          const ratio = count / innerCount;
          for (let sector = 0; sector < count; sector++) {
            const cell = maze.cells.get(polarCellId(ring, sector));
            if (!cell) continue;
            const innerId = polarCellId(ring - 1, Math.floor(sector / ratio));
            if (!hasPolarPassage(maze, cell.id, innerId)) {
              collideArc(cell.rInner, cell.angleStart, cell.angleEnd);
            }
            const cwId = polarCellId(ring, (sector + 1) % count);
            if (!hasPolarPassage(maze, cell.id, cwId)) {
              const cosA = Math.cos(cell.angleEnd);
              const sinA = Math.sin(cell.angleEnd);
              collideSeg(
                cosA * cell.rInner,
                sinA * cell.rInner,
                cosA * cell.rOuter,
                sinA * cell.rOuter,
              );
            }
            if (ring === maze.rings - 1) {
              collideArc(cell.rOuter, cell.angleStart, cell.angleEnd);
            }
          }
        }

        const nextId = polarCellAtRef(maze, x, y);
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

      return {
        body: { ...prev, x, y, vx, vy, cellId },
        enteredCells,
        bumpIntensity: maxBump,
        speedNormalized: Math.min(1, Math.hypot(vx, vy) / (MAX_SPEED * 0.85)),
      };
    };

    const origRandom = Math.random;
    let seed = 1337;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    const maze = generatePolarMaze(10);
    Math.random = origRandom;

    // Test from outer-ring seam cell (sector 0), outer-ring last sector (seam neighbor), and center
    const outerRing = maze.rings - 1;
    const outerCount = maze.ringCounts[outerRing];
    const startCells = [
      polarCellId(outerRing, 0),
      polarCellId(outerRing, outerCount - 1),
      polarCellId(0, 0),
      polarCellId(5, 0),
    ];

    for (const startId of startCells) {
      let optBody = createPolarMarbleAt(maze, startId);
      let refBody = createPolarMarbleAt(maze, startId);

      for (let step = 0; step < 180; step++) {
        const angle = (step / 45) * Math.PI * 2 - Math.PI / 2;
        const tilt: TiltVector = {
          gx: Math.cos(angle),
          gy: Math.sin(angle),
        };
        const opt = stepPolarMarblePhysics(maze, optBody, tilt, 0.016);
        const ref = referenceStepPolar(maze, refBody, tilt, 0.016);

        expect(opt.body.x).toBeCloseTo(ref.body.x, 10);
        expect(opt.body.y).toBeCloseTo(ref.body.y, 10);
        expect(opt.body.vx).toBeCloseTo(ref.body.vx, 10);
        expect(opt.body.vy).toBeCloseTo(ref.body.vy, 10);
        expect(opt.body.cellId).toBe(ref.body.cellId);
        expect(opt.bumpIntensity).toBeCloseTo(ref.bumpIntensity, 10);
        expect(opt.speedNormalized).toBeCloseTo(ref.speedNormalized, 10);
        expect(opt.enteredCells).toEqual(ref.enteredCells);

        optBody = opt.body;
        refBody = ref.body;
      }
    }
  });
});
