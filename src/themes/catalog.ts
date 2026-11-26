export type ThemeId = 'space' | 'hologram' | 'forest' | 'pirate' | 'paper';

export type BackdropStyle =
  | 'flat'
  | 'nebula'
  | 'radar'
  | 'glade'
  | 'chart'
  | 'notebook';
export type WallStyle =
  | 'solid'
  | 'plasma'
  | 'doubleRail'
  | 'hedgerow'
  | 'inked'
  | 'fountain';
export type BridgeStyle =
  | 'planks'
  | 'hardlight'
  | 'holodeck'
  | 'timber'
  | 'gangplank'
  | 'folded';

export interface ThemeSceneConfig {
  backdrop: BackdropStyle;
  wallStyle: WallStyle;
  bridgeStyle: BridgeStyle;
  wallGlow?: string;
  wallCore?: string;
  wallInner?: string;
  wallNode?: string;
  bridgeDeck: string;
  bridgeAccent: string;
  bridgeRail?: string;
  bridgeRailCore?: string;
}

export interface MarblePalette {
  base: string;
  mid: string;
  highlight: string;
  rim: string;
}

export interface ThemeUiClasses {
  title: string;
  subtitle: string;
  panel: string;
  divider: string;
  label: string;
  pillIdle: string;
  pillMuted: string;
  pillDisabled: string;
  statCard: string;
  statValue: string;
  kbd: string;
}

export interface MazeTheme {
  id: ThemeId;
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
  fogColor: string;
  lightTint: string;
  containerClass: string;
  ui: ThemeUiClasses;
  marble: MarblePalette;
  scene: ThemeSceneConfig;
}

export const CORRIDOR_FLOOR_OPACITY = 0.6;

/** How far (in cells) a classic-maze bridge deck and its rails reach past the bridge cell. */
export const BRIDGE_OVERHANG = 0.14;

/** Fog of war radii in cell units: remembered area around explored cells, and the live flashlight. */
export const FOG_MEMORY_RADIUS = 1.65;
export const FOG_LIGHT_RADIUS = 2.8;

