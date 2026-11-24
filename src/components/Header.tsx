import type { Settings } from '../game/model';
import { MAZE_STYLES } from '../game/styles';

export function Header({ settings }: { settings: Settings }) {
  return (
    <header className="mb-5 flex w-full max-w-5xl flex-col items-center text-center">
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Generátor bludiště
      </h1>
      <p className="mt-1.5 text-sm text-slate-400">
        {settings.mode === 'collect'
          ? 'Od křížku ✕ ke kolečkům ◯ — posbírej všechna žlutá kolečka na koncích slepých uliček!'
          : MAZE_STYLES[settings.style].subtitle}
      </p>
    </header>
  );
}
