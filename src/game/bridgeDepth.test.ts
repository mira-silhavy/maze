import { describe, expect, it } from 'vitest';
import { generateMaze, gridStep } from '../maze/grid';
import type { Direction, Maze, Position } from '../maze/types';
import {
  layerPath,
  layerTipParts,
  marbleDepth,
  segmentLayer,
  type DepthLayer,
} from './bridgeDepth';
import { createMarbleAt, MARBLE_RADIUS, stepMarblePhysics, type MarbleBody } from './marble';

/** 5x5 maze: straight corridor along row 2 crossing over a horizontal bridge at (2,2),
 * straight corridor along column 2 passing under it. */
function buildCrossingMaze(): Maze {
  const maze = generateMaze(5, 5);
  const g = maze.grid;
  for (const row of g) {
    for (const cell of row) {
      cell.walls = { top: true, right: true, bottom: true, left: true };
    }
  }
  for (let i = 0; i < 4; i++) {
    g[2][i].walls.right = false;
    g[2][i + 1].walls.left = false;
    g[i][2].walls.bottom = false;
    g[i + 1][2].walls.top = false;
  }
  g[2][2].bridge = 'horizontal';
  return maze;
}

const BRIDGE = { row: 2, col: 2 };
/** Deck footprint in grid units: the bridge cell plus 0.14 overhang along the deck, 0.56 wide. */
const DECK_OVERHANG = 0.14;
const DECK_HALF_WIDTH = 0.28;

function discOverlapsDeck(body: MarbleBody): boolean {
  const r = MARBLE_RADIUS;
  return (
    Math.abs(body.y - (BRIDGE.row + 0.5)) < DECK_HALF_WIDTH + r &&
    body.x > BRIDGE.col - DECK_OVERHANG - r &&
    body.x < BRIDGE.col + 1 + DECK_OVERHANG + r
  );
}

const RANK: Record<DepthLayer, number> = { lower: 0, upper: 1 };

interface Frame {
  body: MarbleBody;
  depth: ReturnType<typeof marbleDepth>;
  tipLayers: DepthLayer[];
}

/** Rolls the marble with constant tilt, keeping the trail like the game does. */
function roll(
  maze: Maze,
  start: Position,
  tilt: { gx: number; gy: number },
  dir: Direction,
  frames: number,
): Frame[] {
  let body = createMarbleAt(start);
  const trail: Position[] = [{ ...start }];
  const out: Frame[] = [];
  for (let i = 0; i < frames; i++) {
    const res = stepMarblePhysics(maze, body, tilt, 1 / 60);
    body = res.body;
    for (const step of res.enteredCells) {
      const from = trail[trail.length - 1];
      const d: Direction =
        step.dx > 0 ? 'right' : step.dx < 0 ? 'left' : step.dy > 0 ? 'bottom' : 'top';
      const next = gridStep(maze, from, d);
      if (next) trail.push(next);
    }
    const tipLayers: DepthLayer[] = [];
    if (trail.length >= 2) {
      tipLayers.push(segmentLayer(trail[trail.length - 2], trail[trail.length - 1]));
    }
    const ahead = gridStep(maze, trail[trail.length - 1], dir);
    if (ahead) tipLayers.push(segmentLayer(trail[trail.length - 1], ahead));
    out.push({ body, depth: marbleDepth(maze, body), tipLayers });
  }
  return out;
}

