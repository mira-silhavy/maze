import type { MazeAlgorithm } from './types';

export interface PolarCell {
  id: string;
  ring: number;
  sector: number;
  sectorCount: number;
  rInner: number;
  rOuter: number;
  angleStart: number;
  angleEnd: number;
  x: number;
  y: number;
  neighbors: string[];
}

export interface PolarMaze {
  rings: number;
  ringCounts: number[];
  cells: Map<string, PolarCell>;
  cellList: PolarCell[];
  passages: Set<string>;
  startId: string;
  endId: string;
}

export function polarCellId(ring: number, sector: number): string {
  return `${ring}:${sector}`;
}

export function polarEdgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function hasPolarPassage(
  maze: PolarMaze,
  a: string,
  b: string,
): boolean {
  return maze.passages.has(polarEdgeKey(a, b));
}

export function generatePolarMaze(
  rings: number,
  options: { algorithm?: MazeAlgorithm; braided?: boolean } = {},
): PolarMaze {
  const { algorithm = 'backtracker', braided = false } = options;
  const ringCounts: number[] = [1];
  for (let r = 1; r < rings; r++) {
    const prev = ringCounts[r - 1];
    if (r === 1) {
      ringCounts.push(6);
    } else {
      const circumference = 2 * Math.PI * r;
      const estimatedCellWidth = circumference / prev;
      ringCounts.push(estimatedCellWidth >= 1.55 ? prev * 2 : prev);
    }
  }

  const cells = new Map<string, PolarCell>();
  const cellList: PolarCell[] = [];

  for (let ring = 0; ring < rings; ring++) {
    const count = ringCounts[ring];
    const rInner = ring === 0 ? 0 : ring;
    const rOuter = ring + 1;

    for (let sector = 0; sector < count; sector++) {
      const angleStart = (sector / count) * Math.PI * 2 - Math.PI / 2;
      const angleEnd = ((sector + 1) / count) * Math.PI * 2 - Math.PI / 2;
      const midAngle = (angleStart + angleEnd) / 2;
      const midRadius = ring === 0 ? 0 : (rInner + rOuter) / 2;

      const cell: PolarCell = {
        id: polarCellId(ring, sector),
        ring,
        sector,
        sectorCount: count,
        rInner,
        rOuter,
        angleStart,
        angleEnd,
        x: Math.cos(midAngle) * midRadius,
        y: Math.sin(midAngle) * midRadius,
        neighbors: [],
      };
      cells.set(cell.id, cell);
      cellList.push(cell);
    }
  }

  // Wire up geometric neighbors
  for (const cell of cellList) {
    const { ring, sector, sectorCount } = cell;

    // Clockwise and counter-clockwise on same ring
    if (ring > 0) {
      const cw = polarCellId(ring, (sector + 1) % sectorCount);
      const ccw = polarCellId(ring, (sector - 1 + sectorCount) % sectorCount);
      cell.neighbors.push(cw, ccw);
    }

    // Inward neighbor
    if (ring > 0) {
      const innerCount = ringCounts[ring - 1];
      const ratio = sectorCount / innerCount;
      const innerSector = Math.floor(sector / ratio);
      const innerId = polarCellId(ring - 1, innerSector);
      cell.neighbors.push(innerId);
      cells.get(innerId)!.neighbors.push(cell.id);
    }
  }

  // Deduplicate neighbor lists
  for (const cell of cellList) {
    cell.neighbors = Array.from(new Set(cell.neighbors));
  }

  const passages = new Set<string>();
  const startId = polarCellId(0, 0);

  if (algorithm === 'prim') {
    const visited = new Set<string>([startId]);
    const frontier: Array<[string, string]> = [];
    for (const n of cells.get(startId)!.neighbors) {
      frontier.push([startId, n]);
    }

    while (frontier.length > 0) {
      const idx = Math.floor(Math.random() * frontier.length);
      const [fromId, toId] = frontier[idx];
      frontier[idx] = frontier[frontier.length - 1];
      frontier.pop();

      if (visited.has(toId)) continue;
      visited.add(toId);
      passages.add(polarEdgeKey(fromId, toId));
      for (const n of cells.get(toId)!.neighbors) {
        if (!visited.has(n)) frontier.push([toId, n]);
      }
    }
  } else if (algorithm === 'kruskal') {
    const parent = new Map<string, string>();
    for (const cell of cellList) parent.set(cell.id, cell.id);
    const find = (x: string): string => {
      let r = x;
      while (parent.get(r) !== r) r = parent.get(r)!;
      let c = x;
      while (c !== r) {
        const next = parent.get(c)!;
        parent.set(c, r);
        c = next;
      }
      return r;
    };

    const edgeSet = new Set<string>();
    const edges: Array<[string, string]> = [];
    for (const cell of cellList) {
      for (const n of cell.neighbors) {
        const key = polarEdgeKey(cell.id, n);
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push([cell.id, n]);
        }
      }
    }
    for (let i = edges.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [edges[i], edges[j]] = [edges[j], edges[i]];
    }
    for (const [a, b] of edges) {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) {
        parent.set(rb, ra);
        passages.add(polarEdgeKey(a, b));
      }
    }
  } else {
    const visited = new Set<string>([startId]);
    const stack: string[] = [startId];

    while (stack.length > 0) {
      const currentId = stack[stack.length - 1];
      const current = cells.get(currentId)!;
      const unvisited = current.neighbors.filter((n) => !visited.has(n));

      if (unvisited.length === 0) {
        stack.pop();
        continue;
      }

      const chosenId = unvisited[Math.floor(Math.random() * unvisited.length)];
      passages.add(polarEdgeKey(currentId, chosenId));
      visited.add(chosenId);
      stack.push(chosenId);
    }
  }

  if (braided) {
    const openCount = (cell: PolarCell): number =>
      cell.neighbors.filter((n) => passages.has(polarEdgeKey(cell.id, n))).length;
    const deadEnds = cellList.filter(
      (cell) => cell.id !== startId && openCount(cell) === 1,
    );
    for (let i = deadEnds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deadEnds[i], deadEnds[j]] = [deadEnds[j], deadEnds[i]];
    }
    const toOpen = Math.max(1, Math.floor(deadEnds.length * 0.35));
    let opened = 0;
    for (const cell of deadEnds) {
      if (opened >= toOpen) break;
      if (openCount(cell) !== 1) continue;
      const closed = cell.neighbors.filter(
        (n) => !passages.has(polarEdgeKey(cell.id, n)),
      );
      if (closed.length === 0) continue;
      const preferred = closed.filter((n) => openCount(cells.get(n)!) === 1);
      const pool = preferred.length > 0 ? preferred : closed;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      passages.add(polarEdgeKey(cell.id, chosen));
      opened++;
    }
  }

  // Pick the farthest outer-ring cell from center as the classic end
  const distances = computePolarDistances(cells, passages, startId);
  let endId = polarCellId(rings - 1, 0);
  let maxDist = -1;
  for (const cell of cellList) {
    if (cell.ring === rings - 1) {
      const d = distances.get(cell.id) ?? 0;
      if (d > maxDist) {
        maxDist = d;
        endId = cell.id;
      }
    }
  }

  return {
    rings,
    ringCounts,
    cells,
    cellList,
    passages,
    startId,
    endId,
  };
}

