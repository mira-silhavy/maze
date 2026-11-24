import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Circle,
  CircleDot,
  Clock,
  Compass,
  Eraser,
  FileText,
  Flag,
  Footprints,
  Grid2X2,
  Lightbulb,
  Maximize2,
  Minimize2,
  Monitor,
  Printer,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Spline,
  Square,
  Tablet,
  Trees,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CircularMazeSvg } from './components/CircularMazeSvg';
import { CurvedMazeSvg } from './components/CurvedMazeSvg';
import { MazeCanvas } from './components/MazeCanvas';
import { PrintableMazeSvg } from './components/PrintableMazeSvg';
import { generateMaze, gridStep, positionKey } from './maze/generator';
import {
  findPolarMoveInDirection,
  findPolarShortestPath,
  generatePolarMaze,
  selectPolarDeadEndTargets,
  type PolarMaze,
} from './maze/polar';
import {
  findShortestPath,
  findShortestPathToNearest,
  selectDeadEndTargets,
} from './maze/solver';
import {
  playCollectSound,
  playStepSound,
  playWallBumpSound,
  playWinSound,
} from './maze/sound';
import { getThemeById, MAZE_THEMES, type ThemeId } from './maze/themes';
import {
  ASPECT_RATIO_PRESETS,
  DIFFICULTY_PRESETS,
  getMazeDimensions,
  type AspectRatioId,
  type AspectRatioPreset,
  type DifficultyPreset,
  type Direction,
  type GameMode,
  type Maze,
  type MazeStyle,
  type Position,
} from './maze/types';

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function AspectIcon({ id }: { id: AspectRatioId }) {
  switch (id) {
    case 'square':
      return <Square className="h-3.5 w-3.5" />;
    case 'tablet':
      return <Tablet className="h-3.5 w-3.5" />;
    case 'widescreen':
      return <Monitor className="h-3.5 w-3.5" />;
  }
}

function ThemeIcon({ id }: { id: ThemeId }) {
  switch (id) {
    case 'space':
      return <Sparkles className="h-3.5 w-3.5" />;
    case 'forest':
      return <Trees className="h-3.5 w-3.5" />;
    case 'pirate':
      return <Compass className="h-3.5 w-3.5" />;
    case 'paper':
      return <FileText className="h-3.5 w-3.5" />;
  }
}

type CircleCountOption = number | 'all';

const CIRCLE_COUNT_OPTIONS: ReadonlyArray<{
  value: CircleCountOption;
  label: string;
}> = [
  { value: 3, label: '3' },
  { value: 5, label: '5' },
  { value: 7, label: '7' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
  { value: 'all', label: 'Vše' },
];

function resolveCircleLimit(option: CircleCountOption): number {
  return option === 'all' ? Number.POSITIVE_INFINITY : option;
}

const DIRECTION_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  top: { dx: 0, dy: -1 },
  right: { dx: 1, dy: 0 },
  bottom: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
};

interface GameState {
  gridMaze: Maze;
  polarMaze: PolarMaze;
  gridPlayer: Position;
  polarPlayer: string;
  gridTrail: Position[];
  polarTrail: string[];
  visited: Set<string>;
  gridTargets: Position[];
  polarTargets: string[];
  collected: Set<string>;
  steps: number;
  elapsedSeconds: number;
  started: boolean;
  won: boolean;
  showHint: boolean;
}

function createInitialState(
  difficulty: DifficultyPreset,
  aspectRatio: AspectRatioPreset,
  style: MazeStyle,
  circleOption: CircleCountOption,
): GameState {
  const { rows, cols } = getMazeDimensions(difficulty, aspectRatio);
  const gridMaze = generateMaze(rows, cols);
  const polarMaze = generatePolarMaze(difficulty.polarRings);
  const maxCircles = resolveCircleLimit(circleOption);

  return {
    gridMaze,
    polarMaze,
    gridPlayer: gridMaze.start,
    polarPlayer: polarMaze.startId,
    gridTrail: [gridMaze.start],
    polarTrail: [polarMaze.startId],
    visited: new Set([
      style === 'circular' ? polarMaze.startId : positionKey(gridMaze.start),
    ]),
    gridTargets: selectDeadEndTargets(gridMaze, maxCircles),
    polarTargets: selectPolarDeadEndTargets(polarMaze, maxCircles),
    collected: new Set<string>(),
    steps: 0,
    elapsedSeconds: 0,
    started: false,
    won: false,
    showHint: false,
  };
}

