import {
  CircleDot,
  Compass,
  Eraser,
  FileText,
  Flag,
  Layers,
  Lightbulb,
  Maximize2,
  Monitor,
  Printer,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Square,
  Tablet,
  Trees,
  type LucideIcon,
} from 'lucide-react';
import type { GameState, Settings, TargetCount } from '../game/model';
import { MAZE_STYLES } from '../game/styles';
import type { Dispatch } from '../game/useGame';
import { MAZE_THEMES, type ThemeId } from '../maze/themes';
import {
  ASPECT_RATIO_PRESETS,
  DIFFICULTY_PRESETS,
  getMazeDimensions,
  type AspectRatioId,
  type GameMode,
  type MazeStyle,
} from '../maze/types';
import { IconButton, OptionPill, SoundButton } from './controls';

const MODES: ReadonlyArray<{
  id: GameMode;
  label: string;
  Icon: LucideIcon;
  activeClass: string;
}> = [
  {
    id: 'classic',
    label: 'Start → Cíl',
    Icon: Flag,
    activeClass:
      'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/50',
  },
  {
    id: 'collect',
    label: 'Od křížku ke kolečku',
    Icon: CircleDot,
    activeClass: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/50',
  },
];

const THEME_ICONS: Record<ThemeId, LucideIcon> = {
  space: Sparkles,
  forest: Trees,
  pirate: Compass,
  paper: FileText,
};

const ASPECT_ICONS: Record<AspectRatioId, LucideIcon> = {
  square: Square,
  tablet: Tablet,
  widescreen: Monitor,
};

const TARGET_COUNT_OPTIONS: ReadonlyArray<{
  value: TargetCount;
  label: string;
}> = [
  { value: 3, label: '3' },
  { value: 5, label: '5' },
  { value: 7, label: '7' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
  { value: 'all', label: 'Vše' },
];

export function SettingsPanel({
  state,
  dispatch,
  onEnterFocus,
}: {
  state: GameState;
  dispatch: Dispatch;
  onEnterFocus: () => void;
}) {
  const { settings, round, showHint } = state;
  const configure = (patch: Partial<Settings>) =>
    dispatch({ type: 'configure', patch });
  const aspectRatio = ASPECT_RATIO_PRESETS.find(
    (a) => a.id === settings.aspectRatioId,
  )!;

  return (
    <section className="flex w-full flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {DIFFICULTY_PRESETS.map((item) => {
            const dims = getMazeDimensions(item, aspectRatio);
            const sizeText =
              round.kind === 'polar'
                ? `${item.polarRings} kruhů`
                : `${dims.cols}×${dims.rows}`;
            return (
              <OptionPill
                key={item.id}
                active={item.id === settings.difficultyId}
                activeClass="bg-sky-500 text-slate-950 shadow-sm shadow-sky-500/40"
                onClick={() => configure({ difficultyId: item.id })}
              >
                {item.label} ({sizeText})
              </OptionPill>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => dispatch({ type: 'toggleHint' })}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
              showHint
                ? 'bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/50'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title="Zobrazit nápovědu"
          >
            <Lightbulb className="h-4 w-4" />
            Nápověda
          </button>

          <button
            type="button"
            onClick={() => dispatch({ type: 'restart' })}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 sm:text-sm"
            title="Vrátit se na start"
          >
            <RotateCcw className="h-4 w-4" />
            Start
          </button>

          <button
            type="button"
            onClick={() => dispatch({ type: 'newMaze' })}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 sm:text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Nové
          </button>

          <div className="mx-0.5 h-5 w-px bg-slate-800" />

          <IconButton
            size="h-8 w-8"
            label="Gumování slepých uliček"
            title={
              settings.eraseBacktrack
                ? 'Guma zapnuta: couvání maže čáru'
                : 'Guma vypnuta: zůstává celá čára'
            }
            tone={`transition ${
              settings.eraseBacktrack
                ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/50'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
            onClick={() =>
              configure({ eraseBacktrack: !settings.eraseBacktrack })
            }
          >
            <Eraser className="h-4 w-4" />
          </IconButton>

          <SoundButton
            size="h-8 w-8"
            enabled={settings.sound}
            dispatch={dispatch}
          />

          <IconButton
            size="h-8 w-8"
            label="Tisk na A4"
            title="Vytisknout čisté černobílé bludiště na A4"
            tone="bg-slate-800 text-slate-200 transition hover:bg-slate-700"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
          </IconButton>

          <IconButton
            size="h-8 w-8"
            label="Celá obrazovka"
            title="Skrýt menu a roztáhnout bludiště na celou obrazovku (F)"
            tone="bg-slate-800 text-slate-200 transition hover:bg-slate-700"
            onClick={onEnterFocus}
          >
            <Maximize2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400">Režim:</span>
          {MODES.map((item) => (
            <OptionPill
              key={item.id}
              active={settings.mode === item.id}
              activeClass={item.activeClass}
              Icon={item.Icon}
              onClick={() => configure({ mode: item.id })}
            >
              {item.label}
            </OptionPill>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400">Styl:</span>
          {(Object.keys(MAZE_STYLES) as MazeStyle[]).map((style) => (
            <OptionPill
              key={style}
              active={settings.style === style}
              activeClass="bg-violet-500 text-white shadow-sm shadow-violet-500/40"
              Icon={MAZE_STYLES[style].Icon}
              onClick={() => configure({ style })}
            >
              {MAZE_STYLES[style].label}
            </OptionPill>
          ))}
          {MAZE_STYLES[settings.style].supportsBridges && (
            <OptionPill
              active={settings.bridges}
              activeClass="bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/50"
              Icon={Layers}
              onClick={() => configure({ bridges: !settings.bridges })}
            >
              Mosty
            </OptionPill>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Motiv:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {MAZE_THEMES.map((item) => (
              <OptionPill
                key={item.id}
                active={item.id === settings.themeId}
                activeClass="bg-pink-500 text-white shadow-sm shadow-pink-500/40"
                Icon={THEME_ICONS[item.id]}
                onClick={() => configure({ themeId: item.id })}
              >
                {item.label}
              </OptionPill>
            ))}
          </div>
        </div>

        {MAZE_STYLES[settings.style].usesAspectRatio && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400">
              Poměr stran:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {ASPECT_RATIO_PRESETS.map((item) => (
                <OptionPill
                  key={item.id}
                  active={item.id === settings.aspectRatioId}
                  activeClass="bg-indigo-500 text-white shadow-sm shadow-indigo-500/40"
                  Icon={ASPECT_ICONS[item.id]}
                  onClick={() => configure({ aspectRatioId: item.id })}
                >
                  {item.label} ({item.ratioText})
                </OptionPill>
              ))}
            </div>
          </div>
        )}

        {settings.mode === 'collect' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400">
              Počet koleček:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {TARGET_COUNT_OPTIONS.map((item) => (
                <OptionPill
                  key={String(item.value)}
                  active={item.value === settings.targetCount}
                  activeClass="bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/40"
                  onClick={() => configure({ targetCount: item.value })}
                >
                  {item.label}
                </OptionPill>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
