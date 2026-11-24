import { Compass, RotateCw } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { gridGeometry, polarGeometry } from '../game/geometry';
import { useDragMove } from '../game/input';
import {
  createMarbleAt,
  stepMarblePhysics,
  type MarbleBody,
} from '../game/marble';
import type { GameState, Round } from '../game/model';
import { hintPath, phase, playerOf, visitedKeys } from '../game/reduce';
import { useTiltInput } from '../game/tilt';
import type { Dispatch } from '../game/useGame';
import {
  playMarbleBumpSound,
  setMarbleRollingSpeed,
  stopMarbleRollingSound,
} from '../maze/sound';
import { getThemeById } from '../maze/themes';
import { CircularMazeSvg } from './CircularMazeSvg';
import { CurvedMazeSvg } from './CurvedMazeSvg';
import { MazeCanvas } from './MazeCanvas';
import { WinOverlay } from './WinOverlay';

interface ViewProps<R> {
  round: R;
  state: GameState;
  fullScreen: boolean;
}

export function MazeStage({
  state,
  dispatch,
  fullScreen,
}: {
  state: GameState;
  dispatch: Dispatch;
  fullScreen: boolean;
}) {
  const won = phase(state) === 'won';
  const { marbleMode, sound, style } = state.settings;
  const drag = useDragMove(dispatch, won);
  const { round } = state;

  const { tiltRef, permission, hasGyro, requestPermission, calibrate } =
    useTiltInput(marbleMode && !won);

  const initialGridPos =
    round.kind === 'grid' ? playerOf(round.run) : { row: 0, col: 0 };
  const marbleRef = useRef<MarbleBody>(createMarbleAt(initialGridPos));
  const [curvedMarblePos, setCurvedMarblePos] = useState<{
    x: number;
    y: number;
    level?: 'over' | 'under';
  } | null>(null);

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
        if (style === 'curved') {
          setCurvedMarblePos({
            x: marbleRef.current.x,
            y: marbleRef.current.y,
            level: marbleRef.current.level,
          });
        }
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
    let polarAccumulator = 0;

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

        if (style === 'curved') {
          setCurvedMarblePos({
            x: result.body.x,
            y: result.body.y,
            level: result.body.level,
          });
        }

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
      } else {
        // Polar maze: smooth tilt-driven stepping
        const mag = Math.hypot(tilt.gx, tilt.gy);
        if (sound) {
          setMarbleRollingSpeed(mag > 0.12 ? Math.min(1, mag * 0.9) : 0);
        } else {
          setMarbleRollingSpeed(0);
        }

        if (mag > 0.16) {
          polarAccumulator += dt * (2.5 + mag * 5.5);
          if (polarAccumulator >= 1) {
            polarAccumulator -= 1;
            dispatch({ type: 'move', dx: tilt.gx, dy: tilt.gy });
          }
        } else {
          polarAccumulator = Math.max(0, polarAccumulator - dt * 4);
        }
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(rafId);
      stopMarbleRollingSound();
    };
  }, [marbleMode, won, round.kind, round.board, sound, style, dispatch, tiltRef]);

  return (
    <div
      {...drag}
      className={
        fullScreen
          ? 'relative flex h-full w-full touch-none select-none justify-center cursor-grab active:cursor-grabbing'
          : 'relative flex w-full touch-none select-none justify-center cursor-grab active:cursor-grabbing'
      }
    >
      {marbleMode && !won && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 shadow-xl backdrop-blur-md"
        >
          {permission === 'prompt' ? (
            <button
              type="button"
              onClick={() => void requestPermission()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-1 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              <Compass className="h-3.5 w-3.5" />
              Povolit náklon tabletu
            </button>
          ) : (
            <>
              <span className="text-slate-300">
                {hasGyro
                  ? 'Nakláněj tablet pro kutálení kuličky'
                  : 'Nakláněj tablet (nebo drž šipky / WASD)'}
              </span>
              {hasGyro && (
                <button
                  type="button"
                  onClick={calibrate}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-xs font-medium text-sky-300 transition hover:bg-slate-700"
                  title="Nastavit aktuální náklon tabletu jako rovinu"
                >
                  <RotateCw className="h-3 w-3" />
                  Vyrovnat
                </button>
              )}
            </>
          )}
        </div>
      )}

      {round.kind === 'grid' ? (
        <GridView
          round={round}
          state={state}
          fullScreen={fullScreen}
          marbleRef={marbleRef}
          curvedMarblePos={curvedMarblePos}
        />
      ) : (
        <PolarView round={round} state={state} fullScreen={fullScreen} />
      )}
      {won && <WinOverlay state={state} dispatch={dispatch} />}
    </div>
  );
}

function GridView({
  round,
  state,
  fullScreen,
  marbleRef,
  curvedMarblePos,
}: ViewProps<Extract<Round, { kind: 'grid' }>> & {
  marbleRef: MutableRefObject<MarbleBody>;
  curvedMarblePos: { x: number; y: number; level?: 'over' | 'under' } | null;
}) {
  const { mode, style, aspectRatioId, themeId, marbleMode } = state.settings;
  const visited = useMemo(
    () => visitedKeys(gridGeometry, round.run),
    [round.run],
  );
  const hint = useMemo(
    () => hintPath(gridGeometry, round, mode, state.showHint),
    [round, mode, state.showHint],
  );
  const props = {
    maze: round.board.maze,
    player: playerOf(round.run),
    trail: round.run.trail,
    hintPath: hint,
    aspectRatioId,
    gameMode: mode,
    targets: round.board.targets,
    collected: round.run.collected,
    theme: getThemeById(themeId),
    marbleMode,
    fullScreen,
  };
  return style === 'curved' ? (
    <CurvedMazeSvg {...props} marblePos={curvedMarblePos} />
  ) : (
    <MazeCanvas {...props} visited={visited} marbleRef={marbleRef} />
  );
}

function PolarView({
  round,
  state,
  fullScreen,
}: ViewProps<Extract<Round, { kind: 'polar' }>>) {
  const { mode, themeId, marbleMode } = state.settings;
  const visited = useMemo(
    () => visitedKeys(polarGeometry, round.run),
    [round.run],
  );
  const hint = useMemo(
    () => hintPath(polarGeometry, round, mode, state.showHint),
    [round, mode, state.showHint],
  );
  return (
    <CircularMazeSvg
      maze={round.board.maze}
      playerId={playerOf(round.run)}
      visited={visited}
      trail={round.run.trail}
      hintPath={hint}
      gameMode={mode}
      targets={round.board.targets}
      collected={round.run.collected}
      theme={getThemeById(themeId)}
      marbleMode={marbleMode}
      fullScreen={fullScreen}
    />
  );
}
