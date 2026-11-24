import {
  ASPECT_RATIO_PRESETS,
  DIFFICULTY_PRESETS,
  type AspectRatioPreset,
  type DifficultyPreset,
  type GameMode,
} from '../maze/types';
import {
  gridGeometry,
  polarGeometry,
  updateRound,
  withGeometry,
  type Geometry,
} from './geometry';
import {
  SETTING_EFFECT,
  type Board,
  type Command,
  type GameEvent,
  type GameState,
  type Phase,
  type Round,
  type RoundOf,
  type Run,
  type Settings,
  type TargetCount,
  type Transition,
  type Vector,
} from './model';
import { MAZE_STYLES } from './styles';

export function reduce(state: GameState, command: Command): Transition {
  switch (command.type) {
    case 'move': {
      if (command.dx === 0 && command.dy === 0) return { state, events: [] };
      const { round, out: events } = updateRound(state.round, (geo, r) =>
        advance(geo, r, command, state.settings),
      );
      return {
        state: round === state.round ? state : { ...state, round },
        events,
      };
    }

    case 'restart':
      return {
        state: { ...state, round: resetRun(state.round), elapsedSeconds: 0 },
        events: [],
      };

    case 'newMaze':
      return { state: initGame(state.settings), events: [] };

    case 'configure': {
      const settings = { ...state.settings, ...command.patch };
      const effects = new Set(
        (Object.keys(command.patch) as (keyof Settings)[]).map(
          (key) => SETTING_EFFECT[key],
        ),
      );
      if (effects.has('regenerate')) {
        return { state: initGame(settings), events: [] };
      }
      if (effects.has('retarget')) {
        return {
          state: {
            ...state,
            settings,
            round: resetRun(state.round, settings.targetCount),
            elapsedSeconds: 0,
          },
          events: [],
        };
      }
      return { state: { ...state, settings }, events: [] };
    }

    case 'toggleHint':
      return { state: { ...state, showHint: !state.showHint }, events: [] };

    case 'tick':
      if (phase(state) !== 'playing') return { state, events: [] };
      return {
        state: { ...state, elapsedSeconds: state.elapsedSeconds + 1 },
        events: [],
      };
  }
}

export function initGame(settings: Settings): GameState {
  return {
    settings,
    round: createRound(settings),
    showHint: false,
    elapsedSeconds: 0,
  };
}

function targetLimit(count: TargetCount): number {
  return count === 'all' ? Number.POSITIVE_INFINITY : count;
}

function createRound(settings: Settings): Round {
  const difficulty = DIFFICULTY_PRESETS.find(
    (p) => p.id === settings.difficultyId,
  )!;
  const aspect = ASPECT_RATIO_PRESETS.find(
    (p) => p.id === settings.aspectRatioId,
  )!;
  if (MAZE_STYLES[settings.style].geometry === 'polar') {
    return {
      kind: 'polar',
      ...buildRound(polarGeometry, difficulty, aspect, settings),
    };
  }
  return {
    kind: 'grid',
    ...buildRound(gridGeometry, difficulty, aspect, settings),
  };
}

function buildRound<M, N>(
  geo: Geometry<M, N>,
  difficulty: DifficultyPreset,
  aspect: AspectRatioPreset,
  { targetCount, bridges }: Settings,
): RoundOf<M, N> {
  const maze = geo.create(difficulty, aspect, bridges);
  const start = geo.start(maze);
  const board: Board<M, N> = {
    maze,
    targets: geo.selectTargets(maze, targetLimit(targetCount)),
    optimalSteps: Math.max(
      0,
      geo.pathToNearest(maze, start, [geo.end(maze)]).length - 1,
    ),
  };
  return { board, run: freshRun(geo, board) };
}

function resetRun(round: Round, targetCount?: TargetCount): Round {
  return updateRound(round, (geo, { board }) => {
    const next =
      targetCount === undefined
        ? board
        : {
            ...board,
            targets: geo.selectTargets(board.maze, targetLimit(targetCount)),
          };
    return { next: { board: next, run: freshRun(geo, next) }, out: null };
  }).round;
}

function freshRun<M, N>(geo: Geometry<M, N>, board: Board<M, N>): Run<N> {
  return { trail: [geo.start(board.maze)], collected: new Set(), steps: 0 };
}

function advance<M, N>(
  geo: Geometry<M, N>,
  round: RoundOf<M, N>,
  v: Vector,
  settings: Settings,
): { next: RoundOf<M, N>; out: GameEvent[] } {
  const { board, run } = round;
  if (isWon(geo, board, run, settings.mode)) return { next: round, out: [] };

  const to = geo.stepToward(board.maze, playerOf(run), v);
  if (to === null) return { next: round, out: [{ type: 'bump' }] };

  const toKey = geo.key(to);
  const backtracking =
    settings.eraseBacktrack &&
    run.trail.length >= 2 &&
    geo.key(run.trail[run.trail.length - 2]) === toKey;
  const trail: [N, ...N[]] = backtracking
    ? (run.trail.slice(0, -1) as [N, ...N[]])
    : [...run.trail, to];

  const picksUp =
    settings.mode === 'collect' &&
    !run.collected.has(toKey) &&
    board.targets.some((t) => geo.key(t) === toKey);
  const collected = picksUp ? new Set(run.collected).add(toKey) : run.collected;

  const nextRun: Run<N> = { trail, collected, steps: run.steps + 1 };
  const events: GameEvent[] = [{ type: 'step' }];
  if (picksUp) events.push({ type: 'collect', collectedCount: collected.size });
  if (isWon(geo, board, nextRun, settings.mode)) events.push({ type: 'win' });
  return { next: { board, run: nextRun }, out: events };
}

function isWon<M, N>(
  geo: Geometry<M, N>,
  board: Board<M, N>,
  run: Run<N>,
  mode: GameMode,
): boolean {
  if (run.steps === 0) return false;
  if (mode === 'collect') return run.collected.size >= board.targets.length;
  return geo.key(playerOf(run)) === geo.key(geo.end(board.maze));
}

export function phase(state: GameState): Phase {
  return withGeometry(state.round, (geo, { board, run }) =>
    isWon(geo, board, run, state.settings.mode)
      ? 'won'
      : run.steps === 0
        ? 'ready'
        : 'playing',
  );
}

export function playerOf<N>(run: Run<N>): N {
  return run.trail[run.trail.length - 1];
}

export function visitedKeys<M, N>(
  geo: Geometry<M, N>,
  run: Run<N>,
): Set<string> {
  return new Set(run.trail.map(geo.key));
}

export function hintPath<M, N>(
  geo: Geometry<M, N>,
  { board, run }: RoundOf<M, N>,
  mode: GameMode,
  showHint: boolean,
): N[] {
  if (!showHint || isWon(geo, board, run, mode)) return [];
  const goals =
    mode === 'classic'
      ? [geo.end(board.maze)]
      : board.targets.filter((t) => !run.collected.has(geo.key(t)));
  return geo.pathToNearest(board.maze, playerOf(run), goals);
}