export default function App() {
  const [preset, setPreset] = useState<DifficultyPreset>(DIFFICULTY_PRESETS[1]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioPreset>(
    ASPECT_RATIO_PRESETS[0],
  );
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [mazeStyle, setMazeStyle] = useState<MazeStyle>('classic');
  const [themeId, setThemeId] = useState<ThemeId>('space');
  const [circleOption, setCircleOption] = useState<CircleCountOption>(7);
  const [focusMode, setFocusMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [eraseBacktrack, setEraseBacktrack] = useState(true);
  const [game, setGame] = useState<GameState>(() =>
    createInitialState(
      DIFFICULTY_PRESETS[1],
      ASPECT_RATIO_PRESETS[0],
      'classic',
      7,
    ),
  );
  const gameRef = useRef(game);
  gameRef.current = game;

  const isCircular = mazeStyle === 'circular';
  const theme = useMemo(() => getThemeById(themeId), [themeId]);

  const startNewMaze = useCallback(
    (
      nextPreset: DifficultyPreset,
      nextAspect: AspectRatioPreset,
      nextStyle: MazeStyle,
      nextMode: GameMode,
      nextCircleOption: CircleCountOption = circleOption,
    ) => {
      setPreset(nextPreset);
      setAspectRatio(nextAspect);
      setMazeStyle(nextStyle);
      setGameMode(nextMode);
      setCircleOption(nextCircleOption);
      setGame(
        createInitialState(
          nextPreset,
          nextAspect,
          nextStyle,
          nextCircleOption,
        ),
      );
    },
    [circleOption],
  );

  const handleCircleOptionChange = useCallback(
    (nextOption: CircleCountOption) => {
      setCircleOption(nextOption);
      const maxCircles = resolveCircleLimit(nextOption);
      setGame((prev) => ({
        ...prev,
        gridPlayer: prev.gridMaze.start,
        polarPlayer: prev.polarMaze.startId,
        gridTrail: [prev.gridMaze.start],
        polarTrail: [prev.polarMaze.startId],
        visited: new Set([
          isCircular ? prev.polarMaze.startId : positionKey(prev.gridMaze.start),
        ]),
        gridTargets: selectDeadEndTargets(prev.gridMaze, maxCircles),
        polarTargets: selectPolarDeadEndTargets(prev.polarMaze, maxCircles),
        collected: new Set<string>(),
        steps: 0,
        elapsedSeconds: 0,
        started: false,
        won: false,
      }));
    },
    [isCircular],
  );

  const resetPosition = useCallback(() => {
    setGame((prev) => ({
      ...prev,
      gridPlayer: prev.gridMaze.start,
      polarPlayer: prev.polarMaze.startId,
      gridTrail: [prev.gridMaze.start],
      polarTrail: [prev.polarMaze.startId],
      visited: new Set([
        isCircular ? prev.polarMaze.startId : positionKey(prev.gridMaze.start),
      ]),
      collected: new Set<string>(),
      steps: 0,
      elapsedSeconds: 0,
      started: false,
      won: false,
    }));
  }, [isCircular]);

  const optimalSteps = useMemo(() => {
    if (isCircular) {
      return Math.max(
        0,
        findPolarShortestPath(game.polarMaze, game.polarMaze.startId, [
          game.polarMaze.endId,
        ]).length - 1,
      );
    }
    return Math.max(
      0,
      findShortestPath(game.gridMaze, game.gridMaze.start, game.gridMaze.end)
        .length - 1,
    );
  }, [isCircular, game.gridMaze, game.polarMaze]);

  const gridHintPath = useMemo(() => {
    if (!game.showHint || game.won || isCircular) return [];
    if (gameMode === 'classic') {
      return findShortestPath(game.gridMaze, game.gridPlayer, game.gridMaze.end);
    }
    const remaining = game.gridTargets.filter(
      (t) => !game.collected.has(positionKey(t)),
    );
    return findShortestPathToNearest(game.gridMaze, game.gridPlayer, remaining);
  }, [
    game.showHint,
    game.won,
    isCircular,
    gameMode,
    game.gridMaze,
    game.gridPlayer,
    game.gridTargets,
    game.collected,
  ]);

  const polarHintPath = useMemo(() => {
    if (!game.showHint || game.won || !isCircular) return [];
    if (gameMode === 'classic') {
      return findPolarShortestPath(game.polarMaze, game.polarPlayer, [
        game.polarMaze.endId,
      ]);
    }
    const remaining = game.polarTargets.filter((id) => !game.collected.has(id));
    return findPolarShortestPath(game.polarMaze, game.polarPlayer, remaining);
  }, [
    game.showHint,
    game.won,
    isCircular,
    gameMode,
    game.polarMaze,
    game.polarPlayer,
    game.polarTargets,
    game.collected,
  ]);

  const totalTargets = isCircular
    ? game.polarTargets.length
    : game.gridTargets.length;

  const dragAnchorRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);

  const moveByVector = useCallback(
    (dx: number, dy: number) => {
      const len = Math.hypot(dx, dy);
      if (len === 0) return;

      const prev = gameRef.current;
      if (prev.won) return;

      const nx = dx / len;
      const ny = dy / len;

      const primary: Direction =
        Math.abs(dx) >= Math.abs(dy)
          ? dx > 0
            ? 'right'
            : 'left'
          : dy > 0
            ? 'bottom'
            : 'top';

      let secondary: Direction | undefined;
      if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dy) >= Math.abs(dx) * 0.35) {
        secondary = dy > 0 ? 'bottom' : 'top';
      } else if (
        Math.abs(dy) > Math.abs(dx) &&
        Math.abs(dx) >= Math.abs(dy) * 0.35
      ) {
        secondary = dx > 0 ? 'right' : 'left';
      }

      if (isCircular) {
        const nextId = findPolarMoveInDirection(
          prev.polarMaze,
          prev.polarPlayer,
          nx,
          ny,
        );
        if (!nextId) {
          if (soundEnabled) playWallBumpSound();
          return;
        }

        const isBacktracking =
          eraseBacktrack &&
          prev.polarTrail.length >= 2 &&
          prev.polarTrail[prev.polarTrail.length - 2] === nextId;

        const nextTrail = isBacktracking
          ? prev.polarTrail.slice(0, -1)
          : [...prev.polarTrail, nextId];

        const visited = isBacktracking
          ? new Set(nextTrail)
          : new Set(prev.visited).add(nextId);

        const collected = new Set(prev.collected);
        let newlyCollected = false;
        let won = false;
        if (gameMode === 'collect') {
          if (prev.polarTargets.includes(nextId) && !collected.has(nextId)) {
            collected.add(nextId);
            newlyCollected = true;
          }
          won = collected.size >= prev.polarTargets.length;
        } else {
          won = nextId === prev.polarMaze.endId;
        }

        if (soundEnabled) {
          if (won) playWinSound();
          else if (newlyCollected) playCollectSound(collected.size);
          else playStepSound();
        }

        const nextState: GameState = {
          ...prev,
          polarPlayer: nextId,
          polarTrail: nextTrail,
          visited,
          collected,
          steps: prev.steps + 1,
          started: true,
          won,
        };
        gameRef.current = nextState;
        setGame(nextState);
        return;
      }

      const nextPos =
        gridStep(prev.gridMaze, prev.gridPlayer, primary) ??
        (secondary ? gridStep(prev.gridMaze, prev.gridPlayer, secondary) : null);

      if (!nextPos) {
        if (soundEnabled) playWallBumpSound();
        return;
      }

      const nextKey = positionKey(nextPos);

      const prevBeforeLast =
        prev.gridTrail.length >= 2
          ? prev.gridTrail[prev.gridTrail.length - 2]
          : null;
      const isBacktracking =
        eraseBacktrack &&
        prevBeforeLast !== null &&
        prevBeforeLast.row === nextPos.row &&
        prevBeforeLast.col === nextPos.col;

      const nextTrail = isBacktracking
        ? prev.gridTrail.slice(0, -1)
        : [...prev.gridTrail, nextPos];

      const visited = isBacktracking
        ? new Set(nextTrail.map(positionKey))
        : new Set(prev.visited).add(nextKey);

      const collected = new Set(prev.collected);
      let newlyCollected = false;
      let won = false;
      if (gameMode === 'collect') {
        if (
          prev.gridTargets.some((t) => positionKey(t) === nextKey) &&
          !collected.has(nextKey)
        ) {
          collected.add(nextKey);
          newlyCollected = true;
        }
        won = collected.size >= prev.gridTargets.length;
      } else {
        won =
          nextPos.row === prev.gridMaze.end.row &&
          nextPos.col === prev.gridMaze.end.col;
      }

      if (soundEnabled) {
        if (won) playWinSound();
        else if (newlyCollected) playCollectSound(collected.size);
        else playStepSound();
      }

      const nextState: GameState = {
        ...prev,
        gridPlayer: nextPos,
        gridTrail: nextTrail,
        visited,
        collected,
        steps: prev.steps + 1,
        started: true,
        won,
      };
      gameRef.current = nextState;
      setGame(nextState);
    },
    [isCircular, gameMode, soundEnabled, eraseBacktrack],
  );

  const move = useCallback(
    (dir: Direction) => {
      const { dx, dy } = DIRECTION_VECTORS[dir];
      moveByVector(dx, dy);
    },
    [moveByVector],
  );

  const handleMazePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (game.won) return;
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      event.currentTarget.setPointerCapture(event.pointerId);
      dragAnchorRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
    },
    [game.won],
  );

  const handleMazePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const anchor = dragAnchorRef.current;
      if (!anchor || anchor.pointerId !== event.pointerId) return;

      const dx = event.clientX - anchor.x;
      const dy = event.clientY - anchor.y;
      const stepThreshold = 24;

      if (Math.hypot(dx, dy) >= stepThreshold) {
        moveByVector(dx, dy);
        anchor.x = event.clientX;
        anchor.y = event.clientY;
      }
    },
    [moveByVector],
  );

  const handleMazePointerEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const anchor = dragAnchorRef.current;
      if (!anchor || anchor.pointerId !== event.pointerId) return;
      dragAnchorRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [],
  );

  useEffect(() => {
    if (!game.started || game.won) return;
    const interval = window.setInterval(() => {
      setGame((prev) => ({ ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [game.started, game.won]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const keyMap: Record<string, Direction> = {
        ArrowUp: 'top',
        ArrowDown: 'bottom',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'top',
        W: 'top',
        s: 'bottom',
        S: 'bottom',
        a: 'left',
        A: 'left',
        d: 'right',
        D: 'right',
      };

      const dir = keyMap[event.key];
      if (dir) {
        event.preventDefault();
        move(dir);
        return;
      }

      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        startNewMaze(preset, aspectRatio, mazeStyle, gameMode);
        return;
      }

      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        setFocusMode((v) => !v);
        return;
      }

      if (event.key === 'Escape' && focusMode) {
        event.preventDefault();
        setFocusMode(false);
        return;
      }

      if (game.won && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        startNewMaze(preset, aspectRatio, mazeStyle, gameMode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    move,
    preset,
    aspectRatio,
    mazeStyle,
    gameMode,
    startNewMaze,
    game.won,
    focusMode,
  ]);

  return (
    <>
      <PrintableMazeSvg
        mazeStyle={mazeStyle}
        gameMode={gameMode}
        gridMaze={game.gridMaze}
        polarMaze={game.polarMaze}
        gridTargets={game.gridTargets}
        polarTargets={game.polarTargets}
      />

      <div
        className={
          focusMode
            ? 'fixed inset-0 flex h-dvh w-screen flex-col items-center justify-center bg-slate-950 p-2 text-slate-100 sm:p-3 print:hidden'
            : 'flex min-h-screen flex-col items-center bg-slate-950 px-4 py-6 text-slate-100 print:hidden'
        }
      >
      {focusMode && (
        <div className="fixed top-3 right-3 z-20 flex items-center gap-1.5 rounded-2xl border border-slate-700/80 bg-slate-900/85 p-1.5 shadow-xl backdrop-blur-md">
          {gameMode === 'collect' && (
            <div className="flex items-center gap-1.5 rounded-xl bg-slate-800/90 px-2.5 py-1.5 text-xs font-semibold text-amber-300">
              <CircleDot className="h-3.5 w-3.5" />
              <span className="font-mono">
                {game.collected.size}/{totalTargets}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSoundEnabled((v) => !v)}
            aria-label={soundEnabled ? 'Vypnout zvuky' : 'Zapnout zvuky'}
            title={soundEnabled ? 'Vypnout zvuky' : 'Zapnout zvuky'}
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl transition ${
              soundEnabled
                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-800/60 text-slate-500 hover:bg-slate-700'
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              setGame((prev) => ({ ...prev, showHint: !prev.showHint }))
            }
            aria-label="Nápověda"
            title="Nápověda"
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl transition ${
              game.showHint
                ? 'bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/50'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Lightbulb className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() =>
              startNewMaze(preset, aspectRatio, mazeStyle, gameMode)
            }
            aria-label="Nové bludiště"
            title="Nové bludiště"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-emerald-500 text-slate-950 transition hover:bg-emerald-400"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setFocusMode(false)}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-sky-500 px-3 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 sm:text-sm"
            title="Zobrazit menu (Esc)"
          >
            <Minimize2 className="h-4 w-4" />
            Menu
          </button>
        </div>
      )}

      {!focusMode && (
        <header className="mb-5 flex w-full max-w-5xl flex-col items-center text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Generátor bludiště
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            {gameMode === 'collect'
              ? 'Od křížku ✕ ke kolečkům ◯ — posbírej všechna žlutá kolečka na koncích slepých uliček!'
              : isCircular
                ? 'Dostaň se ze středu kruhového bludiště až k zelenému východu na okraji.'
                : 'Dostaň se z levého horního rohu do zeleného cíle pomocí šipek na klávesnici.'}
          </p>
        </header>
      )}

      <main
        className={
          focusMode
            ? 'flex h-full w-full flex-col items-center justify-center'
            : 'flex w-full max-w-5xl flex-col items-center gap-4'
        }
      >
        {/* Controls */}
        {!focusMode && (
          <section className="flex w-full flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          {/* Row 1: Difficulty + Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {DIFFICULTY_PRESETS.map((item) => {
                const active = item.id === preset.id;
                const dims = getMazeDimensions(item, aspectRatio);
                const sizeText = isCircular
                  ? `${item.polarRings} kruhů`
                  : `${dims.cols}×${dims.rows}`;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      startNewMaze(item, aspectRatio, mazeStyle, gameMode)
                    }
                    className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                      active
                        ? 'bg-sky-500 text-slate-950 shadow-sm shadow-sky-500/40'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {item.label} ({sizeText})
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setGame((prev) => ({ ...prev, showHint: !prev.showHint }))
                }
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
                  game.showHint
                    ? 'bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/50'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title="Zobrazit nápovědu"
              >
                <Lightbulb className="h-4 w-4" />
                Nápověda
              </button>

              <button
                type="button"
                onClick={resetPosition}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 sm:text-sm"
                title="Vrátit se na start"
              >
                <RotateCcw className="h-4 w-4" />
                Start
              </button>

              <button
                type="button"
                onClick={() =>
                  startNewMaze(preset, aspectRatio, mazeStyle, gameMode)
                }
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 sm:text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Nové
              </button>

              <div className="mx-0.5 h-5 w-px bg-slate-800" />

              <button
                type="button"
                onClick={() => setEraseBacktrack((v) => !v)}
                aria-label="Gumování slepých uliček"
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl transition ${
                  eraseBacktrack
                    ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/50'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
                title={
                  eraseBacktrack
                    ? 'Guma zapnuta: couvání maže čáru'
                    : 'Guma vypnuta: zůstává celá čára'
                }
              >
                <Eraser className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setSoundEnabled((v) => !v)}
                aria-label={soundEnabled ? 'Vypnout zvuky' : 'Zapnout zvuky'}
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl transition ${
                  soundEnabled
                    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    : 'bg-slate-800/60 text-slate-500 hover:bg-slate-700'
                }`}
                title={soundEnabled ? 'Vypnout zvuky' : 'Zapnout zvuky'}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                aria-label="Tisk na A4"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-slate-800 text-slate-200 transition hover:bg-slate-700"
                title="Vytisknout čisté černobílé bludiště na A4"
              >
                <Printer className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setFocusMode(true)}
                aria-label="Celá obrazovka"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-slate-800 text-slate-200 transition hover:bg-slate-700"
                title="Skrýt menu a roztáhnout bludiště na celou obrazovku (F)"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Row 2: Game mode + Style + Aspect ratio */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-2.5">
            {/* Game Mode */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-400">Režim:</span>
              <button
                type="button"
                onClick={() =>
                  startNewMaze(preset, aspectRatio, mazeStyle, 'classic')
                }
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                  gameMode === 'classic'
                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/50'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Flag className="h-3.5 w-3.5" />
                Start → Cíl
              </button>
              <button
                type="button"
                onClick={() =>
                  startNewMaze(preset, aspectRatio, mazeStyle, 'collect')
                }
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                  gameMode === 'collect'
                    ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/50'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <CircleDot className="h-3.5 w-3.5" />
                Od křížku ke kolečku
              </button>
            </div>

            {/* Maze Style */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-400">Styl:</span>
              <button
                type="button"
                onClick={() =>
                  startNewMaze(preset, aspectRatio, 'classic', gameMode)
                }
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                  mazeStyle === 'classic'
                    ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/40'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Grid2X2 className="h-3.5 w-3.5" />
                Hranaté
              </button>
              <button
                type="button"
                onClick={() =>
                  startNewMaze(preset, aspectRatio, 'curved', gameMode)
                }
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                  mazeStyle === 'curved'
                    ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/40'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Spline className="h-3.5 w-3.5" />
                Křivky SVG
              </button>
              <button
                type="button"
                onClick={() =>
                  startNewMaze(preset, aspectRatio, 'circular', gameMode)
                }
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                  mazeStyle === 'circular'
                    ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/40'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Circle className="h-3.5 w-3.5" />
                Kruhové
              </button>
            </div>
          </div>

          {/* Row 3: Theme + Aspect ratio + Circle count */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Motiv:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {MAZE_THEMES.map((item) => {
                  const active = item.id === themeId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setThemeId(item.id)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                        active
                          ? 'bg-pink-500 text-white shadow-sm shadow-pink-500/40'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <ThemeIcon id={item.id} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {!isCircular && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-400">
                  Poměr stran:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {ASPECT_RATIO_PRESETS.map((item) => {
                    const active = item.id === aspectRatio.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          startNewMaze(preset, item, mazeStyle, gameMode)
                        }
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                          active
                            ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/40'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        <AspectIcon id={item.id} />
                        {item.label} ({item.ratioText})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {gameMode === 'collect' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-400">
                  Počet koleček:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {CIRCLE_COUNT_OPTIONS.map((item) => {
                    const active = item.value === circleOption;
                    return (
                      <button
                        key={String(item.value)}
                        type="button"
                        onClick={() => handleCircleOptionChange(item.value)}
                        className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                          active
                            ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/40'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          </section>
        )}

        {/* Stats */}
        {!focusMode && (
          <section className="grid w-full max-w-[600px] grid-cols-3 gap-3">
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
            <Clock className="h-4 w-4 text-sky-400" />
            <span className="text-xs text-slate-400">Čas</span>
            <span className="font-mono text-sm font-semibold text-white">
              {formatTime(game.elapsedSeconds)}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
            <Footprints className="h-4 w-4 text-sky-400" />
            <span className="text-xs text-slate-400">Kroky</span>
            <span className="font-mono text-sm font-semibold text-white">
              {game.steps}
            </span>
          </div>

          {gameMode === 'collect' ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
              <CircleDot className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-slate-400">Kolečka</span>
              <span className="font-mono text-sm font-semibold text-white">
                {game.collected.size} / {totalTargets}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
              <Trophy className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-slate-400">Optimum</span>
              <span className="font-mono text-sm font-semibold text-white">
                {optimalSteps}
              </span>
            </div>
          )}
          </section>
        )}

        {/* Maze area */}
        <div
          onPointerDown={handleMazePointerDown}
          onPointerMove={handleMazePointerMove}
          onPointerUp={handleMazePointerEnd}
          onPointerCancel={handleMazePointerEnd}
          className={
            focusMode
              ? 'relative flex h-full w-full touch-none select-none justify-center cursor-grab active:cursor-grabbing'
              : 'relative flex w-full touch-none select-none justify-center cursor-grab active:cursor-grabbing'
          }
        >
          {mazeStyle === 'classic' && (
            <MazeCanvas
              maze={game.gridMaze}
              player={game.gridPlayer}
              visited={game.visited}
              trail={game.gridTrail}
              hintPath={gridHintPath}
              aspectRatioId={aspectRatio.id}
              gameMode={gameMode}
              targets={game.gridTargets}
              collected={game.collected}
              theme={theme}
              fullScreen={focusMode}
            />
          )}

          {mazeStyle === 'curved' && (
            <CurvedMazeSvg
              maze={game.gridMaze}
              player={game.gridPlayer}
              trail={game.gridTrail}
              hintPath={gridHintPath}
              aspectRatioId={aspectRatio.id}
              gameMode={gameMode}
              targets={game.gridTargets}
              collected={game.collected}
              theme={theme}
              fullScreen={focusMode}
            />
          )}

          {mazeStyle === 'circular' && (
            <CircularMazeSvg
              maze={game.polarMaze}
              playerId={game.polarPlayer}
              visited={game.visited}
              trail={game.polarTrail}
              hintPath={polarHintPath}
              gameMode={gameMode}
              targets={game.polarTargets}
              collected={game.collected}
              theme={theme}
              fullScreen={focusMode}
            />
          )}

          {game.won && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950/75 backdrop-blur-sm">
              <div className="mx-4 flex max-w-xs flex-col items-center rounded-2xl border border-emerald-500/40 bg-slate-900 p-6 text-center shadow-2xl">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <Trophy className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {gameMode === 'collect'
                    ? 'Všechna kolečka posbírána!'
                    : 'Bludiště vyřešeno!'}
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Čas:{' '}
                  <strong className="text-white">
                    {formatTime(game.elapsedSeconds)}
                  </strong>{' '}
                  · Kroky: <strong className="text-white">{game.steps}</strong>
                  {gameMode === 'classic'
                    ? ` (optimum ${optimalSteps})`
                    : ` · Kolečka: ${totalTargets}/${totalTargets}`}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    startNewMaze(preset, aspectRatio, mazeStyle, gameMode)
                  }
                  className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  <RefreshCw className="h-4 w-4" />
                  Nové bludiště
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Touch / Mouse D-pad + keyboard help */}
        {!focusMode && (
          <section className="flex flex-col items-center gap-3 pt-1">
          <div className="grid touch-none grid-cols-3 gap-1.5">
            <div />
            <button
              type="button"
              aria-label="Nahoru"
              onClick={() => move('top')}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-slate-700 bg-slate-800/90 text-slate-200 transition hover:bg-slate-700 active:scale-95"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
            <div />
            <button
              type="button"
              aria-label="Doleva"
              onClick={() => move('left')}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-slate-700 bg-slate-800/90 text-slate-200 transition hover:bg-slate-700 active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Dolů"
              onClick={() => move('bottom')}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-slate-700 bg-slate-800/90 text-slate-200 transition hover:bg-slate-700 active:scale-95"
            >
              <ArrowDown className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Doprava"
              onClick={() => move('right')}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-slate-700 bg-slate-800/90 text-slate-200 transition hover:bg-slate-700 active:scale-95"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          <p className="text-center text-xs text-slate-500">
            Ovládání:{' '}
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
              ↑ ↓ ← →
            </kbd>
            ,{' '}
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
              WASD
            </kbd>{' '}
            nebo <span className="text-slate-300">tažení prstem po bludišti</span> ·{' '}
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
              R
            </kbd>{' '}
            nové bludiště ·{' '}
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
              F
            </kbd>{' '}
            celá obrazovka
          </p>
          </section>
        )}
      </main>
      </div>
    </>
  );
}
