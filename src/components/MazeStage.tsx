import { useMemo } from 'react';
import { gridGeometry, polarGeometry } from '../game/geometry';
import { useDragMove } from '../game/input';
import type { GameState, Round } from '../game/model';
import { hintPath, phase, playerOf, visitedKeys } from '../game/reduce';
import type { Dispatch } from '../game/useGame';
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
  const drag = useDragMove(dispatch, won);
  const { round } = state;

  return (
    <div
      {...drag}
      className={
        fullScreen
          ? 'relative flex h-full w-full touch-none select-none justify-center cursor-grab active:cursor-grabbing'
          : 'relative flex w-full touch-none select-none justify-center cursor-grab active:cursor-grabbing'
      }
    >
      {round.kind === 'grid' ? (
        <GridView round={round} state={state} fullScreen={fullScreen} />
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
}: ViewProps<Extract<Round, { kind: 'grid' }>>) {
  const { mode, style, aspectRatioId, themeId } = state.settings;
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
    fullScreen,
  };
  return style === 'curved' ? (
    <CurvedMazeSvg {...props} />
  ) : (
    <MazeCanvas {...props} visited={visited} />
  );
}

function PolarView({
  round,
  state,
  fullScreen,
}: ViewProps<Extract<Round, { kind: 'polar' }>>) {
  const { mode, themeId } = state.settings;
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
      fullScreen={fullScreen}
    />
  );
}
