import { useCallback, useEffect, useRef, useState } from 'react';
import {
  playCollectSound,
  playStepSound,
  playWallBumpSound,
  playWinSound,
} from '../maze/sound';
import {
  DEFAULT_SETTINGS,
  type Command,
  type GameEvent,
  type GameState,
} from './model';
import { initGame, phase, reduce } from './reduce';

export type Dispatch = (command: Command) => void;

/**
 * Not useReducer: sounds must start inside the input handler (mobile Safari
 * only resumes an AudioContext during a user gesture), and a fast drag sends
 * several moves before React re-renders, so each command reads the ref.
 */
export function useGame(): { state: GameState; dispatch: Dispatch } {
  const [state, setState] = useState(() => initGame(DEFAULT_SETTINGS));
  const ref = useRef(state);

  const dispatch = useCallback<Dispatch>((command) => {
    const { state: next, events } = reduce(ref.current, command);
    if (next !== ref.current) {
      ref.current = next;
      setState(next);
    }
    if (next.settings.sound) playSoundFor(events, next.settings.marbleMode);
  }, []);

  const playing = phase(state) === 'playing';
  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => window.clearInterval(interval);
  }, [playing, dispatch]);

  return { state, dispatch };
}

function playSoundFor(events: GameEvent[], marbleMode: boolean): void {
  const collect = events.find(
    (e): e is Extract<GameEvent, { type: 'collect' }> => e.type === 'collect',
  );
  if (events.some((e) => e.type === 'win')) playWinSound();
  else if (collect) playCollectSound(collect.collectedCount);
  else if (!marbleMode && events.some((e) => e.type === 'step')) playStepSound();
  else if (!marbleMode && events.some((e) => e.type === 'bump')) playWallBumpSound();
}