describe('bridge depth', () => {
  it('assigns each trail segment one layer, so it never changes depth when committed', () => {
    expect(segmentLayer({ row: 2, col: 1 }, { row: 2, col: 2, level: 'over' })).toBe('upper');
    expect(segmentLayer({ row: 2, col: 2, level: 'over' }, { row: 2, col: 3 })).toBe('upper');
    expect(segmentLayer({ row: 1, col: 2 }, { row: 2, col: 2, level: 'under' })).toBe('lower');
    expect(segmentLayer({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe('lower');
  });

  it('keeps the marble above the deck on the whole over-pass, including rolling off its end', () => {
    const frames = roll(buildCrossingMaze(), { row: 2, col: 0 }, { gx: 1, gy: 0 }, 'right', 120);
    const onDeck = frames.filter((f) => discOverlapsDeck(f.body));
    expect(onDeck.length).toBeGreaterThan(5);
    expect(onDeck.filter((f) => f.body.col === BRIDGE.col + 1).length).toBeGreaterThan(0);
    for (const f of onDeck) expect(f.depth.layer).toBe('upper');
  });

  it('keeps the marble below the deck with a ghost on the whole underpass', () => {
    const frames = roll(buildCrossingMaze(), { row: 0, col: 2 }, { gx: 0, gy: 1 }, 'bottom', 120);
    const covered = frames.filter((f) => discOverlapsDeck(f.body));
    expect(covered.length).toBeGreaterThan(5);
    for (const f of covered) {
      expect(f.depth.layer).toBe('lower');
      expect(f.depth.ghost).not.toBeNull();
    }
  });

  it('never draws the live trail tip above the marble', () => {
    const maze = buildCrossingMaze();
    const runs = [
      roll(maze, { row: 2, col: 0 }, { gx: 1, gy: 0 }, 'right', 120),
      roll(maze, { row: 2, col: 4 }, { gx: -1, gy: 0 }, 'left', 120),
      roll(maze, { row: 0, col: 2 }, { gx: 0, gy: 1 }, 'bottom', 120),
      roll(maze, { row: 4, col: 2 }, { gx: 0, gy: -1 }, 'top', 120),
    ];
    for (const frames of runs) {
      for (const f of frames) {
        for (const layer of f.tipLayers) {
          expect(RANK[layer]).toBeLessThanOrEqual(RANK[f.depth.layer]);
        }
      }
    }
  });

  it('groups a trail crossing over then under a bridge into layer runs', () => {
    const a = { row: 2, col: 1 };
    const over = { row: 2, col: 2, level: 'over' as const };
    const c = { row: 2, col: 3 };
    const d = { row: 1, col: 3 };
    const e = { row: 1, col: 2 };
    const under = { row: 2, col: 2, level: 'under' as const };
    const g = { row: 3, col: 2 };
    const path = layerPath([a, over, c, d, e, under, g], 6);
    expect(path.upper).toEqual([[a, over, c]]);
    expect(path.lower).toEqual([[c, d, e, under, g]]);
    expect(path.upperCutouts).toEqual([a, c]);
  });

  it('draws every tip joint exactly once', () => {
    const p = { row: 2, col: 0 };
    const a = { row: 2, col: 1 };
    const over = { row: 2, col: 2, level: 'over' as const };
    const c = { row: 2, col: 3 };
    const d = { row: 2, col: 4 };
    // Marble just left the bridge into c: committed ..a→over (upper), tip over→c (upper) + c→d (lower).
    const leaving = layerTipParts([p, a, over, c], [
      { from: over, to: c },
      { from: c, to: d },
    ]);
    expect(leaving.upper.parts.map((x) => x.to)).toEqual([c]);
    expect(leaving.upper.cutouts).toEqual([c]);
    expect(leaving.lower.parts.map((x) => x.to)).toEqual([d]);
    expect(leaving.lower.cutouts).toEqual([]);
    // Marble climbing onto the bridge from a: committed p→a (lower), tip a→over (upper).
    const climbing = layerTipParts([p, a, over], [{ from: a, to: over }]);
    expect(climbing.upper.cutouts).toEqual([a]);
    expect(climbing.lower.cutouts).toEqual([]);
  });

  it('cuts no joint out of a tip that stays in the committed trail layer', () => {
    const p = { row: 0, col: 0 };
    const a = { row: 0, col: 1 };
    const b = { row: 1, col: 1 };
    const c = { row: 1, col: 0 };
    const tip = layerTipParts([p, a, b], [
      { from: a, to: b },
      { from: b, to: c },
    ]);
    expect(tip.lower.cutouts).toEqual([]);
    expect(tip.lower.parts).toHaveLength(2);
  });
});
