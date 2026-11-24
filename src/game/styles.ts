import { Circle, Grid2X2, Spline, type LucideIcon } from 'lucide-react';
import type { MazeStyle } from '../maze/types';
import type { Round } from './model';

export interface MazeStyleInfo {
  label: string;
  Icon: LucideIcon;
  usesAspectRatio: boolean;
  supportsBridges: boolean;
  geometry: Round['kind'];
}

export const MAZE_STYLES: Record<MazeStyle, MazeStyleInfo> = {
  classic: {
    label: 'Hranaté',
    Icon: Grid2X2,
    usesAspectRatio: true,
    supportsBridges: true,
    geometry: 'grid',
  },
  curved: {
    label: 'Křivky',
    Icon: Spline,
    usesAspectRatio: true,
    supportsBridges: true,
    geometry: 'grid',
  },
  circular: {
    label: 'Kruhové',
    Icon: Circle,
    usesAspectRatio: false,
    supportsBridges: false,
    geometry: 'polar',
  },
};
