import { describe, expect, it } from 'vitest';
import { generateMaze, gridStep, positionKey } from './generator';
import {
  findPolarShortestPath,
  generatePolarMaze,
  hasPolarPassage,
  selectPolarDeadEndTargets,
} from './polar';
import {
  findShortestPath,
  findShortestPathToNearest,
  selectDeadEndTargets,
} from './solver';
import {
  ASPECT_RATIO_PRESETS,
  DIFFICULTY_PRESETS,
  getMazeDimensions,
  type Direction,
} from './types';

describe('maze generator and solver', () => {
  it('generates a connected maze with symmetric walls', () => {
    const maze = generateMaze(15, 15);
    expect(maze.grid).toHaveLength(15);
    expect(maze.grid[0]).toHaveLength(15);

    for (let r = 0; r < maze.rows; r++) {
      for (let c = 0; c < maze.cols; c++) {
        const cell = maze.grid[r][c];
        if (r > 0) {
          expect(cell.walls.top).toBe(maze.grid[r - 1][c].walls.bottom);
        }
        if (c > 0) {
          expect(cell.walls.left).toBe(maze.grid[r][c - 1].walls.right);
        }
      }
    }

    const visited = new Set<string>([positionKey(maze.start)]);
    const queue = [maze.start];
    const dirs: Direction[] = ['top', 'right', 'bottom', 'left'];

    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const dir of dirs) {
        const next = gridStep(maze, cur, dir);
        if (next) {
          const key = positionKey(next);
          if (!visited.has(key)) {
            visited.add(key);
            queue.push(next);
          }
        }
      }
    }

    expect(visited.size).toBe(15 * 15);
  });

  it('finds a valid shortest path from start to end without crossing walls', () => {
    const maze = generateMaze(19, 19);
    const path = findShortestPath(maze, maze.start, maze.end);

    expect(path.length).toBeGreaterThan(1);
    expect(path[0]).toEqual(maze.start);
    expect(path[path.length - 1]).toEqual(maze.end);

    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const dRow = b.row - a.row;
      const dCol = b.col - a.col;
      expect(Math.abs(dRow) + Math.abs(dCol)).toBe(1);

      let dir: Direction;
      if (dRow === -1) dir = 'top';
      else if (dRow === 1) dir = 'bottom';
      else if (dCol === 1) dir = 'right';
      else dir = 'left';

      expect(gridStep(maze, a, dir)).toEqual(b);
    }
  });

  it('computes rectangular dimensions and generates solvable mazes for tablet and widescreen ratios', () => {
    const medium = DIFFICULTY_PRESETS[1];

    for (const aspect of ASPECT_RATIO_PRESETS) {
      const { rows, cols } = getMazeDimensions(medium, aspect);
      if (aspect.id === 'square') {
        expect(cols).toBe(rows);
      } else {
        expect(cols).toBeGreaterThan(rows);
      }

      const maze = generateMaze(rows, cols);
      const path = findShortestPath(maze, maze.start, maze.end);
      expect(path[0]).toEqual(maze.start);
      expect(path[path.length - 1]).toEqual(maze.end);
    }
  });

  it('selects genuine dead-end cells for collect mode and solves to nearest target', () => {
    const maze = generateMaze(19, 19);
    const targets = selectDeadEndTargets(maze, 7);
    const dirs: Direction[] = ['top', 'right', 'bottom', 'left'];

    expect(targets.length).toBeGreaterThan(0);
    expect(targets.length).toBeLessThanOrEqual(7);

    for (const target of targets) {
      expect(target).not.toEqual(maze.start);
      const openPassages = dirs.filter((d) => gridStep(maze, target, d)).length;
      expect(openPassages).toBe(1);
    }

    const hintPath = findShortestPathToNearest(maze, maze.start, targets);
    expect(hintPath.length).toBeGreaterThan(1);
    expect(hintPath[0]).toEqual(maze.start);
    expect(targets.map(positionKey)).toContain(
      positionKey(hintPath[hintPath.length - 1]),
    );
  });

  it('generates a connected circular polar maze with valid dead ends and shortest path', () => {
    const polar = generatePolarMaze(7);
    const path = findPolarShortestPath(polar, polar.startId, [polar.endId]);

    expect(path.length).toBeGreaterThan(1);
    expect(path[0]).toBe(polar.startId);
    expect(path[path.length - 1]).toBe(polar.endId);

    for (let i = 0; i < path.length - 1; i++) {
      expect(hasPolarPassage(polar, path[i], path[i + 1])).toBe(true);
    }

    const deadEnds = selectPolarDeadEndTargets(polar, 7);
    expect(deadEnds.length).toBeGreaterThan(0);
    for (const id of deadEnds) {
      expect(id).not.toBe(polar.startId);
      const cell = polar.cells.get(id)!;
      const openCount = cell.neighbors.filter((n) =>
        hasPolarPassage(polar, id, n),
      ).length;
      expect(openCount).toBe(1);
    }
  });
});
