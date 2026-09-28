import React from 'react';

export type StatusVariant =
  | 'OPERATIONAL'
  | 'RUNNING'
  | 'STANDBY'
  | 'OFFLINE'
  | 'MAINTENANCE'
  | 'PROTECTED'
  | 'OPTIMIZED'
  | 'SHED'
  | 'CRITICAL'
  | 'WARNING'
  | 'INFO'
  | 'CHARGING'
  | 'DISCHARGING'
  | 'IDLE';

interface StatusBadgeProps {
  status: StatusVariant | string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; border: string; dot: string; glow: string }
> = {
  OPERATIONAL: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
    glow: 'shadow-[0_0_8px_rgba(16,185,129,0.3)]',
  },
  ONLINE: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
    glow: 'shadow-[0_0_8px_rgba(16,185,129,0.3)]',
  },
  RUNNING: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
    glow: 'shadow-[0_0_8px_rgba(16,185,129,0.3)]',
  },
  CHARGING: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-300',
    border: 'border-indigo-500/20',
    dot: 'bg-indigo-400',
    glow: 'shadow-[0_0_8px_rgba(94,106,210,0.3)]',
  },
  DISCHARGING: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
    glow: 'shadow-[0_0_8px_rgba(245,158,11,0.3)]',
  },
  STANDBY: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-300',
    border: 'border-slate-500/20',
    dot: 'bg-slate-400',
    glow: '',
  },
  IDLE: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-300',
    border: 'border-slate-500/20',
    dot: 'bg-slate-400',
    glow: '',
  },
  OPTIMIZED: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-300',
    border: 'border-indigo-500/20',
    dot: 'bg-indigo-400',
    glow: 'shadow-[0_0_8px_rgba(94,106,210,0.3)]',
  },
  PROTECTED: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
    glow: 'shadow-[0_0_8px_rgba(16,185,129,0.3)]',
  },
  SHED: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-300',
    border: 'border-rose-500/20',
    dot: 'bg-rose-400',
    glow: '',
  },
  WARNING: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
    glow: 'shadow-[0_0_8px_rgba(245,158,11,0.3)]',
  },
  CRITICAL: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-300',
    border: 'border-rose-500/20',
    dot: 'bg-rose-400',
    glow: 'shadow-[0_0_8px_rgba(239,68,68,0.3)]',
  },
  INFO: {
    bg: 'bg-sky-500/10',
    text: 'text-sky-300',
    border: 'border-sky-500/20',
    dot: 'bg-sky-400',
    glow: '',
  },
  MAINTENANCE: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
    glow: '',
  },
  OFFLINE: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
    dot: 'bg-slate-500',
    glow: '',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'sm',
  showDot = true,
  className = '',
}) => {
  const normKey = status.toUpperCase();
  const config = STATUS_CONFIG[normKey] || STATUS_CONFIG.INFO;

  const sizeClasses = {
    sm: 'text-[9.5px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-mono font-medium uppercase rounded-full border tracking-wide select-none whitespace-nowrap flex-shrink-0 ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${config.dot} ${config.glow} flex-shrink-0 animate-pulse`}
        />
      )}
      <span>{label || status}</span>
    </span>
  );
};
