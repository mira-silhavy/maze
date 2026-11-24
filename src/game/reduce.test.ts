import { describe, expect, it } from 'vitest';
import { generatePolarMaze } from '../maze/polar';
import type { Direction, Maze, Position } from '../maze/types';
import { gridGeometry, polarGeometry } from './geometry';
import {
  DEFAULT_SETTINGS,
  type Command,
  type GameState,
  type Settings,
} from './model';
import { hintPath, phase, playerOf, reduce } from './reduce';

const OPPOSITE: Record<Direction, Direction> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

const OFFSET: Record<Direction, Position> = {
  top: { row: -1, col: 0 },
  right: { row: 0, col: 1 },
  bottom: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
};

function buildMaze(
  rows: number,
  cols: number,
  openings: Array<[Position, Direction]>,
): Maze {
  const grid = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      row,
      col,
      walls: { top: true, right: true, bottom: true, left: true },
    })),
  );
  for (const [pos, dir] of openings) {
    grid[pos.row][pos.col].walls[dir] = false;
    const o = OFFSET[dir];
    grid[pos.row + o.row][pos.col + o.col].walls[OPPOSITE[dir]] = false;
  }
  return {
    rows,
    cols,
    grid,
    start: { row: 0, col: 0 },
    end: { row: rows - 1, col: cols - 1 },
  };
}

const corridorMaze = buildMaze(1, 4, [
  [{ row: 0, col: 0 }, 'right'],
  [{ row: 0, col: 1 }, 'right'],
  [{ row: 0, col: 2 }, 'right'],
]);

function corridor(
  settings: Partial<Settings> = {},
  targets: Position[] = [{ row: 0, col: 3 }],
): GameState {
  return {
    settings: { ...DEFAULT_SETTINGS, ...settings },
    round: {
      kind: 'grid',
      board: { maze: corridorMaze, targets, optimalSteps: 3 },
      run: { trail: [corridorMaze.start], collected: new Set(), steps: 0 },
    },
    showHint: false,
    elapsedSeconds: 0,
  };
}

const right: Command = { type: 'move', dx: 1, dy: 0 };
const left: Command = { type: 'move', dx: -1, dy: 0 };
const up: Command = { type: 'move', dx: 0, dy: -1 };

function run(state: GameState, ...commands: Command[]): GameState {
  return commands.reduce((s, c) => reduce(s, c).state, state);
}

function player(state: GameState) {
  return playerOf(gridRound(state).run);
}

function trail(state: GameState) {
  return state.round.run.trail;
}

describe('move', () => {
  it('steps to the open neighbour and starts play', () => {
    const t = reduce(corridor(), right);
    expect(t.events).toEqual([{ type: 'step' }]);
    expect(player(t.state)).toEqual({ row: 0, col: 1 });
    expect(t.state.round.run.steps).toBe(1);
    expect(phase(t.state)).toBe('playing');
  });

  it('into a wall emits bump and keeps the state object', () => {
    const s = corridor();
    const t = reduce(s, up);
    expect(t.events).toEqual([{ type: 'bump' }]);
    expect(t.state).toBe(s);
  });

  it('ignores a zero vector', () => {
    const s = corridor();
    expect(reduce(s, { type: 'move', dx: 0, dy: 0 })).toEqual({
      state: s,
      events: [],
    });
  });

  it('falls back to the secondary axis when the primary is walled', () => {
    const maze = buildMaze(2, 2, [
      [{ row: 0, col: 0 }, 'bottom'],
      [{ row: 1, col: 0 }, 'right'],
    ]);
    const s: GameState = {
      ...corridor(),
      round: {
        kind: 'grid',
        board: { maze, targets: [], optimalSteps: 2 },
        run: { trail: [maze.start], collected: new Set(), steps: 0 },
      },
    };
    expect(player(run(s, { type: 'move', dx: 1, dy: 0.5 }))).toEqual({
      row: 1,
      col: 0,
    });
    expect(reduce(s, { type: 'move', dx: 1, dy: 0.2 }).events).toEqual([
      { type: 'bump' },
    ]);
  });

  it('backtracking with erase on pops the trail and still counts a step', () => {
    const s = run(corridor(), right, right, left);
    expect(trail(s)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
    expect(s.round.run.steps).toBe(3);
  });

  it('backtracking with erase off appends to the trail', () => {
    const s = run(corridor({ eraseBacktrack: false }), right, right, left);
    expect(trail(s)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 1 },
    ]);
  });

  it('reaching the exit in classic mode emits step then win', () => {
    const t = reduce(run(corridor(), right, right), right);
    expect(t.events).toEqual([{ type: 'step' }, { type: 'win' }]);
    expect(phase(t.state)).toBe('won');
  });

  it('after a win is a silent no-op', () => {
    const won = run(corridor(), right, right, right);
    expect(reduce(won, left)).toEqual({ state: won, events: [] });
  });

  it('collect mode: a target emits step then collect', () => {
    const s = corridor({ mode: 'collect' }, [
      { row: 0, col: 1 },
      { row: 0, col: 3 },
    ]);
    const t = reduce(s, right);
    expect(t.events).toEqual([
      { type: 'step' },
      { type: 'collect', collectedCount: 1 },
    ]);
    expect([...t.state.round.run.collected]).toEqual(['0,1']);
  });

  it('collect mode: the last target emits step, collect, win', () => {
    const s = run(
      corridor({ mode: 'collect' }, [
        { row: 0, col: 1 },
        { row: 0, col: 3 },
      ]),
      right,
      right,
    );
    expect(reduce(s, right).events).toEqual([
      { type: 'step' },
      { type: 'collect', collectedCount: 2 },
      { type: 'win' },
    ]);
  });

  it('collect mode: reaching the exit does not win', () => {
    const s = run(
      corridor({ mode: 'collect' }, [{ row: 0, col: 0 }]),
      right,
      right,
      right,
    );
    expect(phase(s)).toBe('playing');
  });

  it('collect mode with no targets wins only after a move', () => {
    const s = corridor({ mode: 'collect' }, []);
    expect(phase(s)).toBe('ready');
    expect(reduce(s, right).events).toEqual([
      { type: 'step' },
      { type: 'win' },
    ]);
  });

  it('moves on a polar maze through the open neighbour', () => {
    const maze = generatePolarMaze(3);
    const s: GameState = {
      ...corridor({ style: 'circular' }),
      round: {
        kind: 'polar',
        board: { maze, targets: [], optimalSteps: 0 },
        run: { trail: [maze.startId], collected: new Set(), steps: 0 },
      },
    };
    const [from, to] = polarGeometry.pathToNearest(maze, maze.startId, [
      maze.endId,
    ]);
    const a = maze.cells.get(from)!;
    const b = maze.cells.get(to)!;
    const t = reduce(s, { type: 'move', dx: b.x - a.x, dy: b.y - a.y });
    expect(t.events).toEqual([{ type: 'step' }]);
    expect(t.state.round.run.trail).toEqual([from, to]);
  });
});

