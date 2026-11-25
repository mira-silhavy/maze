import { memo } from 'react';
import type { Settings } from '../game/model';
import { getMessages } from '../i18n';
import { getThemeById } from '../themes/catalog';

export const Header = memo(function Header({ settings }: { settings: Settings }) {
  const theme = getThemeById(settings.themeId);
  const t = getMessages(settings.language);
  const story = t.stories[settings.themeId];
  const subtitle =
    settings.mode === 'collect'
      ? story.collectSubtitle
      : settings.style === 'circular'
        ? story.circularSubtitle
        : story.classicSubtitle;

  return (
    <header className="mb-5 flex w-full max-w-5xl flex-col items-center text-center">
      <h1
        className={`text-3xl font-bold tracking-tight sm:text-4xl ${theme.ui.title}`}
      >
        {t.appTitle}
      </h1>
      <p className={`mt-1.5 text-sm ${theme.ui.subtitle}`}>{subtitle}</p>
    </header>
  );
});
