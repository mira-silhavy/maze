import type {
  Axis,
  Cell,
  Direction,
  Level,
  Maze,
  MazeAlgorithm,
  MazeGenerateOptions,
  Position,
} from './types';

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

const BRAID_RATIO = 0.35;
const MIN_BRIDGE_SPACING = 3;

export function axisOf(dir: Direction): Axis {
  return dir === 'left' || dir === 'right' ? 'horizontal' : 'vertical';
}

export function crossAxis(axis: Axis): Axis {
  return axis === 'horizontal' ? 'vertical' : 'horizontal';
}

class UnionFind {
  private parent: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }

  find(x: number): number {
    let root = x;
    while (this.parent[root] !== root) {
      root = this.parent[root];
    }
    let cur = x;
    while (cur !== root) {
      const next = this.parent[cur];
      this.parent[cur] = root;
      cur = next;
    }
    return root;
  }

  union(a: number, b: number): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    this.parent[rb] = ra;
    return true;
  }
}

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function defaultBridgeCount(rows: number, cols: number): number {
  const side = Math.sqrt(rows * cols);
  if (side < 8) return 1;
  if (side <= 13) return 3;
  if (side <= 23) return 5;
  if (side <= 33) return 7;
  return 10;
}

function seedBridges(
  grid: Cell[][],
  rows: number,
  cols: number,
  targetCount: number,
  uf: UnionFind,
  bridgePartner: Map<number, number>,
): void {
  if (rows < 3 || cols < 3 || targetCount <= 0) return;

  const candidates: Array<{ row: number; col: number }> = [];
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      candidates.push({ row: r, col: c });
    }
  }
  shuffle(candidates);

  const placed: Array<{ row: number; col: number }> = [];
  const idx = (r: number, c: number) => r * cols + c;

  for (const cand of candidates) {
    if (placed.length >= targetCount) break;
    const tooClose = placed.some(
      (p) =>
        Math.abs(p.row - cand.row) + Math.abs(p.col - cand.col) <
        MIN_BRIDGE_SPACING,
    );
    if (tooClose) continue;

    placed.push(cand);
    const { row, col } = cand;
    const cell = grid[row][col];
    const axis: Axis = Math.random() < 0.5 ? 'horizontal' : 'vertical';
    cell.bridge = axis;

    if (axis === 'horizontal') {
      // Over passage: horizontal (left <-> right)
      cell.walls.left = false;
      cell.walls.right = false;
      grid[row][col - 1].walls.right = false;
      grid[row][col + 1].walls.left = false;
      // Under passage: vertical (top <-> bottom); bridge cell keeps top/bottom walls true
      grid[row - 1][col].walls.bottom = false;
      grid[row + 1][col].walls.top = false;
    } else {
      // Over passage: vertical (top <-> bottom)
      cell.walls.top = false;
      cell.walls.bottom = false;
      grid[row - 1][col].walls.bottom = false;
      grid[row + 1][col].walls.top = false;
      // Under passage: horizontal (left <-> right); bridge cell keeps left/right walls true
      grid[row][col - 1].walls.right = false;
      grid[row][col + 1].walls.left = false;
    }

    const leftIdx = idx(row, col - 1);
    const rightIdx = idx(row, col + 1);
    const topIdx = idx(row - 1, col);
    const bottomIdx = idx(row + 1, col);

    uf.union(leftIdx, rightIdx);
    uf.union(topIdx, bottomIdx);
    bridgePartner.set(leftIdx, rightIdx);
    bridgePartner.set(rightIdx, leftIdx);
    bridgePartner.set(topIdx, bottomIdx);
    bridgePartner.set(bottomIdx, topIdx);
  }
}

interface CandidateEdge {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
  dir: Direction;
  opposite: Direction;
}

function carveBacktracker(
  grid: Cell[][],
  rows: number,
  cols: number,
  uf: UnionFind,
  bridgePartner: Map<number, number>,
): void {
  const idx = (r: number, c: number) => r * cols + c;
  const stack: Array<{ row: number; col: number }> = [{ row: 0, col: 0 }];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const curIdx = idx(current.row, current.col);
    const unvisited: Array<{
      row: number;
      col: number;
      dir: Direction;
      opposite: Direction;
    }> = [];

    for (const { dir, opposite, dRow, dCol } of DIRECTIONS) {
      const nextRow = current.row + dRow;
      const nextCol = current.col + dCol;
      if (
        nextRow < 0 ||
        nextRow >= rows ||
        nextCol < 0 ||
        nextCol >= cols ||
        grid[nextRow][nextCol].bridge
      ) {
        continue;
      }
      if (uf.find(curIdx) !== uf.find(idx(nextRow, nextCol))) {
        unvisited.push({ row: nextRow, col: nextCol, dir, opposite });
      }
    }

    if (unvisited.length === 0) {
      stack.pop();
      continue;
    }

    const chosen = unvisited[Math.floor(Math.random() * unvisited.length)];
    grid[current.row][current.col].walls[chosen.dir] = false;
    grid[chosen.row][chosen.col].walls[chosen.opposite] = false;

    const chosenIdx = idx(chosen.row, chosen.col);
    uf.union(curIdx, chosenIdx);
    stack.push({ row: chosen.row, col: chosen.col });

    const partnerIdx = bridgePartner.get(chosenIdx);
    if (partnerIdx !== undefined) {
      stack.push({
        row: Math.floor(partnerIdx / cols),
        col: partnerIdx % cols,
      });
    }
  }
}

