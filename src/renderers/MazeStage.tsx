import { Compass, RotateCw } from 'lucide-react';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from 'react';
import { gridGeometry, polarGeometry } from '../game/geometry';
import { useDragMove } from '../game/input';
import {
  createMarbleAt,
  createPolarMarbleAt,
  stepMarblePhysics,
  stepPolarMarblePhysics,
  type MarbleBody,
  type PolarMarbleBody,
} from '../game/marble';
import type { Round, Settings } from '../game/model';
import type { Position } from '../maze/types';
import { hintPath, playerOf, visitedKeys } from '../game/reduce';
import { useTiltInput } from '../game/tilt';
import type { Dispatch } from '../game/useGame';
import {
  playMarbleBumpSound,
  setMarbleRollingSpeed,
  stopMarbleRollingSound,
  unlockAudio,
} from '../audio/sound';
import { getMessages } from '../i18n';
import { getThemeById } from '../themes/catalog';
import { WinOverlay } from '../ui/WinOverlay';
import { CircularMaze } from './CircularMaze';
import { CurvedMaze } from './CurvedMaze';
import { RectMaze } from './RectMaze';

interface ViewProps<R> {
  round: R;
  settings: Settings;
  showHint: boolean;
  won: boolean;
  fullScreen: boolean;
}

const EMPTY_VISITED = new Set<string>();
const EMPTY_GRID_TRAIL: Position[] = [];
const EMPTY_POLAR_TRAIL: string[] = [];

