import { describe, expect, it } from 'vitest';
import { generateMaze } from '../maze/generator';
import type { Maze } from '../maze/types';
import { createMarbleAt, MARBLE_RADIUS, stepMarblePhysics } from './marble';

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
});
