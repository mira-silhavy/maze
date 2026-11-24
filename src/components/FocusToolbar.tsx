import { CircleDot, Lightbulb, Minimize2, RefreshCw } from 'lucide-react';
import type { GameState } from '../game/model';
import type { Dispatch } from '../game/useGame';
import { IconButton, SoundButton } from './controls';

export function FocusToolbar({
  state,
  dispatch,
  onExit,
}: {
  state: GameState;
  dispatch: Dispatch;
  onExit: () => void;
}) {
  const { settings, round, showHint } = state;
  return (
    <div className="fixed top-3 right-3 z-20 flex items-center gap-1.5 rounded-2xl border border-slate-700/80 bg-slate-900/85 p-1.5 shadow-xl backdrop-blur-md">
      {settings.mode === 'collect' && (
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-800/90 px-2.5 py-1.5 text-xs font-semibold text-amber-300">
          <CircleDot className="h-3.5 w-3.5" />
          <span className="font-mono">
            {round.run.collected.size}/{round.board.targets.length}
          </span>
        </div>
      )}

      <SoundButton
        size="h-9 w-9"
        enabled={settings.sound}
        dispatch={dispatch}
      />

      <IconButton
        size="h-9 w-9"
        label="Nápověda"
        title="Nápověda"
        tone={`transition ${
          showHint
            ? 'bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/50'
            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
        }`}
        onClick={() => dispatch({ type: 'toggleHint' })}
      >
        <Lightbulb className="h-4 w-4" />
      </IconButton>

      <IconButton
        size="h-9 w-9"
        label="Nové bludiště"
        title="Nové bludiště"
        tone="bg-emerald-500 text-slate-950 transition hover:bg-emerald-400"
        onClick={() => dispatch({ type: 'newMaze' })}
      >
        <RefreshCw className="h-4 w-4" />
      </IconButton>

      <button
        type="button"
        onClick={onExit}
        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-sky-500 px-3 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 sm:text-sm"
        title="Zobrazit menu (Esc)"
      >
        <Minimize2 className="h-4 w-4" />
        Menu
      </button>
    </div>
  );
}
