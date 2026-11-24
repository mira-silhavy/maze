import { Volume2, VolumeX, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Dispatch } from '../game/useGame';
import type { MazeTheme } from '../themes/catalog';

export function OptionPill({
  active,
  activeClass,
  idleClass = 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white',
  disabledClass = 'bg-slate-800/40 text-slate-600',
  onClick,
  Icon,
  disabled,
  title,
  children,
}: {
  active: boolean;
  activeClass: string;
  idleClass?: string;
  disabledClass?: string;
  onClick: () => void;
  Icon?: LucideIcon;
  disabled?: boolean;
  title?: string;
  children: ReactNode;
}) {
  const cursor = disabled ? 'cursor-not-allowed' : 'cursor-pointer';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${Icon ? `inline-flex ${cursor} items-center gap-1.5` : cursor} rounded-xl px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
        disabled ? disabledClass : active ? activeClass : idleClass
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

export function IconButton({
  size,
  tone,
  label,
  title,
  onClick,
  children,
}: {
  size: 'h-8 w-8' | 'h-9 w-9';
  tone: string;
  label: string;
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title}
      className={`flex ${size} cursor-pointer items-center justify-center rounded-xl ${tone}`}
    >
      {children}
    </button>
  );
}

export function SoundButton({
  size,
  enabled,
  theme,
  dispatch,
}: {
  size: 'h-8 w-8' | 'h-9 w-9';
  enabled: boolean;
  theme?: MazeTheme;
  dispatch: Dispatch;
}) {
  const label = enabled ? 'Vypnout zvuky' : 'Zapnout zvuky';
  const onTone =
    theme?.ui.pillIdle ?? 'bg-slate-800 text-slate-200 hover:bg-slate-700';
  const offTone =
    theme?.ui.pillMuted ?? 'bg-slate-800/60 text-slate-500 hover:bg-slate-700';
  return (
    <IconButton
      size={size}
      label={label}
      title={label}
      tone={`transition ${enabled ? onTone : offTone}`}
      onClick={() =>
        dispatch({ type: 'configure', patch: { sound: !enabled } })
      }
    >
      {enabled ? (
        <Volume2 className="h-4 w-4" />
      ) : (
        <VolumeX className="h-4 w-4" />
      )}
    </IconButton>
  );
}
