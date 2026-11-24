import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  type LucideIcon,
} from 'lucide-react';
import { DIRECTION_VECTORS } from '../game/input';
import type { Dispatch } from '../game/useGame';
import type { Direction } from '../maze/types';

function PadButton({
  dir,
  label,
  Icon,
  dispatch,
}: {
  dir: Direction;
  label: string;
  Icon: LucideIcon;
  dispatch: Dispatch;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => dispatch({ type: 'move', ...DIRECTION_VECTORS[dir] })}
      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-slate-700 bg-slate-800/90 text-slate-200 transition hover:bg-slate-700 active:scale-95"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

export function DPad({ dispatch }: { dispatch: Dispatch }) {
  return (
    <section className="flex flex-col items-center gap-3 pt-1">
      <div className="grid touch-none grid-cols-3 gap-1.5">
        <div />
        <PadButton
          dir="top"
          label="Nahoru"
          Icon={ArrowUp}
          dispatch={dispatch}
        />
        <div />
        <PadButton
          dir="left"
          label="Doleva"
          Icon={ArrowLeft}
          dispatch={dispatch}
        />
        <PadButton
          dir="bottom"
          label="Dolů"
          Icon={ArrowDown}
          dispatch={dispatch}
        />
        <PadButton
          dir="right"
          label="Doprava"
          Icon={ArrowRight}
          dispatch={dispatch}
        />
      </div>

      <p className="text-center text-xs text-slate-500">
        Ovládání:{' '}
        <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
          ↑ ↓ ← →
        </kbd>
        ,{' '}
        <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
          WASD
        </kbd>{' '}
        nebo <span className="text-slate-300">tažení prstem po bludišti</span> ·{' '}
        <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
          R
        </kbd>{' '}
        nové bludiště ·{' '}
        <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
          F
        </kbd>{' '}
        celá obrazovka
      </p>
    </section>
  );
}
