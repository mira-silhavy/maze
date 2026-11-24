import { describe, expect, it } from 'vitest';
import { curvedPointFromGrid } from '../renderers/CurvedMaze';
import { generateMaze } from '../maze/grid';
import { generatePolarMaze, hasPolarPassage } from '../maze/polar';
import type { Maze } from '../maze/types';
import {
  createMarbleAt,
  createPolarMarbleAt,
  MARBLE_RADIUS,
  stepMarblePhysics,
  stepPolarMarblePhysics,
} from './marble';

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
});
