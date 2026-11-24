export type Direction = 'top' | 'right' | 'bottom' | 'left';

export type Axis = 'horizontal' | 'vertical';

export type Level = 'over' | 'under';

export interface Position {
  row: number;
  col: number;
  level?: Level;
}

export interface Cell {
  row: number;
  col: number;
  walls: Record<Direction, boolean>;
  bridge?: Axis;
}

export interface Maze {
  rows: number;
  cols: number;
  grid: Cell[][];
  start: Position;
  end: Position;
}

export type GameMode = 'classic' | 'collect';

export type MazeStyle = 'classic' | 'curved' | 'circular';

export type MazeAlgorithm = 'backtracker' | 'prim' | 'kruskal';

export interface MazeAlgorithmPreset {
  id: MazeAlgorithm;
  label: string;
}

export const MAZE_ALGORITHMS: readonly MazeAlgorithmPreset[] = [
  { id: 'backtracker', label: 'Klikaté' },
  { id: 'prim', label: 'Větvené' },
  { id: 'kruskal', label: 'Rovnoměrné' },
];

export interface MazeGenerateOptions {
  bridges?: boolean;
  bridgeCount?: number;
  algorithm?: MazeAlgorithm;
  braided?: boolean;
}

export type AspectRatioId = 'square' | 'tablet' | 'widescreen';

export interface AspectRatioPreset {
  id: AspectRatioId;
  label: string;
  ratioText: string;
  ratio: number;
}

export const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  { id: 'square', label: 'Čtverec', ratioText: '1:1', ratio: 1 },
  { id: 'tablet', label: 'Tablet', ratioText: '4:3', ratio: 4 / 3 },
  { id: 'widescreen', label: 'Širokoúhlé', ratioText: '16:9', ratio: 16 / 9 },
];

export interface DifficultyPreset {
  id: string;
  label: string;
  baseSize: number;
  polarRings: number;
  circleCount: number;
  bridgeCount: number;
}

export const DIFFICULTY_PRESETS: DifficultyPreset[] = [
  { id: 'small', label: 'Malé', baseSize: 11, polarRings: 5, circleCount: 5, bridgeCount: 3 },
  { id: 'medium', label: 'Střední', baseSize: 19, polarRings: 7, circleCount: 7, bridgeCount: 5 },
  { id: 'large', label: 'Velké', baseSize: 29, polarRings: 10, circleCount: 10, bridgeCount: 7 },
  { id: 'huge', label: 'Obří', baseSize: 39, polarRings: 13, circleCount: 12, bridgeCount: 10 },
];

export function getMazeDimensions(
  difficulty: DifficultyPreset,
  aspectRatio: AspectRatioPreset,
): { rows: number; cols: number } {
  if (aspectRatio.ratio === 1) {
    return { rows: difficulty.baseSize, cols: difficulty.baseSize };
  }

  const area = difficulty.baseSize * difficulty.baseSize;
  const rows = Math.max(5, Math.round(Math.sqrt(area / aspectRatio.ratio)));
  const cols = Math.max(5, Math.round(rows * aspectRatio.ratio));
  return { rows, cols };
}