function computePolarDistances(
  cells: Map<string, PolarCell>,
  passages: Set<string>,
  startId: string,
): Map<string, number> {
  const distances = new Map<string, number>([[startId, 0]]);
  const queue: string[] = [startId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const dist = distances.get(currentId)!;
    const cell = cells.get(currentId)!;

    for (const neighborId of cell.neighbors) {
      if (
        !distances.has(neighborId) &&
        passages.has(polarEdgeKey(currentId, neighborId))
      ) {
        distances.set(neighborId, dist + 1);
        queue.push(neighborId);
      }
    }
  }

  return distances;
}

export function findPolarShortestPath(
  maze: PolarMaze,
  startId: string,
  targetIds: string[],
): string[] {
  if (targetIds.length === 0) return [];
  const targetSet = new Set(targetIds);

  const queue: string[] = [startId];
  const visited = new Set<string>([startId]);
  const parent = new Map<string, string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (targetSet.has(currentId)) {
      const path: string[] = [];
      let cursor: string | undefined = currentId;
      while (cursor) {
        path.push(cursor);
        cursor = parent.get(cursor);
      }
      return path.reverse();
    }

    const cell = maze.cells.get(currentId)!;
    for (const neighborId of cell.neighbors) {
      if (
        !visited.has(neighborId) &&
        hasPolarPassage(maze, currentId, neighborId)
      ) {
        visited.add(neighborId);
        parent.set(neighborId, currentId);
        queue.push(neighborId);
      }
    }
  }

  return [];
}

export function selectPolarDeadEndTargets(
  maze: PolarMaze,
  maxCount: number,
): string[] {
  const deadEnds: PolarCell[] = [];

  for (const cell of maze.cellList) {
    if (cell.id === maze.startId) continue;
    let openCount = 0;
    for (const neighborId of cell.neighbors) {
      if (hasPolarPassage(maze, cell.id, neighborId)) openCount++;
    }
    if (openCount === 1) {
      deadEnds.push(cell);
    }
  }

  if (deadEnds.length <= maxCount) {
    return deadEnds.map((c) => c.id);
  }

  const distances = computePolarDistances(
    maze.cells,
    maze.passages,
    maze.startId,
  );
  const sorted = [...deadEnds].sort(
    (a, b) => (distances.get(b.id) ?? 0) - (distances.get(a.id) ?? 0),
  );

  const chosen: PolarCell[] = [sorted[0]];
  const remaining = sorted.slice(1);

  while (chosen.length < maxCount && remaining.length > 0) {
    let bestIdx = 0;
    let bestMinDist = -1;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      let minDist = Infinity;
      for (const picked of chosen) {
        const d = Math.hypot(candidate.x - picked.x, candidate.y - picked.y);
        if (d < minDist) minDist = d;
      }
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestIdx = i;
      }
    }

    chosen.push(remaining.splice(bestIdx, 1)[0]);
  }

  return chosen.map((c) => c.id);
}

/**
 * Picks the open neighbor whose screen-space direction best aligns with the
 * pressed arrow key vector (dx, dy).
 */
export function findPolarMoveInDirection(
  maze: PolarMaze,
  currentId: string,
  dx: number,
  dy: number,
): string | null {
  const current = maze.cells.get(currentId);
  if (!current) return null;

  let bestId: string | null = null;
  let bestScore = 0.35;

  for (const neighborId of current.neighbors) {
    if (!hasPolarPassage(maze, currentId, neighborId)) continue;
    const neighbor = maze.cells.get(neighborId)!;
    const vx = neighbor.x - current.x;
    const vy = neighbor.y - current.y;
    const len = Math.hypot(vx, vy);
    if (len === 0) continue;

    const score = (vx / len) * dx + (vy / len) * dy;
    if (score > bestScore) {
      bestScore = score;
      bestId = neighborId;
    }
  }

  return bestId;
}
