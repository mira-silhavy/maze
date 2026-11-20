import type { Cell, Direction, Maze, Position } from './types';

const DIRECTIONS: ReadonlyArray<{
  dir: Direction;
  opposite: Direction;
  dRow: number;
  dCol: number;
}> = [
  { dir: 'top', opposite: 'bottom', dRow: -1, dCol: 0 },
  { dir: 'right', opposite: 'left', dRow: 0, dCol: 1 },
  { dir: 'bottom', opposite: 'top', dRow: 1, dCol: 0 },
  { dir: 'left', opposite: 'right', dRow: 0, dCol: -1 },
];

export function generateMaze(rows: number, cols: number): Maze {
  const grid: Cell[][] = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      row,
      col,
      walls: { top: true, right: true, bottom: true, left: true },
    })),
  );

  const visited: boolean[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false),
  );

  const stack: Position[] = [{ row: 0, col: 0 }];
  visited[0][0] = true;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const unvisitedNeighbors: Array<{
      row: number;
      col: number;
      dir: Direction;
      opposite: Direction;
    }> = [];

    for (const { dir, opposite, dRow, dCol } of DIRECTIONS) {
      const nextRow = current.row + dRow;
      const nextCol = current.col + dCol;
      if (
        nextRow >= 0 &&
        nextRow < rows &&
        nextCol >= 0 &&
        nextCol < cols &&
        !visited[nextRow][nextCol]
      ) {
        unvisitedNeighbors.push({ row: nextRow, col: nextCol, dir, opposite });
      }
    }

    if (unvisitedNeighbors.length === 0) {
      stack.pop();
      continue;
    }

    const chosen =
      unvisitedNeighbors[Math.floor(Math.random() * unvisitedNeighbors.length)];

    grid[current.row][current.col].walls[chosen.dir] = false;
    grid[chosen.row][chosen.col].walls[chosen.opposite] = false;

    visited[chosen.row][chosen.col] = true;
    stack.push({ row: chosen.row, col: chosen.col });
  }

  return {
    rows,
    cols,
    grid,
    start: { row: 0, col: 0 },
    end: { row: rows - 1, col: cols - 1 },
  };
}

export function canMove(maze: Maze, from: Position, dir: Direction): boolean {
  const cell = maze.grid[from.row]?.[from.col];
  if (!cell || cell.walls[dir]) {
    return false;
  }

  const next = movePosition(from, dir);
  return (
    next.row >= 0 &&
    next.row < maze.rows &&
    next.col >= 0 &&
    next.col < maze.cols
  );
}

export function movePosition(pos: Position, dir: Direction): Position {
  switch (dir) {
    case 'top':
      return { row: pos.row - 1, col: pos.col };
    case 'right':
      return { row: pos.row, col: pos.col + 1 };
    case 'bottom':
      return { row: pos.row + 1, col: pos.col };
    case 'left':
      return { row: pos.row, col: pos.col - 1 };
  }
}

export function positionKey(pos: Position): string {
  return `${pos.row},${pos.col}`;
}
