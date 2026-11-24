import { useCallback, useEffect, useRef, useState } from 'react';

export interface TiltVector {
  gx: number;
  gy: number;
}

export type TiltPermission = 'prompt' | 'granted' | 'denied' | 'unsupported';

interface DeviceOrientationEventIOS {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

const MAX_TILT_DEG = 26;
const DEAD_ZONE_DEG = 2.5;

function getScreenAngle(): number {
  if (typeof window === 'undefined') return 0;
  if (window.screen?.orientation && typeof window.screen.orientation.angle === 'number') {
    return window.screen.orientation.angle;
  }
  const legacy = (window as unknown as { orientation?: number }).orientation;
  return typeof legacy === 'number' ? legacy : 0;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function applyDeadZone(deg: number): number {
  if (Math.abs(deg) < DEAD_ZONE_DEG) return 0;
  const sign = Math.sign(deg);
  return sign * clamp((Math.abs(deg) - DEAD_ZONE_DEG) / (MAX_TILT_DEG - DEAD_ZONE_DEG), 0, 1);
}

function needsIOSPermission(): boolean {
  if (typeof window === 'undefined') return false;
  const ctor = window.DeviceOrientationEvent as unknown as
    | DeviceOrientationEventIOS
    | undefined;
  return Boolean(ctor && typeof ctor.requestPermission === 'function');
}

export function useTiltInput(enabled: boolean) {
  const tiltRef = useRef<TiltVector>({ gx: 0, gy: 0 });
  const rawAnglesRef = useRef<{ beta: number; gamma: number } | null>(null);
  const zeroRef = useRef<{ beta: number; gamma: number } | null>(null);
  const keysRef = useRef<Set<string>>(new Set());

  const [hasGyro, setHasGyro] = useState(false);
  const [permission, setPermission] = useState<TiltPermission>(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      return 'unsupported';
    }
    return needsIOSPermission() ? 'prompt' : 'granted';
  });

  const calibrate = useCallback(() => {
    if (rawAnglesRef.current) {
      zeroRef.current = { ...rawAnglesRef.current };
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!needsIOSPermission()) {
      setPermission('granted');
      return;
    }
    try {
      const ctor = window.DeviceOrientationEvent as unknown as DeviceOrientationEventIOS;
      const result = await ctor.requestPermission?.();
      setPermission(result === 'granted' ? 'granted' : 'denied');
    } catch {
      setPermission('denied');
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      tiltRef.current = { gx: 0, gy: 0 };
      keysRef.current.clear();
      return;
    }

    const updateFromKeys = () => {
      const keys = keysRef.current;
      let kx = 0;
      let ky = 0;
      if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) kx -= 1;
      if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) kx += 1;
      if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) ky -= 1;
      if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) ky += 1;
      if (kx !== 0 || ky !== 0) {
        const len = Math.hypot(kx, ky);
        tiltRef.current = { gx: (kx / len) * 0.85, gy: (ky / len) * 0.85 };
        return true;
      }
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'w',
          'W',
          'a',
          'A',
          's',
          'S',
          'd',
          'D',
        ].includes(e.key)
      ) {
        e.preventDefault();
        keysRef.current.add(e.key);
        updateFromKeys();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (keysRef.current.delete(e.key)) {
        if (!updateFromKeys() && !rawAnglesRef.current) {
          tiltRef.current = { gx: 0, gy: 0 };
        }
      }
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;
      setHasGyro(true);
      rawAnglesRef.current = { beta: event.beta, gamma: event.gamma };

      // Auto-calibrate gently on first reading so holding the tablet at a natural angle feels neutral
      if (!zeroRef.current) {
        zeroRef.current = {
          beta: clamp(event.beta, -35, 55),
          gamma: clamp(event.gamma, -25, 25),
        };
      }

      if (keysRef.current.size > 0) return;

      const dBeta = event.beta - zeroRef.current.beta;
      const dGamma = event.gamma - zeroRef.current.gamma;

      // Rotate tilt vector to match current screen orientation
      const angle = ((getScreenAngle() % 360) + 360) % 360;
      let screenX = dGamma;
      let screenY = dBeta;
      if (angle === 90) {
        screenX = dBeta;
        screenY = -dGamma;
      } else if (angle === 270) {
        screenX = -dBeta;
        screenY = dGamma;
      } else if (angle === 180) {
        screenX = -dGamma;
        screenY = -dBeta;
      }

      tiltRef.current = {
        gx: applyDeadZone(screenX),
        gy: applyDeadZone(screenY),
      };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    if (permission === 'granted') {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [enabled, permission]);

  return {
    tiltRef,
    permission,
    hasGyro,
    requestPermission,
    calibrate,
  };
}
