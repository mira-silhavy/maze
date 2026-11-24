import type { Axis, Cell, Direction, Level, Maze, Position } from './types';

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

const TUNNEL_CHANCE = 0.2;

export function axisOf(dir: Direction): Axis {
  return dir === 'left' || dir === 'right' ? 'horizontal' : 'vertical';
}

export function crossAxis(axis: Axis): Axis {
  return axis === 'horizontal' ? 'vertical' : 'horizontal';
}

export function generateMaze(
  rows: number,
  cols: number,
  { bridges = false }: { bridges?: boolean } = {},
): Maze {
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
      under?: Cell;
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

    if (bridges && !grid[current.row][current.col].bridge) {
      for (const { dir, opposite, dRow, dCol } of DIRECTIONS) {
        const over = grid[current.row + dRow]?.[current.col + dCol];
        const farRow = current.row + 2 * dRow;
        const farCol = current.col + 2 * dCol;
        if (
          over &&
          isBridgeable(grid, over, axisOf(dir)) &&
          farRow >= 0 &&
          farRow < rows &&
          farCol >= 0 &&
          farCol < cols &&
          !visited[farRow][farCol] &&
          Math.random() < TUNNEL_CHANCE
        ) {
          unvisitedNeighbors.push({
            row: farRow,
            col: farCol,
            dir,
            opposite,
            under: over,
          });
        }
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
    if (chosen.under) {
      chosen.under.bridge = crossAxis(axisOf(chosen.dir));
    }

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

function isBridgeable(grid: Cell[][], cell: Cell, underAxis: Axis): boolean {
  const { top, right, bottom, left } = cell.walls;
  const straight =
    underAxis === 'vertical'
      ? top && bottom && !left && !right
      : left && right && !top && !bottom;
  const rows = grid.length;
  const cols = grid[0].length;
  const isStart = cell.row === 0 && cell.col === 0;
  const isEnd = cell.row === rows - 1 && cell.col === cols - 1;
  const nextToBridge = DIRECTIONS.some(
    ({ dRow, dCol }) => grid[cell.row + dRow]?.[cell.col + dCol]?.bridge,
  );
  return straight && !cell.bridge && !nextToBridge && !isStart && !isEnd;
}

export function gridStep(
  maze: Maze,
  from: Position,
  dir: Direction,
): Position | null {
  const cell = maze.grid[from.row]?.[from.col];
  if (!cell) return null;

  const axis = axisOf(dir);
  if (cell.bridge) {
    const levelAxis =
      from.level === 'under' ? crossAxis(cell.bridge) : cell.bridge;
    if (axis !== levelAxis) return null;
  }
  if (from.level !== 'under' && cell.walls[dir]) return null;

  const next = movePosition(from, dir);
  const nextCell = maze.grid[next.row]?.[next.col];
  if (!nextCell) return null;
  if (nextCell.bridge) {
    next.level = nextCell.bridge === axis ? 'over' : 'under';
  }
  return next;
}

function movePosition(pos: Position, dir: Direction): Position {
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
  const key = `${pos.row},${pos.col}`;
  return pos.level ? `${key},${pos.level}` : key;
}

export function cellPositions(cell: Cell): Position[] {
  const { row, col } = cell;
  return cell.bridge
    ? [
        { row, col, level: 'over' },
        { row, col, level: 'under' },
      ]
    : [{ row, col }];
}

export function pathThrough(
  path: Position[],
  cell: Cell,
  level: Level,
): Position[][] {
  return path.flatMap((pos, i) =>
    pos.row === cell.row && pos.col === cell.col && pos.level === level
      ? [path.slice(Math.max(0, i - 1), i + 2)]
      : [],
  );
}

export function corridorLinks(maze: Maze): Array<[Position, Position]> {
  const links: Array<[Position, Position]> = [];
  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols; c++) {
      const cell = maze.grid[r][c];
      const right = maze.grid[r][c + 1];
      const below = maze.grid[r + 1]?.[c];
      if (right && !(cell.walls.right && right.walls.left)) {
        links.push([{ row: r, col: c }, { row: r, col: c + 1 }]);
      }
      if (below && !(cell.walls.bottom && below.walls.top)) {
        links.push([{ row: r, col: c }, { row: r + 1, col: c }]);
      }
    }
  }
  return links;
}

export function bridgeNeighbors(cell: Cell): [Position, Position] {
  const { row, col } = cell;
  return cell.bridge === 'horizontal'
    ? [
        { row, col: col - 1 },
        { row, col: col + 1 },
      ]
    : [
        { row: row - 1, col },
        { row: row + 1, col },
      ];
}
