export type ThemeId = 'space' | 'forest' | 'pirate' | 'paper';

export interface MazeTheme {
  id: ThemeId;
  label: string;
  isLight: boolean;
  background: string;
  corridorFloor: string;
  wall: string;
  visitedFill: string;
  pencilLine: string;
  pencilGlow: string;
  playerFill: string;
  playerCore: string;
  startHighlight: string;
  startCross: string;
  goalFill: string;
  goalHighlight: string;
  targetStroke: string;
  targetFill: string;
  targetCollected: string;
  hintStroke: string;
  containerClass: string;
}

export const MAZE_THEMES: MazeTheme[] = [
  {
    id: 'space',
    label: 'Vesmír',
    isLight: false,
    background: '#0f172a',
    corridorFloor: '#1e293b',
    wall: '#94a3b8',
    visitedFill: 'rgba(56, 189, 248, 0.10)',
    pencilLine: '#38bdf8',
    pencilGlow: 'rgba(56, 189, 248, 0.45)',
    playerFill: '#38bdf8',
    playerCore: '#e0f2fe',
    startHighlight: 'rgba(56, 189, 248, 0.20)',
    startCross: '#fb7185',
    goalFill: '#10b981',
    goalHighlight: 'rgba(16, 185, 129, 0.25)',
    targetStroke: '#fbbf24',
    targetFill: 'rgba(251, 191, 36, 0.16)',
    targetCollected: 'rgba(52, 211, 153, 0.50)',
    hintStroke: '#fbbf24',
    containerClass: 'border-slate-800 bg-slate-900/80 shadow-slate-950/80',
  },
  {
    id: 'forest',
    label: 'Les',
    isLight: false,
    background: '#052e16',
    corridorFloor: '#14532d',
    wall: '#4ade80',
    visitedFill: 'rgba(250, 204, 21, 0.10)',
    pencilLine: '#facc15',
    pencilGlow: 'rgba(250, 204, 21, 0.45)',
    playerFill: '#fb923c',
    playerCore: '#ffedd5',
    startHighlight: 'rgba(74, 222, 128, 0.20)',
    startCross: '#f87171',
    goalFill: '#22c55e',
    goalHighlight: 'rgba(34, 197, 94, 0.28)',
    targetStroke: '#fde047',
    targetFill: 'rgba(253, 224, 71, 0.18)',
    targetCollected: 'rgba(134, 239, 172, 0.50)',
    hintStroke: '#fb923c',
    containerClass: 'border-emerald-900 bg-emerald-950/90 shadow-slate-950/80',
  },
  {
    id: 'pirate',
    label: 'Poklad',
    isLight: true,
    background: '#fef3c7',
    corridorFloor: '#fde68a',
    wall: '#78350f',
    visitedFill: 'rgba(220, 38, 38, 0.07)',
    pencilLine: '#dc2626',
    pencilGlow: 'rgba(220, 38, 38, 0.28)',
    playerFill: '#1d4ed8',
    playerCore: '#dbeafe',
    startHighlight: 'rgba(220, 38, 38, 0.14)',
    startCross: '#dc2626',
    goalFill: '#059669',
    goalHighlight: 'rgba(5, 150, 105, 0.20)',
    targetStroke: '#d97706',
    targetFill: 'rgba(217, 119, 6, 0.18)',
    targetCollected: 'rgba(5, 150, 105, 0.45)',
    hintStroke: '#2563eb',
    containerClass: 'border-amber-700/60 bg-amber-100/95 shadow-slate-950/60',
  },
  {
    id: 'paper',
    label: 'Papír',
    isLight: true,
    background: '#ffffff',
    corridorFloor: '#f1f5f9',
    wall: '#1e293b',
    visitedFill: 'rgba(37, 99, 235, 0.06)',
    pencilLine: '#2563eb',
    pencilGlow: 'rgba(37, 99, 235, 0.25)',
    playerFill: '#2563eb',
    playerCore: '#dbeafe',
    startHighlight: 'rgba(37, 99, 235, 0.12)',
    startCross: '#e11d48',
    goalFill: '#16a34a',
    goalHighlight: 'rgba(22, 163, 74, 0.18)',
    targetStroke: '#ea580c',
    targetFill: 'rgba(234, 88, 12, 0.14)',
    targetCollected: 'rgba(22, 163, 74, 0.45)',
    hintStroke: '#d97706',
    containerClass: 'border-slate-300 bg-white shadow-slate-950/50',
  },
];

export function getThemeById(id: ThemeId): MazeTheme {
  return MAZE_THEMES.find((t) => t.id === id) ?? MAZE_THEMES[0];
}
