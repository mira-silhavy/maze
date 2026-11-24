import type { Language } from '../i18n';
import {
  ASPECT_RATIO_PRESETS,
  DIFFICULTY_PRESETS,
  MAZE_ALGORITHMS,
  type AspectRatioId,
  type GameMode,
  type MazeAlgorithm,
  type MazeStyle,
} from '../maze/types';
import { MAZE_THEMES, type ThemeId } from '../themes/catalog';
import { DEFAULT_SETTINGS, type Settings, type TargetCount } from './model';

export const SETTINGS_STORAGE_KEY = 'maze-web:settings:v1';

const VALID_DIFFICULTIES = new Set(DIFFICULTY_PRESETS.map((p) => p.id));
const VALID_ASPECTS = new Set<AspectRatioId>(
  ASPECT_RATIO_PRESETS.map((p) => p.id),
);
const VALID_MODES = new Set<GameMode>(['classic', 'collect']);
const VALID_STYLES = new Set<MazeStyle>(['classic', 'curved', 'circular']);
const VALID_ALGORITHMS = new Set<MazeAlgorithm>(
  MAZE_ALGORITHMS.map((a) => a.id),
);
const VALID_THEMES = new Set<ThemeId>(MAZE_THEMES.map((t) => t.id));
const VALID_LANGUAGES = new Set<Language>(['cs', 'en']);

function isTargetCount(value: unknown): value is TargetCount {
  return (
    value === 'all' ||
    (typeof value === 'number' && Number.isInteger(value) && value > 0)
  );
}

export function parseSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  const obj = raw as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;

  return {
    difficultyId:
      typeof obj.difficultyId === 'string' &&
      VALID_DIFFICULTIES.has(obj.difficultyId)
        ? obj.difficultyId
        : d.difficultyId,
    aspectRatioId:
      typeof obj.aspectRatioId === 'string' &&
      VALID_ASPECTS.has(obj.aspectRatioId as AspectRatioId)
        ? (obj.aspectRatioId as AspectRatioId)
        : d.aspectRatioId,
    mode:
      typeof obj.mode === 'string' && VALID_MODES.has(obj.mode as GameMode)
        ? (obj.mode as GameMode)
        : d.mode,
    style:
      typeof obj.style === 'string' && VALID_STYLES.has(obj.style as MazeStyle)
        ? (obj.style as MazeStyle)
        : d.style,
    algorithm:
      typeof obj.algorithm === 'string' &&
      VALID_ALGORITHMS.has(obj.algorithm as MazeAlgorithm)
        ? (obj.algorithm as MazeAlgorithm)
        : d.algorithm,
    braided: typeof obj.braided === 'boolean' ? obj.braided : d.braided,
    themeId:
      typeof obj.themeId === 'string' &&
      VALID_THEMES.has(obj.themeId as ThemeId)
        ? (obj.themeId as ThemeId)
        : d.themeId,
    targetCount: isTargetCount(obj.targetCount)
      ? obj.targetCount
      : d.targetCount,
    sound: typeof obj.sound === 'boolean' ? obj.sound : d.sound,
    showTrail: typeof obj.showTrail === 'boolean' ? obj.showTrail : d.showTrail,
    bridges: typeof obj.bridges === 'boolean' ? obj.bridges : d.bridges,
    marbleMode:
      typeof obj.marbleMode === 'boolean' ? obj.marbleMode : d.marbleMode,
    fogOfWar: typeof obj.fogOfWar === 'boolean' ? obj.fogOfWar : d.fogOfWar,
    language:
      typeof obj.language === 'string' &&
      VALID_LANGUAGES.has(obj.language as Language)
        ? (obj.language as Language)
        : d.language,
  };
}

export function loadSettings(storage?: Pick<Storage, 'getItem'>): Settings {
  try {
    const store =
      storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    if (!store) return { ...DEFAULT_SETTINGS };
    const text = store.getItem(SETTINGS_STORAGE_KEY);
    if (!text) return { ...DEFAULT_SETTINGS };
    return parseSettings(JSON.parse(text));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(
  settings: Settings,
  storage?: Pick<Storage, 'setItem'>,
): void {
  try {
    const store =
      storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    if (!store) return;
    store.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore quota / privacy mode errors
  }
}