describe('hint', () => {
  it('leads to the exit in classic mode and the nearest target in collect mode', () => {
    const classic = run(corridor(), right);
    expect(hintPath(gridGeometry, gridRound(classic), 'classic', true)).toEqual(
      [
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ],
    );

    const collect = corridor({ mode: 'collect' }, [{ row: 0, col: 2 }]);
    expect(hintPath(gridGeometry, gridRound(collect), 'collect', true)).toEqual(
      [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
    );
  });

  it('is empty when hidden or won', () => {
    expect(
      hintPath(gridGeometry, gridRound(corridor()), 'classic', false),
    ).toEqual([]);
    const won = run(corridor(), right, right, right);
    expect(hintPath(gridGeometry, gridRound(won), 'classic', true)).toEqual([]);
  });
});

describe('lifecycle', () => {
  it('tick only advances time while playing', () => {
    const ready = corridor();
    expect(reduce(ready, { type: 'tick' }).state).toBe(ready);

    const playing = run(corridor(), right, { type: 'tick' }, { type: 'tick' });
    expect(playing.elapsedSeconds).toBe(2);

    const won = run(playing, right, right);
    expect(reduce(won, { type: 'tick' }).state).toBe(won);
  });

  it('tick keeps the round identity', () => {
    const s = run(corridor(), right);
    expect(reduce(s, { type: 'tick' }).state.round).toBe(s.round);
  });

  it('restart keeps the maze, targets and hint and clears the run and time', () => {
    const s = run(
      corridor({ mode: 'collect' }, [
        { row: 0, col: 1 },
        { row: 0, col: 3 },
      ]),
      { type: 'toggleHint' },
      right,
      { type: 'tick' },
    );
    const r = reduce(s, { type: 'restart' }).state;
    expect(r.showHint).toBe(true);
    expect(r.round.board).toBe(s.round.board);
    expect(r.round.run).toEqual({
      trail: [{ row: 0, col: 0 }],
      collected: new Set(),
      steps: 0,
    });
    expect(r.elapsedSeconds).toBe(0);
    expect(phase(r)).toBe('ready');
  });

  it('a target-count change reselects targets on the same maze, resets the run and keeps the hint', () => {
    const s = run(
      corridor({ mode: 'collect' }, []),
      { type: 'toggleHint' },
      right,
    );
    const r = reduce(s, { type: 'configure', patch: { targetCount: 3 } }).state;
    expect(r.settings.targetCount).toBe(3);
    expect(gridRound(r).board.maze).toBe(corridorMaze);
    expect(r.round.board.targets).toEqual([{ row: 0, col: 3 }]);
    expect(r.round.run.steps).toBe(0);
    expect(r.showHint).toBe(true);
  });

  it('theme, sound and erase changes keep the round', () => {
    const s = run(corridor(), right);
    for (const patch of [
      { themeId: 'forest' },
      { sound: false },
      { eraseBacktrack: false },
    ] as const) {
      const r = reduce(s, { type: 'configure', patch }).state;
      expect(r.round).toBe(s.round);
      expect(r.settings).toEqual({ ...s.settings, ...patch });
    }
  });

  it('a new maze resets the hint and the run', () => {
    const s = run(corridor(), { type: 'toggleHint' }, right, { type: 'tick' });
    const r = reduce(s, { type: 'newMaze' }).state;
    expect(r.showHint).toBe(false);
    expect(r.round).not.toBe(s.round);
    expect(r.round.run.steps).toBe(0);
    expect(r.elapsedSeconds).toBe(0);
  });

  it('re-selecting the current difficulty still deals a new maze', () => {
    const s = run(corridor(), { type: 'toggleHint' });
    const r = reduce(s, {
      type: 'configure',
      patch: { difficultyId: s.settings.difficultyId },
    }).state;
    expect(r.round).not.toBe(s.round);
    expect(r.showHint).toBe(false);
  });

  it('builds a polar round for the circular style and a grid round otherwise', () => {
    const s = corridor();
    const circular = reduce(s, {
      type: 'configure',
      patch: { style: 'circular' },
    });
    expect(circular.state.round.kind).toBe('polar');
    const curved = reduce(s, { type: 'configure', patch: { style: 'curved' } });
    expect(curved.state.round.kind).toBe('grid');
  });
});

function gridRound(state: GameState) {
  if (state.round.kind !== 'grid') throw new Error('expected a grid round');
  return state.round;
}
