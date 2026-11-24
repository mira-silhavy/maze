import type { Settings } from '../game/model';
import { getThemeById } from '../maze/themes';

export function Header({ settings }: { settings: Settings }) {
  const theme = getThemeById(settings.themeId);
  const subtitle =
    settings.mode === 'collect'
      ? theme.story.collectSubtitle
      : settings.style === 'circular'
        ? theme.story.circularSubtitle
        : theme.story.classicSubtitle;

  return (
    <header className="mb-5 flex w-full max-w-5xl flex-col items-center text-center">
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Generátor bludiště
      </h1>
      <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>
    </header>
  );
}
