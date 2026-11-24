import { Circle, Grid2X2, Spline, type LucideIcon } from 'lucide-react';
import type { MazeStyle } from '../maze/types';
import type { Round } from './model';

export interface MazeStyleInfo {
  label: string;
  Icon: LucideIcon;
  subtitle: string;
  usesAspectRatio: boolean;
  geometry: Round['kind'];
}

const GRID_SUBTITLE =
  'Dostaň se z levého horního rohu do zeleného cíle pomocí šipek na klávesnici.';

export const MAZE_STYLES: Record<MazeStyle, MazeStyleInfo> = {
  classic: {
    label: 'Hranaté',
    Icon: Grid2X2,
    subtitle: GRID_SUBTITLE,
    usesAspectRatio: true,
    geometry: 'grid',
  },
  curved: {
    label: 'Křivky SVG',
    Icon: Spline,
    subtitle: GRID_SUBTITLE,
    usesAspectRatio: true,
    geometry: 'grid',
  },
  circular: {
    label: 'Kruhové',
    Icon: Circle,
    subtitle:
      'Dostaň se ze středu kruhového bludiště až k zelenému východu na okraji.',
    usesAspectRatio: false,
    geometry: 'polar',
  },
};
