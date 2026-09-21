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
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
    glow: 'shadow-[0_0_8px_rgba(16,185,129,0.35)]',
  },
  ONLINE: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
    glow: 'shadow-[0_0_8px_rgba(16,185,129,0.35)]',
  },
  RUNNING: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
    glow: 'shadow-[0_0_8px_rgba(16,185,129,0.35)]',
  },
  PROTECTED: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    dot: 'bg-cyan-400',
    glow: 'shadow-[0_0_8px_rgba(6,182,212,0.35)]',
  },
  CHARGING: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    dot: 'bg-cyan-400',
    glow: 'shadow-[0_0_8px_rgba(6,182,212,0.35)]',
  },
  DISCHARGING: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    dot: 'bg-blue-400',
    glow: 'shadow-[0_0_8px_rgba(59,130,246,0.35)]',
  },
  IDLE: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
    glow: '',
  },
  OPTIMIZED: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    dot: 'bg-blue-400',
    glow: '',
  },
  STANDBY: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
    glow: '',
  },
  WARNING: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
    glow: 'shadow-[0_0_8px_rgba(245,158,11,0.35)]',
  },
  CRITICAL: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    dot: 'bg-rose-400',
    glow: 'shadow-[0_0_8px_rgba(239,68,68,0.35)]',
  },
  OFFLINE: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
    dot: 'bg-slate-500',
    glow: '',
  },
  MAINTENANCE: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    dot: 'bg-purple-400',
    glow: '',
  },
  SHED: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    dot: 'bg-orange-400',
    glow: '',
  },
  INFO: {
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    border: 'border-sky-500/30',
    dot: 'bg-sky-400',
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
  const normalized = status.toUpperCase();
  const config = STATUS_CONFIG[normalized] || STATUS_CONFIG.INFO;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 tracking-wider gap-1.5',
    md: 'text-xs px-2.5 py-1 tracking-wider gap-2',
    lg: 'text-sm px-3 py-1.5 tracking-wider gap-2.5',
  }[size];

  const dotSize = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-mono font-medium uppercase rounded border ${config.bg} ${config.text} ${config.border} ${config.glow} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span
          className={`rounded-full ${config.dot} ${
            normalized === 'OPERATIONAL' || normalized === 'RUNNING' || normalized === 'CRITICAL'
              ? 'animate-pulse'
              : ''
          } ${dotSize}`}
        />
      )}
      {label || status}
    </span>
  );
};
