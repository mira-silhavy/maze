import { gridStep, positionKey } from './generator';
import type { Direction, Maze, Position } from './types';

const ALL_DIRECTIONS: readonly Direction[] = ['top', 'right', 'bottom', 'left'];

export function findShortestPath(
  maze: Maze,
  start: Position,
  end: Position,
): Position[] {
  return findShortestPathToNearest(maze, start, [end]);
}

export function findShortestPathToNearest(
  maze: Maze,
  start: Position,
  targets: Position[],
): Position[] {
  if (targets.length === 0) return [];
  const targetKeys = new Set(targets.map(positionKey));

  const queue: Position[] = [start];
  const visited = new Set<string>([positionKey(start)]);
  const parent = new Map<string, Position>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (targetKeys.has(positionKey(current))) {
      const path: Position[] = [];
      let cursor: Position | undefined = current;
      while (cursor) {
        path.push(cursor);
        cursor = parent.get(positionKey(cursor));
      }
      return path.reverse();
    }

    for (const dir of ALL_DIRECTIONS) {
      const next = gridStep(maze, current, dir);
      if (!next) {
        continue;
      }
      const key = positionKey(next);
      if (!visited.has(key)) {
        visited.add(key);
        parent.set(key, current);
        queue.push(next);
      }
    }
  }

  return [];
}

/**
 * Finds dead-end cells (only 1 open passage, excluding start) and selects up to
 * `maxCount` of them well distributed across the maze.
 */
export function selectDeadEndTargets(maze: Maze, maxCount: number): Position[] {
  const startKey = positionKey(maze.start);
  const deadEnds: Position[] = [];

  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols; c++) {
      const pos = { row: r, col: c };
      if (positionKey(pos) === startKey) continue;

      let openCount = 0;
      for (const dir of ALL_DIRECTIONS) {
        if (gridStep(maze, pos, dir)) openCount++;
      }
      if (openCount === 1) {
        deadEnds.push(pos);
      }
    }
  }

  if (deadEnds.length <= maxCount) {
    return deadEnds;
  }

  // Compute BFS distance from start to prefer deeper dead ends, then pick spread-out ones
  const distances = new Map<string, number>([[startKey, 0]]);
  const queue: Position[] = [maze.start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const dist = distances.get(positionKey(current))!;
    for (const dir of ALL_DIRECTIONS) {
      const next = gridStep(maze, current, dir);
      if (!next) continue;
      const key = positionKey(next);
      if (!distances.has(key)) {
        distances.set(key, dist + 1);
        queue.push(next);
      }
    }
  }

  // Sort dead ends by distance descending, then greedily pick spatially spread-out targets
  const sorted = [...deadEnds].sort(
    (a, b) =>
      (distances.get(positionKey(b)) ?? 0) -
      (distances.get(positionKey(a)) ?? 0),
  );

  const chosen: Position[] = [sorted[0]];
  const remaining = sorted.slice(1);

  while (chosen.length < maxCount && remaining.length > 0) {
    let bestIdx = 0;
    let bestMinDist = -1;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      let minDist = Infinity;
      for (const picked of chosen) {
        const d = Math.hypot(
          candidate.row - picked.row,
          candidate.col - picked.col,
        );
        if (d < minDist) minDist = d;
      }
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestIdx = i;
      }
    }

    chosen.push(remaining.splice(bestIdx, 1)[0]);
  }

  return chosen;
}
