import { useState } from 'react';
import { DPad } from './components/DPad';
import { FocusToolbar } from './components/FocusToolbar';
import { Header } from './components/Header';
import { MazeStage } from './components/MazeStage';
import { PrintableMazeSvg } from './components/PrintableMazeSvg';
import { SettingsPanel } from './components/SettingsPanel';
import { StatsRow } from './components/StatsRow';
import { useKeyboard } from './game/input';
import { phase } from './game/reduce';
import { useGame } from './game/useGame';

export default function App() {
  const { state, dispatch } = useGame();
  const [focusMode, setFocusMode] = useState(false);
  useKeyboard(dispatch, phase(state) === 'won', focusMode, setFocusMode);

  return (
    <>
      <PrintableMazeSvg settings={state.settings} round={state.round} />

      <div
        className={
          focusMode
            ? 'fixed inset-0 flex h-dvh w-screen flex-col items-center justify-center bg-slate-950 p-2 text-slate-100 sm:p-3 print:hidden'
            : 'flex min-h-screen flex-col items-center bg-slate-950 px-4 py-6 text-slate-100 print:hidden'
        }
      >
        {focusMode ? (
          <FocusToolbar
            state={state}
            dispatch={dispatch}
            onExit={() => setFocusMode(false)}
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
              onEnterFocus={() => setFocusMode(true)}
            />
          )}
          {!focusMode && <StatsRow state={state} />}
          <MazeStage state={state} dispatch={dispatch} fullScreen={focusMode} />
          {!focusMode && <DPad dispatch={dispatch} />}
        </main>
      </div>
    </>
  );
}
