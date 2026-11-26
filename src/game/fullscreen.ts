import { useCallback, useEffect, useState } from 'react';

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

function getFullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null;
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function isBrowserFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as FullscreenDocument;
  const root = document.documentElement as FullscreenElement;
  return Boolean(
    (doc.fullscreenEnabled && typeof root.requestFullscreen === 'function') ||
      (doc.webkitFullscreenEnabled &&
        typeof root.webkitRequestFullscreen === 'function'),
  );
}

export async function requestBrowserFullscreen(): Promise<void> {
  if (typeof document === 'undefined' || getFullscreenElement()) return;
  const root = document.documentElement as FullscreenElement;
  try {
    if (typeof root.requestFullscreen === 'function') {
      await root.requestFullscreen();
    } else if (typeof root.webkitRequestFullscreen === 'function') {
      await root.webkitRequestFullscreen();
    }
  } catch {
    // Ignored when browser blocks fullscreen (e.g. without user gesture or unsupported iOS Safari)
  }
  await lockCurrentOrientation();
}

// Browsers (Android Chrome) only allow orientation lock while fullscreen; it is released on exit.
async function lockCurrentOrientation(): Promise<void> {
  const orientation = screen.orientation as
    | (ScreenOrientation & { lock?: (o: OrientationType) => Promise<void> })
    | undefined;
  if (!getFullscreenElement() || typeof orientation?.lock !== 'function') return;
  try {
    await orientation.lock(orientation.type);
  } catch {
    // Unsupported on desktop and iOS
  }
}

export async function exitBrowserFullscreen(): Promise<void> {
  if (typeof document === 'undefined' || !getFullscreenElement()) return;
  const doc = document as FullscreenDocument;
  try {
    if (typeof doc.exitFullscreen === 'function') {
      await doc.exitFullscreen();
    } else if (typeof doc.webkitExitFullscreen === 'function') {
      await doc.webkitExitFullscreen();
    }
  } catch {
    // Ignore exit errors
  }
}

export function useFullscreenFocus() {
  const [focusMode, setFocusModeState] = useState(false);
  const [browserFullscreen, setBrowserFullscreen] = useState(
    () => getFullscreenElement() !== null,
  );

  useEffect(() => {
    const sync = () => {
      setBrowserFullscreen(getFullscreenElement() !== null);
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const enterFocus = useCallback((withBrowserFullscreen = true) => {
    setFocusModeState(true);
    if (withBrowserFullscreen) {
      void requestBrowserFullscreen();
    }
  }, []);

  const exitFocus = useCallback(() => {
    setFocusModeState(false);
    void exitBrowserFullscreen();
  }, []);

  const setFocusMode = useCallback((update: (v: boolean) => boolean) => {
    setFocusModeState((prev) => {
      const next = update(prev);
      if (next) void requestBrowserFullscreen();
      else void exitBrowserFullscreen();
      return next;
    });
  }, []);

  const toggleBrowserFullscreen = useCallback(() => {
    if (getFullscreenElement()) {
      void exitBrowserFullscreen();
    } else {
      void requestBrowserFullscreen();
    }
  }, []);

  return {
    focusMode,
    browserFullscreen,
    supported: isBrowserFullscreenSupported(),
    enterFocus,
    exitFocus,
    setFocusMode,
    toggleBrowserFullscreen,
  };
}
