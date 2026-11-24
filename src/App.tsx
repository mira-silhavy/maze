import { useMemo, useState } from 'react';
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
import { gridGeometry, polarGeometry } from './game/geometry';
import { DIRECTION_VECTORS, useDragMove, useKeyboard } from './game/input';
import type { TargetCount } from './game/model';
import { hintPath, phase, playerOf, visitedKeys } from './game/reduce';
import { useGame } from './game/useGame';
import { getThemeById, MAZE_THEMES, type ThemeId } from './maze/themes';
import {
  ASPECT_RATIO_PRESETS,
  DIFFICULTY_PRESETS,
  getMazeDimensions,
  type AspectRatioId,
  type Direction,
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

const CIRCLE_COUNT_OPTIONS: ReadonlyArray<{
  value: TargetCount;
  label: string;
}> = [
  { value: 3, label: '3' },
  { value: 5, label: '5' },
  { value: 7, label: '7' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
  { value: 'all', label: 'Vše' },
];

export default function App() {
  const { state, dispatch } = useGame();
  const [focusMode, setFocusMode] = useState(false);
  const { settings, round, showHint, elapsedSeconds } = state;
  const won = phase(state) === 'won';
  useKeyboard(dispatch, won, focusMode, setFocusMode);
  const drag = useDragMove(dispatch, won);

  const gameMode = settings.mode;
  const mazeStyle = settings.style;
  const soundEnabled = settings.sound;
  const eraseBacktrack = settings.eraseBacktrack;
  const aspectRatio = ASPECT_RATIO_PRESETS.find(
    (a) => a.id === settings.aspectRatioId,
  )!;
  const isCircular = round.kind === 'polar';
  const theme = useMemo(() => getThemeById(settings.themeId), [settings.themeId]);
  const optimalSteps = round.board.optimalSteps;
  const totalTargets = round.board.targets.length;
  const collected = round.run.collected;
  const steps = round.run.steps;

  const gridRound = round.kind === 'grid' ? round : null;
  const polarRound = round.kind === 'polar' ? round : null;
  const visited = useMemo(
    () =>
      round.kind === 'grid'
        ? visitedKeys(gridGeometry, round.run)
        : visitedKeys(polarGeometry, round.run),
    [round],
  );
  const gridHintPath = useMemo(
    () =>
      gridRound ? hintPath(gridGeometry, gridRound, gameMode, showHint) : [],
    [gridRound, gameMode, showHint],
  );
  const polarHintPath = useMemo(
    () =>
      polarRound
        ? hintPath(polarGeometry, polarRound, gameMode, showHint)
        : [],
    [polarRound, gameMode, showHint],
  );

  const move = (dir: Direction) =>
    dispatch({ type: 'move', ...DIRECTION_VECTORS[dir] });
  const newMaze = () => dispatch({ type: 'newMaze' });
  const toggleHint = () => dispatch({ type: 'toggleHint' });

  return (
    <>
      <PrintableMazeSvg settings={settings} round={round} />

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
                {collected.size}/{totalTargets}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              dispatch({ type: 'configure', patch: { sound: !soundEnabled } })
            }
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
            onClick={toggleHint}
            aria-label="Nápověda"
            title="Nápověda"
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl transition ${
              showHint
                ? 'bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/50'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Lightbulb className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={newMaze}
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
                const active = item.id === settings.difficultyId;
                const dims = getMazeDimensions(item, aspectRatio);
                const sizeText = isCircular
                  ? `${item.polarRings} kruhů`
                  : `${dims.cols}×${dims.rows}`;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: 'configure',
                        patch: { difficultyId: item.id },
                      })
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
                onClick={toggleHint}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
                  showHint
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
                onClick={() => dispatch({ type: 'restart' })}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 sm:text-sm"
                title="Vrátit se na start"
              >
                <RotateCcw className="h-4 w-4" />
                Start
              </button>

              <button
                type="button"
                onClick={newMaze}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 sm:text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Nové
              </button>

              <div className="mx-0.5 h-5 w-px bg-slate-800" />

              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: 'configure',
                    patch: { eraseBacktrack: !eraseBacktrack },
                  })
                }
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
                onClick={() =>
                  dispatch({ type: 'configure', patch: { sound: !soundEnabled } })
                }
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
                  dispatch({ type: 'configure', patch: { mode: 'classic' } })
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
                  dispatch({ type: 'configure', patch: { mode: 'collect' } })
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
                  dispatch({ type: 'configure', patch: { style: 'classic' } })
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
                  dispatch({ type: 'configure', patch: { style: 'curved' } })
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
                  dispatch({ type: 'configure', patch: { style: 'circular' } })
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
                  const active = item.id === settings.themeId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: 'configure',
                          patch: { themeId: item.id },
                        })
                      }
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
                          dispatch({
                            type: 'configure',
                            patch: { aspectRatioId: item.id },
                          })
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
                    const active = item.value === settings.targetCount;
                    return (
                      <button
                        key={String(item.value)}
                        type="button"
                        onClick={() =>
                          dispatch({
                            type: 'configure',
                            patch: { targetCount: item.value },
                          })
                        }
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
              {formatTime(elapsedSeconds)}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
            <Footprints className="h-4 w-4 text-sky-400" />
            <span className="text-xs text-slate-400">Kroky</span>
            <span className="font-mono text-sm font-semibold text-white">
              {steps}
            </span>
          </div>

          {gameMode === 'collect' ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
              <CircleDot className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-slate-400">Kolečka</span>
              <span className="font-mono text-sm font-semibold text-white">
                {collected.size} / {totalTargets}
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
          {...drag}
          className={
            focusMode
              ? 'relative flex h-full w-full touch-none select-none justify-center cursor-grab active:cursor-grabbing'
              : 'relative flex w-full touch-none select-none justify-center cursor-grab active:cursor-grabbing'
          }
        >
          {mazeStyle === 'classic' && gridRound && (
            <MazeCanvas
              maze={gridRound.board.maze}
              player={playerOf(gridRound.run)}
              visited={visited}
              trail={gridRound.run.trail}
              hintPath={gridHintPath}
              aspectRatioId={aspectRatio.id}
              gameMode={gameMode}
              targets={gridRound.board.targets}
              collected={collected}
              theme={theme}
              fullScreen={focusMode}
            />
          )}

          {mazeStyle === 'curved' && gridRound && (
            <CurvedMazeSvg
              maze={gridRound.board.maze}
              player={playerOf(gridRound.run)}
              trail={gridRound.run.trail}
              hintPath={gridHintPath}
              aspectRatioId={aspectRatio.id}
              gameMode={gameMode}
              targets={gridRound.board.targets}
              collected={collected}
              theme={theme}
              fullScreen={focusMode}
            />
          )}

          {mazeStyle === 'circular' && polarRound && (
            <CircularMazeSvg
              maze={polarRound.board.maze}
              playerId={playerOf(polarRound.run)}
              visited={visited}
              trail={polarRound.run.trail}
              hintPath={polarHintPath}
              gameMode={gameMode}
              targets={polarRound.board.targets}
              collected={collected}
              theme={theme}
              fullScreen={focusMode}
            />
          )}

          {won && (
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
                    {formatTime(elapsedSeconds)}
                  </strong>{' '}
                  · Kroky: <strong className="text-white">{steps}</strong>
                  {gameMode === 'classic'
                    ? ` (optimum ${optimalSteps})`
                    : ` · Kolečka: ${totalTargets}/${totalTargets}`}
                </p>
                <button
                  type="button"
                  onClick={newMaze}
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