function carvePrim(
  grid: Cell[][],
  rows: number,
  cols: number,
  uf: UnionFind,
  bridgePartner: Map<number, number>,
): void {
  const idx = (r: number, c: number) => r * cols + c;
  const frontier: CandidateEdge[] = [];

  const addFrontier = (row: number, col: number) => {
    const curIdx = idx(row, col);
    for (const { dir, opposite, dRow, dCol } of DIRECTIONS) {
      const nr = row + dRow;
      const nc = col + dCol;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc].bridge) {
        continue;
      }
      if (uf.find(curIdx) !== uf.find(idx(nr, nc))) {
        frontier.push({ r1: row, c1: col, r2: nr, c2: nc, dir, opposite });
      }
    }
  };

  addFrontier(0, 0);

  while (frontier.length > 0) {
    const pick = Math.floor(Math.random() * frontier.length);
    const edge = frontier[pick];
    frontier[pick] = frontier[frontier.length - 1];
    frontier.pop();

    const a = idx(edge.r1, edge.c1);
    const b = idx(edge.r2, edge.c2);
    if (!uf.union(a, b)) continue;

    grid[edge.r1][edge.c1].walls[edge.dir] = false;
    grid[edge.r2][edge.c2].walls[edge.opposite] = false;

    addFrontier(edge.r2, edge.c2);
    const partnerIdx = bridgePartner.get(b);
    if (partnerIdx !== undefined) {
      addFrontier(Math.floor(partnerIdx / cols), partnerIdx % cols);
    }
  }
}

function carveKruskal(
  grid: Cell[][],
  rows: number,
  cols: number,
  uf: UnionFind,
): void {
  const idx = (r: number, c: number) => r * cols + c;
  const edges: CandidateEdge[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].bridge) continue;
      if (c + 1 < cols && !grid[r][c + 1].bridge) {
        edges.push({
          r1: r,
          c1: c,
          r2: r,
          c2: c + 1,
          dir: 'right',
          opposite: 'left',
        });
      }
      if (r + 1 < rows && !grid[r + 1][c].bridge) {
        edges.push({
          r1: r,
          c1: c,
          r2: r + 1,
          c2: c,
          dir: 'bottom',
          opposite: 'top',
        });
      }
    }
  }

  shuffle(edges);

  for (const edge of edges) {
    if (uf.union(idx(edge.r1, edge.c1), idx(edge.r2, edge.c2))) {
      grid[edge.r1][edge.c1].walls[edge.dir] = false;
      grid[edge.r2][edge.c2].walls[edge.opposite] = false;
    }
  }
}

function braidMaze(grid: Cell[][], rows: number, cols: number): void {
  const deadEnds: Array<{ row: number; col: number }> = [];

  const openCount = (r: number, c: number): number => {
    const cell = grid[r][c];
    let count = 0;
    for (const { dir } of DIRECTIONS) {
      if (!cell.walls[dir]) count++;
    }
    return count;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].bridge) continue;
      if (openCount(r, c) === 1) {
        deadEnds.push({ row: r, col: c });
      }
    }
  }

  shuffle(deadEnds);
  const toOpen = Math.max(1, Math.floor(deadEnds.length * BRAID_RATIO));
  let opened = 0;

  for (const { row, col } of deadEnds) {
    if (opened >= toOpen) break;
    if (openCount(row, col) !== 1) continue;

    const candidates: Array<{
      nr: number;
      nc: number;
      dir: Direction;
      opposite: Direction;
      isDeadEnd: boolean;
    }> = [];

    for (const { dir, opposite, dRow, dCol } of DIRECTIONS) {
      if (!grid[row][col].walls[dir]) continue;
      const nr = row + dRow;
      const nc = col + dCol;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (grid[nr][nc].bridge) continue;
      candidates.push({
        nr,
        nc,
        dir,
        opposite,
        isDeadEnd: openCount(nr, nc) === 1,
      });
    }

    if (candidates.length === 0) continue;
    const preferred = candidates.filter((c) => c.isDeadEnd);
    const pool = preferred.length > 0 ? preferred : candidates;
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    grid[row][col].walls[chosen.dir] = false;
    grid[chosen.nr][chosen.nc].walls[chosen.opposite] = false;
    opened++;
  }
}

export function generateMaze(
  rows: number,
  cols: number,
  options: MazeGenerateOptions = {},
): Maze {
  const {
    bridges = false,
    bridgeCount,
    algorithm = 'backtracker',
    braided = false,
  } = options;

  const grid: Cell[][] = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      row,
      col,
      walls: { top: true, right: true, bottom: true, left: true },
    })),
  );

  const uf = new UnionFind(rows * cols);
  const bridgePartner = new Map<number, number>();

  if (bridges) {
    const count = bridgeCount ?? defaultBridgeCount(rows, cols);
    seedBridges(grid, rows, cols, count, uf, bridgePartner);
  }

  const algo: MazeAlgorithm = algorithm;
  if (algo === 'prim') {
    carvePrim(grid, rows, cols, uf, bridgePartner);
  } else if (algo === 'kruskal') {
    carveKruskal(grid, rows, cols, uf);
  } else {
    carveBacktracker(grid, rows, cols, uf, bridgePartner);
  }

  if (braided) {
    braidMaze(grid, rows, cols);
  }

  return {
    rows,
    cols,
    grid,
    start: { row: 0, col: 0 },
    end: { row: rows - 1, col: cols - 1 },
  };
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
