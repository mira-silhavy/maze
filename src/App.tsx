import { useCallback, useEffect } from 'react';
import { useFullscreenFocus } from './game/fullscreen';
import { useKeyboard } from './game/input';
import { phase } from './game/reduce';
import { useGame } from './game/useGame';
import { getMessages } from './i18n';
import { MazeStage } from './renderers/MazeStage';
import { PrintableMaze } from './renderers/PrintableMaze';
import { getThemeById } from './themes/catalog';
import { PageBackdrop } from './themes/backdrop';
import { FocusToolbar } from './ui/FocusToolbar';
import { Header } from './ui/Header';
import { SettingsPanel } from './ui/SettingsPanel';
import { StatsRow } from './ui/StatsRow';

export default function App() {
  const { state, dispatch } = useGame();
  const theme = getThemeById(state.settings.themeId);
  const won = phase(state) === 'won';
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
  const handleEnterFocus = useCallback(() => enterFocus(true), [enterFocus]);
  useKeyboard(
    dispatch,
    won,
    focusMode,
    setFocusMode,
    state.settings.marbleMode,
  );

  return (
    <>
      {state.round.kind === 'grid' ? (
        <PrintableMaze
          kind="grid"
          board={state.round.board}
          style={state.settings.style}
          mode={state.settings.mode}
          language={state.settings.language}
        />
      ) : (
        <PrintableMaze
          kind="polar"
          board={state.round.board}
          style={state.settings.style}
          mode={state.settings.mode}
          language={state.settings.language}
        />
      )}
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
            settings={state.settings}
            collectedCount={state.round.run.collected.size}
            totalTargets={state.round.board.targets.length}
            showHint={state.showHint}
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
              settings={state.settings}
              roundKind={state.round.kind}
              showHint={state.showHint}
              dispatch={dispatch}
              onEnterFocus={handleEnterFocus}
            />
          )}
          {!focusMode && <StatsRow state={state} />}
          <MazeStage
            settings={state.settings}
            round={state.round}
            showHint={state.showHint}
            won={won}
            winElapsedSeconds={won ? state.elapsedSeconds : 0}
            dispatch={dispatch}
            fullScreen={focusMode}
          />
        </main>
      </div>
    </>
  );
}