export const MazeStage = memo(function MazeStage({
  settings,
  round,
  showHint,
  won,
  winElapsedSeconds,
  dispatch,
  fullScreen,
}: {
  settings: Settings;
  round: Round;
  showHint: boolean;
  won: boolean;
  winElapsedSeconds: number;
  dispatch: Dispatch;
  fullScreen: boolean;
}) {
  const { marbleMode, sound, language } = settings;
  const t = getMessages(language);
  const drag = useDragMove(dispatch, won || marbleMode);

  const { tiltRef, permission, hasGyro, requestPermission, calibrate } =
    useTiltInput(marbleMode && !won);

  const initialGridPos =
    round.kind === 'grid' ? playerOf(round.run) : { row: 0, col: 0 };
  const marbleRef = useRef<MarbleBody>(createMarbleAt(initialGridPos));
  const polarMarbleRef = useRef<PolarMarbleBody | null>(
    round.kind === 'polar'
      ? createPolarMarbleAt(round.board.maze, playerOf(round.run))
      : null,
  );
  const stageDrawRef = useRef<(() => void) | null>(null);
  const registerStageDraw = useCallback((fn: (() => void) | null) => {
    stageDrawRef.current = fn;
  }, []);

  // Sync marble position when starting a new maze, restarting, or toggling marble mode
  const roundBoard = round.board;
  const runSteps = round.run.steps;
  useEffect(() => {
    if (round.kind === 'grid') {
      const pos = playerOf(round.run);
      if (
        runSteps === 0 ||
        !marbleMode ||
        marbleRef.current.row !== pos.row ||
        marbleRef.current.col !== pos.col
      ) {
        marbleRef.current = createMarbleAt(pos);
        stageDrawRef.current?.();
      }
    } else {
      const cellId = playerOf(round.run);
      if (
        runSteps === 0 ||
        !marbleMode ||
        !polarMarbleRef.current ||
        polarMarbleRef.current.cellId !== cellId
      ) {
        polarMarbleRef.current = createPolarMarbleAt(round.board.maze, cellId);
        stageDrawRef.current?.();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundBoard, runSteps === 0, marbleMode]);

  // Continuous physics & rolling sound loop when Marble mode is active
  useEffect(() => {
    if (!marbleMode || won) {
      stopMarbleRollingSound();
      return;
    }

    let rafId = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const tilt = tiltRef.current;

      if (round.kind === 'grid') {
        const result = stepMarblePhysics(
          round.board.maze,
          marbleRef.current,
          tilt,
          dt,
        );
        marbleRef.current = result.body;

        if (sound) {
          setMarbleRollingSpeed(result.speedNormalized);
          if (result.bumpIntensity > 0) {
            playMarbleBumpSound(result.bumpIntensity);
          }
        } else {
          setMarbleRollingSpeed(0);
        }

        for (const step of result.enteredCells) {
          dispatch({ type: 'move', dx: step.dx, dy: step.dy });
        }

        if (result.enteredCells.length === 0) {
          stageDrawRef.current?.();
        }
      } else {
        const current =
          polarMarbleRef.current ??
          createPolarMarbleAt(round.board.maze, playerOf(round.run));
        const result = stepPolarMarblePhysics(
          round.board.maze,
          current,
          tilt,
          dt,
        );
        polarMarbleRef.current = result.body;

        if (sound) {
          setMarbleRollingSpeed(result.speedNormalized);
          if (result.bumpIntensity > 0) {
            playMarbleBumpSound(result.bumpIntensity);
          }
        } else {
          setMarbleRollingSpeed(0);
        }

        for (const step of result.enteredCells) {
          dispatch({ type: 'move', dx: step.dx, dy: step.dy });
        }

        if (result.enteredCells.length === 0) {
          stageDrawRef.current?.();
        }
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(rafId);
      stopMarbleRollingSound();
    };
  }, [marbleMode, won, round.kind, round.board, sound, dispatch, tiltRef]);

  return (
    <div
      {...drag}
      className={
        fullScreen
          ? `relative flex h-full w-full touch-none select-none justify-center ${marbleMode ? '' : 'cursor-grab active:cursor-grabbing'}`
          : `relative flex w-full touch-none select-none justify-center ${marbleMode ? '' : 'cursor-grab active:cursor-grabbing'}`
      }
    >
      {marbleMode && !won && permission !== 'unsupported' && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-900/95 px-3 py-1.5 text-xs text-slate-200 shadow-xl pointer-fine:bg-slate-900/90 pointer-fine:backdrop-blur-md"
        >
          {permission === 'prompt' ? (
            <button
              type="button"
              onClick={() => {
                unlockAudio();
                void requestPermission();
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-1 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              <Compass className="h-3.5 w-3.5" />
              {t.tiltEnable}
            </button>
          ) : permission === 'denied' ? (
            <span className="text-amber-300">{t.tiltDenied}</span>
          ) : (
            <>
              <span className="text-slate-300">
                {hasGyro ? t.tiltHintGyro : t.tiltHintFallback}
              </span>
              {hasGyro && (
                <button
                  type="button"
                  onClick={calibrate}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-xs font-medium text-sky-300 transition hover:bg-slate-700"
                  title={t.tiltCalibrateTitle}
                >
                  <RotateCw className="h-3 w-3" />
                  {t.tiltCalibrate}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {round.kind === 'grid' ? (
        <GridView
          round={round}
          settings={settings}
          showHint={showHint}
          won={won}
          fullScreen={fullScreen}
          marbleRef={marbleRef}
          registerDraw={registerStageDraw}
        />
      ) : (
        <PolarView
          round={round}
          settings={settings}
          showHint={showHint}
          won={won}
          fullScreen={fullScreen}
          polarMarbleRef={polarMarbleRef}
          registerDraw={registerStageDraw}
        />
      )}
      {won && (
        <WinOverlay
          settings={settings}
          round={round}
          elapsedSeconds={winElapsedSeconds}
          dispatch={dispatch}
        />
      )}
    </div>
  );
});

function GridView({
  round,
  settings,
  showHint,
  won,
  fullScreen,
  marbleRef,
  registerDraw,
}: ViewProps<Extract<Round, { kind: 'grid' }>> & {
  marbleRef: MutableRefObject<MarbleBody>;
  registerDraw: (fn: (() => void) | null) => void;
}) {
  const {
    mode,
    style,
    aspectRatioId,
    themeId,
    marbleMode,
    fogOfWar,
    showTrail,
  } = settings;
  const fogActive = fogOfWar && !won;
  const visited = useMemo(
    () => (showTrail ? visitedKeys(gridGeometry, round.run) : EMPTY_VISITED),
    [round.run, showTrail],
  );
  const hint = useMemo(
    () => hintPath(gridGeometry, round, mode, showHint),
    [round, mode, showHint],
  );
  const props = {
    maze: round.board.maze,
    player: playerOf(round.run),
    trail: showTrail ? round.run.trail : EMPTY_GRID_TRAIL,
    explored: round.run.explored,
    hintPath: hint,
    aspectRatioId,
    gameMode: mode,
    targets: round.board.targets,
    collected: round.run.collected,
    theme: getThemeById(themeId),
    marbleMode,
    marbleRef,
    registerDraw,
    fogOfWar: fogActive,
    fullScreen,
  };
  return style === 'curved' ? (
    <CurvedMaze {...props} />
  ) : (
    <RectMaze {...props} visited={visited} />
  );
}

function PolarView({
  round,
  settings,
  showHint,
  won,
  fullScreen,
  polarMarbleRef,
  registerDraw,
}: ViewProps<Extract<Round, { kind: 'polar' }>> & {
  polarMarbleRef: MutableRefObject<PolarMarbleBody | null>;
  registerDraw: (fn: (() => void) | null) => void;
}) {
  const { mode, themeId, marbleMode, fogOfWar, showTrail } = settings;
  const fogActive = fogOfWar && !won;
  const visited = useMemo(
    () => (showTrail ? visitedKeys(polarGeometry, round.run) : EMPTY_VISITED),
    [round.run, showTrail],
  );
  const hint = useMemo(
    () => hintPath(polarGeometry, round, mode, showHint),
    [round, mode, showHint],
  );
  return (
    <CircularMaze
      maze={round.board.maze}
      playerId={playerOf(round.run)}
      visited={visited}
      explored={round.run.explored}
      trail={showTrail ? round.run.trail : EMPTY_POLAR_TRAIL}
      hintPath={hint}
      gameMode={mode}
      targets={round.board.targets}
      collected={round.run.collected}
      theme={getThemeById(themeId)}
      marbleMode={marbleMode}
      marbleRef={polarMarbleRef}
      registerDraw={registerDraw}
      fogOfWar={fogActive}
      fullScreen={fullScreen}
    />
  );
}
