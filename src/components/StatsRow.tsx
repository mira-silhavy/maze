import { CircleDot, Clock, Footprints, Trophy } from 'lucide-react';
import type { GameState } from '../game/model';
import { formatTime } from './formatTime';

export function StatsRow({ state }: { state: GameState }) {
  const { settings, round, elapsedSeconds } = state;
  return (
    <section className="grid w-full max-w-[600px] grid-cols-3 gap-3">
      <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
        <Clock className="h-4 w-4 text-sky-400" />
        <span className="text-xs text-slate-400">Čas</span>
        <span className="font-mono text-sm font-semibold text-white">
          {formatTime(elapsedSeconds)}
        </span>
      </div>

      <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
        <Footprints className="h-4 w-4 text-sky-400" />
        <span className="text-xs text-slate-400">Kroky</span>
        <span className="font-mono text-sm font-semibold text-white">
          {round.run.steps}
        </span>
      </div>

      {settings.mode === 'collect' ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
          <CircleDot className="h-4 w-4 text-amber-400" />
          <span className="text-xs text-slate-400">Kolečka</span>
          <span className="font-mono text-sm font-semibold text-white">
            {round.run.collected.size} / {round.board.targets.length}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
          <Trophy className="h-4 w-4 text-emerald-400" />
          <span className="text-xs text-slate-400">Optimum</span>
          <span className="font-mono text-sm font-semibold text-white">
            {round.board.optimalSteps}
          </span>
        </div>
      )}
    </section>
  );
}
