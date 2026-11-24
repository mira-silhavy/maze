import type { PolarMaze } from '../maze/polar';
import type { ThemeId } from '../maze/themes';
import type {
  AspectRatioId,
  GameMode,
  Maze,
  MazeStyle,
  Position,
} from '../maze/types';

export type TargetCount = number | 'all';

export interface Settings {
  difficultyId: string;
  aspectRatioId: AspectRatioId;
  mode: GameMode;
  style: MazeStyle;
  themeId: ThemeId;
  targetCount: TargetCount;
  sound: boolean;
  eraseBacktrack: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  difficultyId: 'medium',
  aspectRatioId: 'square',
  mode: 'classic',
  style: 'classic',
  themeId: 'space',
  targetCount: 7,
  sound: true,
  eraseBacktrack: true,
};

export type SettingEffect = 'regenerate' | 'retarget' | 'none';

/**
 * Applied when the patch names the key, even with the current value:
 * re-clicking the active difficulty deals a new maze.
 */
export const SETTING_EFFECT: Record<keyof Settings, SettingEffect> = {
  difficultyId: 'regenerate',
  aspectRatioId: 'regenerate',
  mode: 'regenerate',
  style: 'regenerate',
  targetCount: 'retarget',
  themeId: 'none',
  sound: 'none',
  eraseBacktrack: 'none',
};

export interface Board<M, N> {
  maze: M;
  targets: N[];
  optimalSteps: number;
}

/** The player is the last trail node; visited is the set of trail keys. */
export interface Run<N> {
  trail: [N, ...N[]];
  collected: Set<string>;
  steps: number;
}

export interface RoundOf<M, N> {
  board: Board<M, N>;
  run: Run<N>;
}

export type Round =
  | ({ kind: 'grid' } & RoundOf<Maze, Position>)
  | ({ kind: 'polar' } & RoundOf<PolarMaze, string>);

export interface GameState {
  settings: Settings;
  round: Round;
  showHint: boolean;
  elapsedSeconds: number;
}

export type Phase = 'ready' | 'playing' | 'won';

export interface Vector {
  dx: number;
  dy: number;
}

export type Command =
  | ({ type: 'move' } & Vector)
  | { type: 'restart' }
  | { type: 'newMaze' }
  | { type: 'configure'; patch: Partial<Settings> }
  | { type: 'toggleHint' }
  | { type: 'tick' };

export type GameEvent =
  | { type: 'bump' }
  | { type: 'step' }
  | { type: 'collect'; collectedCount: number }
  | { type: 'win' };

export interface Transition {
  state: GameState;
  events: GameEvent[];
}
