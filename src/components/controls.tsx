import { Volume2, VolumeX, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Dispatch } from '../game/useGame';

export function OptionPill({
  active,
  activeClass,
  onClick,
  Icon,
  children,
}: {
  active: boolean;
  activeClass: string;
  onClick: () => void;
  Icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${Icon ? 'inline-flex cursor-pointer items-center gap-1.5' : 'cursor-pointer'} rounded-xl px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
        active
          ? activeClass
          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
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
  dispatch,
}: {
  size: 'h-8 w-8' | 'h-9 w-9';
  enabled: boolean;
  dispatch: Dispatch;
}) {
  const label = enabled ? 'Vypnout zvuky' : 'Zapnout zvuky';
  return (
    <IconButton
      size={size}
      label={label}
      title={label}
      tone={`transition ${
        enabled
          ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
          : 'bg-slate-800/60 text-slate-500 hover:bg-slate-700'
      }`}
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
