import {
  CircleDot,
  Disc,
  Flashlight,
  Lightbulb,
  Maximize,
  Minimize,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import type { GameState } from '../game/model';
import type { Dispatch } from '../game/useGame';
import { unlockAudio } from '../audio/sound';
import { getMessages } from '../i18n';
import { getThemeById } from '../themes/catalog';
import { IconButton, SoundButton } from './controls';

export function FocusToolbar({
  state,
  dispatch,
  onExit,
  browserFullscreen,
  fullscreenSupported,
  onToggleBrowserFullscreen,
}: {
  state: GameState;
  dispatch: Dispatch;
  onExit: () => void;
  browserFullscreen: boolean;
  fullscreenSupported: boolean;
  onToggleBrowserFullscreen: () => void;
}) {
  const { settings, round, showHint } = state;
  const theme = getThemeById(settings.themeId);
  const t = getMessages(settings.language);
  const { ui, isLight } = theme;
  const activeSky = isLight
    ? 'bg-sky-600/15 text-sky-800 ring-1 ring-sky-600/40'
    : 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/50';
  const activeAmber = isLight
    ? 'bg-amber-600/15 text-amber-900 ring-1 ring-amber-600/40'
    : 'bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/50';

  return (
    <div
      className={`fixed top-3 right-3 z-20 flex items-center gap-1.5 rounded-2xl border p-1.5 ${ui.panel}`}
    >
      {settings.mode === 'collect' && (
        <div
          className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold ${
            isLight
              ? 'bg-amber-900/10 text-amber-800'
              : 'bg-slate-800/90 text-amber-300'
          }`}
        >
          <CircleDot className="h-3.5 w-3.5" />
          <span className="font-mono">
            {round.run.collected.size}/{round.board.targets.length}
          </span>
        </div>
      )}

      <IconButton
        size="h-9 w-9"
        label={settings.marbleMode ? t.focusMarbleOn : t.focusMarbleOff}
        title={settings.marbleMode ? t.focusMarbleOn : t.focusMarbleOff}
        tone={`transition ${settings.marbleMode ? activeSky : ui.pillIdle}`}
        onClick={() => {
          if (!settings.marbleMode) unlockAudio();
          dispatch({
            type: 'configure',
            patch: { marbleMode: !settings.marbleMode },
          });
        }}
      >
        <Disc className="h-4 w-4" />
      </IconButton>

      <IconButton
        size="h-9 w-9"
        label={settings.fogOfWar ? t.focusFogOn : t.focusFogOff}
        title={settings.fogOfWar ? t.focusFogOn : t.focusFogOff}
        tone={`transition ${settings.fogOfWar ? activeAmber : ui.pillIdle}`}
        onClick={() =>
          dispatch({
            type: 'configure',
            patch: { fogOfWar: !settings.fogOfWar },
          })
        }
      >
        <Flashlight className="h-4 w-4" />
      </IconButton>

      <SoundButton
        size="h-9 w-9"
        enabled={settings.sound}
        language={settings.language}
        theme={theme}
        dispatch={dispatch}
      />

      <IconButton
        size="h-9 w-9"
        label={t.hint}
        title={t.hint}
        tone={`transition ${showHint ? activeAmber : ui.pillIdle}`}
        onClick={() => dispatch({ type: 'toggleHint' })}
      >
        <Lightbulb className="h-4 w-4" />
      </IconButton>

      <IconButton
        size="h-9 w-9"
        label={t.newMazeTitle}
        title={t.newMazeTitle}
        tone="bg-emerald-500 text-slate-950 transition hover:bg-emerald-400"
        onClick={() => dispatch({ type: 'newMaze' })}
      >
        <RefreshCw className="h-4 w-4" />
      </IconButton>

      {fullscreenSupported && (
        <IconButton
          size="h-9 w-9"
          label={
            browserFullscreen
              ? t.focusBrowserFullscreenExit
              : t.focusBrowserFullscreenEnter
          }
          title={
            browserFullscreen
              ? t.focusBrowserFullscreenExit
              : t.focusBrowserFullscreenEnter
          }
          tone={`transition ${browserFullscreen ? activeSky : ui.pillIdle}`}
          onClick={onToggleBrowserFullscreen}
        >
          {browserFullscreen ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </IconButton>
      )}

      <button
        type="button"
        onClick={onExit}
        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-sky-500 px-3 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 sm:text-sm"
        title={t.focusMenuTitle}
      >
        <Minimize2 className="h-4 w-4" />
        {t.focusMenu}
      </button>
    </div>
  );
}
