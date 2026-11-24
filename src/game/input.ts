import { useEffect, useRef, type PointerEvent } from 'react';
import type { Direction } from '../maze/types';
import type { Vector } from './model';
import type { Dispatch } from './useGame';

export const DIRECTION_VECTORS: Record<Direction, Vector> = {
  top: { dx: 0, dy: -1 },
  right: { dx: 1, dy: 0 },
  bottom: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
};

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: 'top',
  ArrowDown: 'bottom',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'top',
  W: 'top',
  s: 'bottom',
  S: 'bottom',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
};

export function useKeyboard(
  dispatch: Dispatch,
  won: boolean,
  focusMode: boolean,
  setFocusMode: (update: (v: boolean) => boolean) => void,
): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const dir = KEY_DIRECTIONS[event.key];
      if (dir) {
        event.preventDefault();
        dispatch({ type: 'move', ...DIRECTION_VECTORS[dir] });
        return;
      }

      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        dispatch({ type: 'newMaze' });
        return;
      }

      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        setFocusMode((v) => !v);
        return;
      }

      if (event.key === 'Escape' && focusMode) {
        event.preventDefault();
        setFocusMode(() => false);
        return;
      }

      if (won && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        dispatch({ type: 'newMaze' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, won, focusMode, setFocusMode]);
}

const STEP_THRESHOLD_PX = 24;

export function useDragMove(dispatch: Dispatch, won: boolean) {
  const anchorRef = useRef<{ pointerId: number; x: number; y: number } | null>(
    null,
  );

  const end = (event: PointerEvent<HTMLDivElement>) => {
    const anchor = anchorRef.current;
    if (!anchor || anchor.pointerId !== event.pointerId) return;
    anchorRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (won) return;
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      event.currentTarget.setPointerCapture(event.pointerId);
      anchorRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const anchor = anchorRef.current;
      if (!anchor || anchor.pointerId !== event.pointerId) return;
      const dx = event.clientX - anchor.x;
      const dy = event.clientY - anchor.y;
      if (Math.hypot(dx, dy) >= STEP_THRESHOLD_PX) {
        dispatch({ type: 'move', dx, dy });
        anchor.x = event.clientX;
        anchor.y = event.clientY;
      }
    },
    onPointerUp: end,
    onPointerCancel: end,
  };
}