export const MAZE_THEMES: MazeTheme[] = [
  {
    id: 'space',
    isLight: false,
    background: '#050816',
    corridorFloor: '#0d142c',
    wall: '#60a5fa',
    visitedFill: 'rgba(56, 189, 248, 0.10)',
    pencilLine: '#38bdf8',
    pencilGlow: 'rgba(56, 189, 248, 0.50)',
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
    fogColor: '#020512',
    lightTint: 'rgba(56, 189, 248, 0.15)',
    containerClass:
      'border-indigo-400/35 bg-transparent shadow-[0_0_36px_rgba(2,6,23,0.45)]',
    ui: {
      title: 'text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.45)]',
      subtitle: 'text-slate-300/90',
      panel:
        'border-indigo-400/25 bg-[#0a0f22]/92 shadow-[0_10px_30px_rgba(2,6,23,0.4)] pointer-fine:bg-[#0a0f22]/75 pointer-fine:backdrop-blur-md',
      divider: 'border-slate-700/45',
      label: 'text-slate-400',
      pillIdle:
        'bg-slate-800/75 text-slate-200 hover:bg-slate-700/90 hover:text-white',
      pillMuted:
        'bg-slate-800/65 text-slate-400 hover:bg-slate-700/85 hover:text-slate-200',
      pillDisabled: 'bg-slate-800/35 text-slate-600',
      statCard:
        'border-indigo-400/20 bg-[#0a0f22]/90 pointer-fine:bg-[#0a0f22]/70 pointer-fine:backdrop-blur-md',
      statValue: 'text-white',
      kbd: 'bg-slate-800 text-slate-200',
    },
    marble: {
      base: '#0284c7',
      mid: '#38bdf8',
      highlight: '#f0f9ff',
      rim: '#7dd3fc',
    },
    scene: {
      backdrop: 'nebula',
      wallStyle: 'plasma',
      bridgeStyle: 'hardlight',
      wallGlow: 'rgba(96, 165, 250, 0.42)',
      wallCore: '#e0f2fe',
      bridgeDeck: '#071326',
      bridgeAccent: 'rgba(125, 211, 252, 0.38)',
      bridgeRail: '#38bdf8',
      bridgeRailCore: '#e0f2fe',
    },
  },
  {
    id: 'hologram',
    isLight: false,
    background: '#030a16',
    corridorFloor: '#061529',
    wall: '#22d3ee',
    visitedFill: 'rgba(34, 211, 238, 0.09)',
    pencilLine: '#38bdf8',
    pencilGlow: 'rgba(34, 211, 238, 0.50)',
    playerFill: '#22d3ee',
    playerCore: '#cffafe',
    startHighlight: 'rgba(34, 211, 238, 0.18)',
    startCross: '#fb7185',
    goalFill: '#10b981',
    goalHighlight: 'rgba(16, 185, 129, 0.24)',
    targetStroke: '#fbbf24',
    targetFill: 'rgba(251, 191, 36, 0.16)',
    targetCollected: 'rgba(52, 211, 153, 0.50)',
    hintStroke: '#fbbf24',
    fogColor: '#020813',
    lightTint: 'rgba(34, 211, 238, 0.16)',
    containerClass:
      'border-cyan-400/35 bg-transparent shadow-[0_0_36px_rgba(2,6,23,0.45)]',
    ui: {
      title: 'text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.45)]',
      subtitle: 'text-cyan-100/75',
      panel:
        'border-cyan-400/25 bg-[#040f1e]/92 shadow-[0_10px_30px_rgba(2,6,23,0.4)] pointer-fine:bg-[#040f1e]/75 pointer-fine:backdrop-blur-md',
      divider: 'border-cyan-900/50',
      label: 'text-slate-400',
      pillIdle:
        'bg-slate-800/75 text-slate-200 hover:bg-slate-700/90 hover:text-white',
      pillMuted:
        'bg-slate-800/65 text-slate-400 hover:bg-slate-700/85 hover:text-slate-200',
      pillDisabled: 'bg-slate-800/35 text-slate-600',
      statCard:
        'border-cyan-400/20 bg-[#040f1e]/90 pointer-fine:bg-[#040f1e]/70 pointer-fine:backdrop-blur-md',
      statValue: 'text-white',
      kbd: 'bg-slate-800 text-slate-200',
    },
    marble: {
      base: '#0e7490',
      mid: '#22d3ee',
      highlight: '#ecfeff',
      rim: '#67e8f9',
    },
    scene: {
      backdrop: 'radar',
      wallStyle: 'doubleRail',
      bridgeStyle: 'holodeck',
      wallInner: '#041226',
      wallNode: '#67e8f9',
      bridgeDeck: '#041428',
      bridgeAccent: 'rgba(34, 211, 238, 0.24)',
      bridgeRail: '#22d3ee',
      bridgeRailCore: '#a5f3fc',
    },
  },
  {
    id: 'forest',
    isLight: false,
    background: '#03190d',
    corridorFloor: '#09301b',
    wall: '#22c55e',
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
    fogColor: '#02150a',
    lightTint: 'rgba(253, 224, 71, 0.14)',
    containerClass:
      'border-emerald-400/30 bg-transparent shadow-[0_0_36px_rgba(2,18,9,0.5)]',
    ui: {
      title: 'text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.45)]',
      subtitle: 'text-emerald-100/75',
      panel:
        'border-emerald-400/25 bg-[#052012]/92 shadow-[0_10px_30px_rgba(2,18,9,0.45)] pointer-fine:bg-[#052012]/75 pointer-fine:backdrop-blur-md',
      divider: 'border-emerald-800/50',
      label: 'text-emerald-200/70',
      pillIdle:
        'bg-emerald-950/75 text-emerald-100 hover:bg-emerald-900/85 hover:text-white',
      pillMuted:
        'bg-emerald-950/60 text-emerald-300/60 hover:bg-emerald-900/80 hover:text-emerald-100',
      pillDisabled: 'bg-emerald-950/35 text-emerald-700',
      statCard:
        'border-emerald-400/20 bg-[#052012]/90 pointer-fine:bg-[#052012]/70 pointer-fine:backdrop-blur-md',
      statValue: 'text-white',
      kbd: 'bg-emerald-950 text-emerald-100',
    },
    marble: {
      base: '#c2410c',
      mid: '#fb923c',
      highlight: '#fff7ed',
      rim: '#fdba74',
    },
    scene: {
      backdrop: 'glade',
      wallStyle: 'hedgerow',
      bridgeStyle: 'timber',
      wallGlow: '#14532d',
      wallCore: '#4ade80',
      wallNode: '#fef08a',
      bridgeDeck: '#7c3f14',
      bridgeAccent: '#69320e',
      bridgeRail: '#a16207',
      bridgeRailCore: '#fde047',
    },
  },
  {
    id: 'pirate',
    isLight: true,
    background: '#fdf6e3',
    corridorFloor: '#f6e4bc',
    wall: '#5c260a',
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
    fogColor: '#241407',
    lightTint: 'rgba(251, 191, 36, 0.16)',
    containerClass:
      'border-amber-900/35 bg-transparent shadow-[0_8px_28px_rgba(69,26,3,0.10)]',
    ui: {
      title: 'text-amber-950',
      subtitle: 'text-amber-900/80',
      panel:
        'border-amber-900/25 bg-[#fdf6e3]/94 shadow-[0_8px_28px_rgba(69,26,3,0.08)] pointer-fine:bg-[#fdf6e3]/75 pointer-fine:backdrop-blur-md',
      divider: 'border-amber-900/15',
      label: 'text-amber-900/75',
      pillIdle:
        'bg-amber-900/10 text-amber-950 hover:bg-amber-900/20',
      pillMuted:
        'bg-amber-900/10 text-amber-900/60 hover:bg-amber-900/20 hover:text-amber-950',
      pillDisabled: 'bg-amber-900/5 text-amber-900/35',
      statCard:
        'border-amber-900/20 bg-[#fdf6e3]/92 pointer-fine:bg-[#fdf6e3]/70 pointer-fine:backdrop-blur-md',
      statValue: 'text-amber-950',
      kbd: 'bg-amber-900/15 text-amber-950',
    },
    marble: {
      base: '#b45309',
      mid: '#f59e0b',
      highlight: '#fef9c3',
      rim: '#fcd34d',
    },
    scene: {
      backdrop: 'chart',
      wallStyle: 'inked',
      bridgeStyle: 'gangplank',
      wallGlow: 'rgba(120, 53, 15, 0.20)',
      wallNode: '#5c260a',
      bridgeDeck: '#b45309',
      bridgeAccent: '#9a4308',
      bridgeRail: '#92400e',
      bridgeRailCore: '#fbbf24',
    },
  },
  {
    id: 'paper',
    isLight: true,
    background: '#fcfcfd',
    corridorFloor: '#f8fafc',
    wall: '#0f172a',
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
    fogColor: '#0f172a',
    lightTint: 'rgba(250, 204, 21, 0.10)',
    containerClass:
      'border-slate-900/20 bg-transparent shadow-[0_8px_28px_rgba(15,23,42,0.07)]',
    ui: {
      title: 'text-slate-900',
      subtitle: 'text-slate-600',
      panel:
        'border-slate-900/15 bg-white/95 shadow-[0_8px_28px_rgba(15,23,42,0.07)] pointer-fine:bg-white/80 pointer-fine:backdrop-blur-md',
      divider: 'border-slate-900/10',
      label: 'text-slate-500',
      pillIdle:
        'bg-slate-900/5 text-slate-800 hover:bg-slate-900/12',
      pillMuted:
        'bg-slate-900/5 text-slate-500 hover:bg-slate-900/12 hover:text-slate-800',
      pillDisabled: 'bg-slate-900/[0.03] text-slate-400',
      statCard:
        'border-slate-900/12 bg-white/92 pointer-fine:bg-white/75 pointer-fine:backdrop-blur-md',
      statValue: 'text-slate-900',
      kbd: 'bg-slate-900/10 text-slate-800',
    },
    marble: {
      base: '#1d4ed8',
      mid: '#3b82f6',
      highlight: '#eff6ff',
      rim: '#93c5fd',
    },
    scene: {
      backdrop: 'notebook',
      wallStyle: 'fountain',
      bridgeStyle: 'folded',
      wallGlow: 'rgba(15, 23, 42, 0.14)',
      bridgeDeck: '#ffffff',
      bridgeAccent: 'rgba(100, 116, 139, 0.22)',
      bridgeRail: '#0f172a',
    },
  },
];

export function getThemeById(id: ThemeId): MazeTheme {
  return MAZE_THEMES.find((t) => t.id === id) ?? MAZE_THEMES[0];
}
