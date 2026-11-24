import { generateMaze, gridStep, positionKey } from '../maze/generator';
import {
  findPolarMoveInDirection,
  findPolarShortestPath,
  generatePolarMaze,
  selectPolarDeadEndTargets,
  type PolarMaze,
} from '../maze/polar';
import {
  findShortestPathToNearest,
  selectDeadEndTargets,
} from '../maze/solver';
import {
  getMazeDimensions,
  type AspectRatioPreset,
  type DifficultyPreset,
  type Direction,
  type Maze,
  type Position,
} from '../maze/types';
import type { Round, RoundOf, Vector } from './model';

export interface Geometry<M, N> {
  create(
    difficulty: DifficultyPreset,
    aspect: AspectRatioPreset,
    bridges: boolean,
  ): M;
  start(maze: M): N;
  end(maze: M): N;
  key(node: N): string;
  stepToward(maze: M, from: N, v: Vector): N | null;
  pathToNearest(maze: M, from: N, goals: N[]): N[];
  selectTargets(maze: M, max: number): N[];
}

export const gridGeometry: Geometry<Maze, Position> = {
  create: (difficulty, aspect, bridges) => {
    const { rows, cols } = getMazeDimensions(difficulty, aspect);
    return generateMaze(rows, cols, { bridges });
  },
  start: (maze) => maze.start,
  end: (maze) => maze.end,
  key: positionKey,
  stepToward: (maze, from, { dx, dy }) => {
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    const primary: Direction =
      ax >= ay ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'bottom' : 'top';

    let secondary: Direction | undefined;
    if (ax >= ay && ay >= ax * 0.35) {
      secondary = dy > 0 ? 'bottom' : 'top';
    } else if (ay > ax && ax >= ay * 0.35) {
      secondary = dx > 0 ? 'right' : 'left';
    }

    return (
      gridStep(maze, from, primary) ??
      (secondary ? gridStep(maze, from, secondary) : null)
    );
  },
  pathToNearest: findShortestPathToNearest,
  selectTargets: selectDeadEndTargets,
};

export const polarGeometry: Geometry<PolarMaze, string> = {
  create: (difficulty) => generatePolarMaze(difficulty.polarRings),
  start: (maze) => maze.startId,
  end: (maze) => maze.endId,
  key: (id) => id,
  stepToward: (maze, from, { dx, dy }) => {
    const len = Math.hypot(dx, dy);
    return findPolarMoveInDirection(maze, from, dx / len, dy / len);
  },
  pathToNearest: findPolarShortestPath,
  selectTargets: selectPolarDeadEndTargets,
};

export function withGeometry<R>(
  round: Round,
  f: <M, N>(geo: Geometry<M, N>, round: RoundOf<M, N>) => R,
): R {
  return round.kind === 'grid'
    ? f(gridGeometry, round)
    : f(polarGeometry, round);
}

export function updateRound<X>(
  round: Round,
  f: <M, N>(
    geo: Geometry<M, N>,
    round: RoundOf<M, N>,
  ) => { next: RoundOf<M, N>; out: X },
): { round: Round; out: X } {
  if (round.kind === 'grid') {
    const { next, out } = f(gridGeometry, round);
    return { round: next === round ? round : { kind: 'grid', ...next }, out };
  }
  const { next, out } = f(polarGeometry, round);
  return { round: next === round ? round : { kind: 'polar', ...next }, out };
}
