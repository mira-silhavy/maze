import { RefreshCw, Trophy } from 'lucide-react';
import type { GameState } from '../game/model';
import type { Dispatch } from '../game/useGame';
import { getMessages } from '../i18n';
import { formatTime } from './formatTime';

export function WinOverlay({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch;
}) {
  const { settings, round, elapsedSeconds } = state;
  const t = getMessages(settings.language);
  const story = t.stories[settings.themeId];
  const totalTargets = round.board.targets.length;
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950/75 backdrop-blur-sm">
      <div className="mx-4 flex max-w-xs flex-col items-center rounded-2xl border border-emerald-500/40 bg-slate-900 p-6 text-center shadow-2xl">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <Trophy className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold text-white">
          {settings.mode === 'collect'
            ? story.winCollectTitle
            : story.winClassicTitle}
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          {t.winTime}{' '}
          <strong className="text-white">
            {formatTime(elapsedSeconds)}
          </strong>{' '}
          · {t.winSteps} <strong className="text-white">{round.run.steps}</strong>
          {settings.mode === 'classic'
            ? ` ${t.winOptimum(round.board.optimalSteps)}`
            : ` · ${story.collectLabel}: ${totalTargets}/${totalTargets}`}
        </p>
        <button
          type="button"
          onClick={() => dispatch({ type: 'newMaze' })}
          className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
        >
          <RefreshCw className="h-4 w-4" />
          {t.winNewMaze}
        </button>
      </div>
    </div>
  );
}
