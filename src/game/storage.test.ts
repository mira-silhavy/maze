import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type Settings } from './model';
import {
  loadSettings,
  parseSettings,
  saveSettings,
  SETTINGS_STORAGE_KEY,
} from './storage';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

describe('settings storage', () => {
  it('returns defaults when storage is empty or malformed', () => {
    const store = memoryStorage();
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);

    store.setItem(SETTINGS_STORAGE_KEY, '{not-json');
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips valid settings', () => {
    const store = memoryStorage();
    const custom: Settings = {
      difficultyId: 'large',
      aspectRatioId: 'widescreen',
      mode: 'collect',
      style: 'curved',
      algorithm: 'prim',
      braided: true,
      themeId: 'forest',
      targetCount: 'all',
      sound: false,
      showTrail: false,
      bridges: true,
      marbleMode: true,
      fogOfWar: true,
    };

    saveSettings(custom, store);
    expect(loadSettings(store)).toEqual(custom);
  });

  it('falls back per-field when stored values are invalid or stale', () => {
    const parsed = parseSettings({
      difficultyId: 'nonexistent',
      themeId: 'forest',
      targetCount: -5,
      showTrail: false,
      bridges: 'yes',
      unknownField: 123,
    });

    expect(parsed).toEqual({
      ...DEFAULT_SETTINGS,
      themeId: 'forest',
      showTrail: false,
    });
  });

  it('silently ignores storage errors', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadSettings(throwing)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS, throwing)).not.toThrow();
  });
});
