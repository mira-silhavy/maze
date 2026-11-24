import { useEffect } from 'react';
import { useFullscreenFocus } from './game/fullscreen';
import { useKeyboard } from './game/input';
import { phase } from './game/reduce';
import { useGame } from './game/useGame';
import { getMessages } from './i18n';
import { MazeStage } from './renderers/MazeStage';
import { PrintableMaze } from './renderers/PrintableMaze';
import { getThemeById } from './themes/catalog';
import { PageBackdrop } from './themes/scene';
import { FocusToolbar } from './ui/FocusToolbar';
import { Header } from './ui/Header';
import { SettingsPanel } from './ui/SettingsPanel';
import { StatsRow } from './ui/StatsRow';

export default function App() {
  const { state, dispatch } = useGame();
  const theme = getThemeById(state.settings.themeId);
  useEffect(() => {
    const t = getMessages(state.settings.language);
    document.documentElement.lang = state.settings.language;
    document.title = t.appTitle;
  }, [state.settings.language]);
  const {
    focusMode,
    browserFullscreen,
    supported: fullscreenSupported,
    enterFocus,
    exitFocus,
    setFocusMode,
    toggleBrowserFullscreen,
  } = useFullscreenFocus();
  useKeyboard(
    dispatch,
    phase(state) === 'won',
    focusMode,
    setFocusMode,
    state.settings.marbleMode,
  );

  return (
    <>
      <PrintableMaze settings={state.settings} round={state.round} />
      <PageBackdrop theme={theme} />

      <div
        className={
          focusMode
            ? 'fixed inset-0 z-10 flex h-dvh w-screen flex-col items-center justify-center p-2 sm:p-3 print:hidden'
            : 'relative z-10 flex min-h-screen flex-col items-center px-4 py-6 print:hidden'
        }
      >
        {focusMode ? (
          <FocusToolbar
            state={state}
            dispatch={dispatch}
            onExit={exitFocus}
            browserFullscreen={browserFullscreen}
            fullscreenSupported={fullscreenSupported}
            onToggleBrowserFullscreen={toggleBrowserFullscreen}
          />
        ) : (
          <Header settings={state.settings} />
        )}

        <main
          className={
            focusMode
              ? 'flex h-full w-full flex-col items-center justify-center'
              : 'flex w-full max-w-5xl flex-col items-center gap-4'
          }
        >
          {!focusMode && (
            <SettingsPanel
              state={state}
              dispatch={dispatch}
              onEnterFocus={() => enterFocus(true)}
            />
          )}
          {!focusMode && <StatsRow state={state} />}
          <MazeStage state={state} dispatch={dispatch} fullScreen={focusMode} />
        </main>
      </div>
    </>
  );
}
