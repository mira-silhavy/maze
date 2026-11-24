import { CircleDot, Clock, Footprints, Trophy } from 'lucide-react';
import type { GameState } from '../game/model';
import { getThemeById } from '../themes/catalog';
import { formatTime } from './formatTime';

export function StatsRow({ state }: { state: GameState }) {
  const { settings, round, elapsedSeconds } = state;
  const theme = getThemeById(settings.themeId);
  const card = `flex items-center justify-center gap-2 rounded-xl border px-3 py-2 ${theme.ui.statCard}`;
  const label = `text-xs ${theme.ui.label}`;
  const value = `font-mono text-sm font-semibold ${theme.ui.statValue}`;
  const accentSky = theme.isLight ? 'text-sky-600' : 'text-sky-400';
  const accentAmber = theme.isLight ? 'text-amber-600' : 'text-amber-400';
  const accentEmerald = theme.isLight ? 'text-emerald-600' : 'text-emerald-400';

  return (
    <section className="grid w-full max-w-[600px] grid-cols-3 gap-3">
      <div className={card}>
        <Clock className={`h-4 w-4 ${accentSky}`} />
        <span className={label}>Čas</span>
        <span className={value}>{formatTime(elapsedSeconds)}</span>
      </div>

      <div className={card}>
        <Footprints className={`h-4 w-4 ${accentSky}`} />
        <span className={label}>Kroky</span>
        <span className={value}>{round.run.steps}</span>
      </div>

      {settings.mode === 'collect' ? (
        <div className={card}>
          <CircleDot className={`h-4 w-4 ${accentAmber}`} />
          <span className={label}>{theme.story.collectLabel}</span>
          <span className={value}>
            {round.run.collected.size} / {round.board.targets.length}
          </span>
        </div>
      ) : (
        <div className={card}>
          <Trophy className={`h-4 w-4 ${accentEmerald}`} />
          <span className={label}>Optimum</span>
          <span className={value}>{round.board.optimalSteps}</span>
        </div>
      )}
    </section>
  );
}
