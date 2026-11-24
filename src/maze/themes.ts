export type ThemeId = 'space' | 'forest' | 'pirate' | 'paper';

export interface ThemeStory {
  classicSubtitle: string;
  circularSubtitle: string;
  collectSubtitle: string;
  winClassicTitle: string;
  winCollectTitle: string;
  collectLabel: string;
}

export interface MarblePalette {
  base: string;
  mid: string;
  highlight: string;
  rim: string;
}

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
  story: ThemeStory;
  marble: MarblePalette;
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
    story: {
      classicSubtitle: 'Doveď raketu vesmírným bludištěm až k planetě!',
      circularSubtitle: 'Vyleť s raketou ze středu galaxie až k planetě na okraji!',
      collectSubtitle: 'Vyleť od křížku ✕ a posbírej všechny zářící hvězdy!',
      winClassicTitle: 'Přistání na planetě!',
      winCollectTitle: 'Všechny hvězdy posbírány!',
      collectLabel: 'Hvězdy',
    },
    marble: {
      base: '#0284c7',
      mid: '#38bdf8',
      highlight: '#f0f9ff',
      rim: '#7dd3fc',
    },
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
    story: {
      classicSubtitle: 'Pomoz lišce projít lesem až k útulné chatce!',
      circularSubtitle: 'Proveď lišku ze středu lesa až k chatce na okraji!',
      collectSubtitle: 'Vydej se od křížku ✕ a posbírej všechny lesní plody!',
      winClassicTitle: 'Liška je v chatce!',
      winCollectTitle: 'Všechny plody posbírány!',
      collectLabel: 'Plody',
    },
    marble: {
      base: '#c2410c',
      mid: '#fb923c',
      highlight: '#fff7ed',
      rim: '#fdba74',
    },
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
    story: {
      classicSubtitle: 'Doveď pirátskou loď po mapě až k truhle s pokladem!',
      circularSubtitle: 'Vypluj ze středu ostrova až k truhle s pokladem na okraji!',
      collectSubtitle: 'Vypluj od křížku ✕ a posbírej všechny zlaté mince!',
      winClassicTitle: 'Poklad nalezen!',
      winCollectTitle: 'Všechny mince posbírány!',
      collectLabel: 'Mince',
    },
    marble: {
      base: '#b45309',
      mid: '#f59e0b',
      highlight: '#fef9c3',
      rim: '#fcd34d',
    },
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
    story: {
      classicSubtitle: 'Najdi tužkou cestu z levého horního rohu do zeleného cíle.',
      circularSubtitle: 'Dostaň se ze středu kruhového bludiště až k východu na okraji.',
      collectSubtitle: 'Od křížku ✕ ke kolečkům ◯ — posbírej všechna kolečka!',
      winClassicTitle: 'Bludiště vyřešeno!',
      winCollectTitle: 'Všechna kolečka posbírána!',
      collectLabel: 'Kolečka',
    },
    marble: {
      base: '#1d4ed8',
      mid: '#3b82f6',
      highlight: '#eff6ff',
      rim: '#93c5fd',
    },
  },
];

export function getThemeById(id: ThemeId): MazeTheme {
  return MAZE_THEMES.find((t) => t.id === id) ?? MAZE_THEMES[0];
}
