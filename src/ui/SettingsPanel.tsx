import { useState } from 'react';
import {
  CircleDot,
  CircleHelp,
  Compass,
  Disc,
  FileText,
  Flag,
  Flashlight,
  GitBranch,
  Infinity as InfinityIcon,
  Layers,
  Lightbulb,
  Maximize2,
  Monitor,
  Pencil,
  Printer,
  Radar,
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
import { unlockAudio } from '../audio/sound';
import { getThemeById, MAZE_THEMES, type ThemeId } from '../themes/catalog';
import {
  ASPECT_RATIO_PRESETS,
  DIFFICULTY_PRESETS,
  getMazeDimensions,
  MAZE_ALGORITHMS,
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
  hologram: Radar,
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
  const [showHelp, setShowHelp] = useState(false);
  const { settings, round, showHint } = state;
  const theme = getThemeById(settings.themeId);
  const { ui, isLight } = theme;
  const configure = (patch: Partial<Settings>) =>
    dispatch({ type: 'configure', patch });
  const aspectRatio = ASPECT_RATIO_PRESETS.find(
    (a) => a.id === settings.aspectRatioId,
  )!;

  const softActive = {
    emerald: isLight
      ? 'bg-emerald-600/15 text-emerald-800 ring-1 ring-emerald-600/40'
      : 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/50',
    amber: isLight
      ? 'bg-amber-600/15 text-amber-900 ring-1 ring-amber-600/40'
      : 'bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/50',
    sky: isLight
      ? 'bg-sky-600/15 text-sky-800 ring-1 ring-sky-600/40'
      : 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/50',
    violet: isLight
      ? 'bg-violet-600/15 text-violet-800 ring-1 ring-violet-600/40'
      : 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/50',
    cyan: isLight
      ? 'bg-cyan-600/15 text-cyan-800 ring-1 ring-cyan-600/40'
      : 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/50',
  };

  return (
    <section
      className={`flex w-full flex-col gap-3 rounded-2xl border p-3 transition-colors ${ui.panel}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
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
                idleClass={ui.pillIdle}
                disabledClass={ui.pillDisabled}
                title={`${item.label} (${sizeText})`}
                onClick={() => configure({ difficultyId: item.id })}
              >
                {item.label}
              </OptionPill>
            );
          })}

          {MAZE_STYLES[settings.style].usesAspectRatio && (
            <>
              <div
                className={`mx-0.5 h-5 w-px ${isLight ? 'bg-slate-900/15' : 'bg-slate-700/60'}`}
              />
              {ASPECT_RATIO_PRESETS.map((item) => {
                const Icon = ASPECT_ICONS[item.id];
                const active = item.id === settings.aspectRatioId;
                return (
                  <IconButton
                    key={item.id}
                    size="h-8 w-8"
                    label={`Poměr stran: ${item.label} (${item.ratioText})`}
                    title={`Poměr stran: ${item.label} (${item.ratioText})`}
                    tone={`transition ${active ? softActive.sky : ui.pillIdle}`}
                    onClick={() => configure({ aspectRatioId: item.id })}
                  >
                    <Icon className="h-4 w-4" />
                  </IconButton>
                );
              })}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => dispatch({ type: 'toggleHint' })}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
              showHint ? softActive.amber : ui.pillIdle
            }`}
            title="Zobrazit nápovědu"
          >
            <Lightbulb className="h-4 w-4" />
            Nápověda
          </button>

          <button
            type="button"
            onClick={() => dispatch({ type: 'restart' })}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${ui.pillIdle}`}
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

          <div
            className={`mx-0.5 h-5 w-px ${isLight ? 'bg-slate-900/15' : 'bg-slate-700/60'}`}
          />

          <IconButton
            size="h-8 w-8"
            label="Zobrazit stopu"
            title={
              settings.showTrail
                ? 'Stopa zapnuta: kreslí prošlou cestu'
                : 'Stopa vypnuta: cesta se nekreslí'
            }
            tone={`transition ${
              settings.showTrail ? softActive.sky : ui.pillMuted
            }`}
            onClick={() => configure({ showTrail: !settings.showTrail })}
          >
            <Pencil className="h-4 w-4" />
          </IconButton>

          <SoundButton
            size="h-8 w-8"
            enabled={settings.sound}
            theme={theme}
            dispatch={dispatch}
          />

          <IconButton
            size="h-8 w-8"
            label="Tisk na A4"
            title="Vytisknout čisté černobílé bludiště na A4"
            tone={`transition ${ui.pillIdle}`}
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
          </IconButton>

          <IconButton
            size="h-8 w-8"
            label="Celá obrazovka"
            title="Skrýt menu a roztáhnout bludiště na celou obrazovku (F)"
            tone={`transition ${ui.pillIdle}`}
            onClick={onEnterFocus}
          >
            <Maximize2 className="h-4 w-4" />
          </IconButton>

          <IconButton
            size="h-8 w-8"
            label="Nápověda k ovládání"
            title={
              showHelp
                ? 'Skrýt nápovědu k ovládání'
                : 'Zobrazit nápovědu k ovládání'
            }
            tone={`transition ${showHelp ? softActive.sky : ui.pillMuted}`}
            onClick={() => setShowHelp((open) => !open)}
          >
            <CircleHelp className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-t pt-2.5 ${ui.divider}`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-xs font-medium ${ui.label}`}>Režim:</span>
          {MODES.map((item) => (
            <OptionPill
              key={item.id}
              active={settings.mode === item.id}
              activeClass={
                item.id === 'classic' ? softActive.emerald : softActive.amber
              }
              idleClass={ui.pillIdle}
              disabledClass={ui.pillDisabled}
              Icon={item.Icon}
              onClick={() => configure({ mode: item.id })}
            >
              {item.label}
            </OptionPill>
          ))}
          <OptionPill
            active={settings.marbleMode}
            activeClass={softActive.sky}
            idleClass={ui.pillIdle}
            disabledClass={ui.pillDisabled}
            Icon={Disc}
            title="Kutálení kuličky nakláněním tabletu (na PC drž šipky / WASD)"
            onClick={() => {
              if (!settings.marbleMode) unlockAudio();
              configure({ marbleMode: !settings.marbleMode });
            }}
          >
            Kulička
          </OptionPill>
          <OptionPill
            active={settings.fogOfWar}
            activeClass={softActive.amber}
            idleClass={ui.pillIdle}
            disabledClass={ui.pillDisabled}
            Icon={Flashlight}
            title="Mlha války se svítilnou — neprozkoumané bludiště je skryté v temnotě"
            onClick={() => configure({ fogOfWar: !settings.fogOfWar })}
          >
            Mlha
          </OptionPill>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-xs font-medium ${ui.label}`}>Styl:</span>
          {(Object.keys(MAZE_STYLES) as MazeStyle[]).map((style) => (
            <OptionPill
              key={style}
              active={settings.style === style}
              activeClass="bg-violet-500 text-white shadow-sm shadow-violet-500/40"
              idleClass={ui.pillIdle}
              disabledClass={ui.pillDisabled}
              Icon={MAZE_STYLES[style].Icon}
              onClick={() => configure({ style })}
            >
              {MAZE_STYLES[style].label}
            </OptionPill>
          ))}
          <OptionPill
            active={settings.bridges}
            activeClass={softActive.violet}
            idleClass={ui.pillIdle}
            disabledClass={ui.pillDisabled}
            Icon={Layers}
            disabled={!MAZE_STYLES[settings.style].supportsBridges}
            title="Mosty (nad/pod) — počet roste s velikostí bludiště"
            onClick={() => configure({ bridges: !settings.bridges })}
          >
            Mosty
          </OptionPill>
          <OptionPill
            active={settings.braided}
            activeClass={softActive.cyan}
            idleClass={ui.pillIdle}
            disabledClass={ui.pillDisabled}
            Icon={InfinityIcon}
            title="Propojí část slepých uliček do smyček (více možných cest)"
            onClick={() => configure({ braided: !settings.braided })}
          >
            Smyčky
          </OptionPill>
        </div>
      </div>

      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-t pt-2.5 ${ui.divider}`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-xs font-medium ${ui.label}`}>Generátor:</span>
          {MAZE_ALGORITHMS.map((algo) => (
            <OptionPill
              key={algo.id}
              active={settings.algorithm === algo.id}
              activeClass="bg-teal-500 text-slate-950 shadow-sm shadow-teal-500/40"
              idleClass={ui.pillIdle}
              disabledClass={ui.pillDisabled}
              Icon={GitBranch}
              onClick={() => configure({ algorithm: algo.id })}
            >
              {algo.label}
            </OptionPill>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-medium ${ui.label}`}>Motiv:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {MAZE_THEMES.map((item) => (
              <OptionPill
                key={item.id}
                active={item.id === settings.themeId}
                activeClass="bg-pink-500 text-white shadow-sm shadow-pink-500/40"
                idleClass={ui.pillIdle}
                disabledClass={ui.pillDisabled}
                Icon={THEME_ICONS[item.id]}
                onClick={() => configure({ themeId: item.id })}
              >
                {item.label}
              </OptionPill>
            ))}
          </div>
        </div>
      </div>

      {settings.mode === 'collect' && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 border-t pt-2.5 ${ui.divider}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-medium ${ui.label}`}>
              Počet cílů:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {TARGET_COUNT_OPTIONS.map((item) => (
                <OptionPill
                  key={String(item.value)}
                  active={item.value === settings.targetCount}
                  activeClass="bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/40"
                  idleClass={ui.pillIdle}
                  disabledClass={ui.pillDisabled}
                  onClick={() => configure({ targetCount: item.value })}
                >
                  {item.label}
                </OptionPill>
              ))}
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <p
          className={`border-t pt-2.5 text-center text-xs ${ui.divider} ${ui.label}`}
        >
          Ovládání:{' '}
          <kbd className={`rounded px-1.5 py-0.5 ${ui.kbd}`}>↑ ↓ ← →</kbd>,{' '}
          <kbd className={`rounded px-1.5 py-0.5 ${ui.kbd}`}>WASD</kbd> nebo{' '}
          <span className={ui.statValue}>tažení prstem po bludišti</span> ·{' '}
          <kbd className={`rounded px-1.5 py-0.5 ${ui.kbd}`}>R</kbd> nové
          bludiště · <kbd className={`rounded px-1.5 py-0.5 ${ui.kbd}`}>F</kbd>{' '}
          celá obrazovka
        </p>
      )}
    </section>
  );
}
