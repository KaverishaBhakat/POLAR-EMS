'use client';

import React, { useState } from 'react';
import { LucideIcon, TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';
import { StatusBadge, StatusVariant } from '../common/StatusBadge';

interface KPICardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositiveGood?: boolean;
    isUp?: boolean;
  };
  subtitle?: string;
  status?: {
    variant: StatusVariant;
    label?: string;
  };
  tooltip: string;
  accentColor?: 'cyan' | 'emerald' | 'amber' | 'blue' | 'purple';
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  subtitle,
  status,
  tooltip,
  accentColor = 'cyan',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const colors = {
    cyan: {
      border: 'border-cyan-500/30 hover:border-cyan-500/50',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      glow: 'shadow-[0_0_12px_rgba(6,182,212,0.1)]',
    },
    emerald: {
      border: 'border-emerald-500/30 hover:border-emerald-500/50',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      glow: 'shadow-[0_0_12px_rgba(16,185,129,0.1)]',
    },
    amber: {
      border: 'border-amber-500/30 hover:border-amber-500/50',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      glow: 'shadow-[0_0_12px_rgba(245,158,11,0.1)]',
    },
    blue: {
      border: 'border-blue-500/30 hover:border-blue-500/50',
      iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      glow: 'shadow-[0_0_12px_rgba(59,130,246,0.1)]',
    },
    purple: {
      border: 'border-purple-500/30 hover:border-purple-500/50',
      iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      glow: 'shadow-[0_0_12px_rgba(168,85,247,0.1)]',
    },
  }[accentColor];

  return (
    <div
      className={`relative bg-[#0E1724]/90 backdrop-blur-md rounded-lg border ${colors.border} ${colors.glow} p-4 transition-all duration-300 group`}
    >
      {/* Top row: Icon + Title + Tooltip */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded flex items-center justify-center border ${colors.iconBg}`}
          >
            <Icon size={16} />
          </div>
          <span className="text-[11px] font-mono font-medium tracking-wider uppercase text-slate-300">
            {title}
          </span>
        </div>

        <div className="relative">
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            className="text-slate-500 hover:text-slate-300 p-0.5 focus:outline-none"
            aria-label="Info"
          >
            <HelpCircle size={13} />
          </button>
          {showTooltip && (
            <div className="absolute right-0 top-6 z-50 w-52 p-2 rounded bg-[#0A101A] border border-cyan-500/40 text-[10px] text-slate-300 leading-relaxed shadow-xl font-mono">
              {tooltip}
            </div>
          )}
        </div>
      </div>

      {/* Main Value & Unit */}
      <div className="flex items-baseline gap-1.5 my-1">
        <span className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
          {value}
        </span>
        <span className="text-xs font-mono font-semibold text-slate-400 uppercase">
          {unit}
        </span>
      </div>

      {/* Subtitle / Trend & Status Badge */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#1B2C42]/50 text-[11px]">
        {trend ? (
          <div
            className={`flex items-center gap-1 font-mono text-[10px] ${
              trend.isPositiveGood ?? true
                ? 'text-emerald-400'
                : 'text-amber-400'
            }`}
          >
            {trend.isUp ?? true ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{trend.value}</span>
          </div>
        ) : subtitle ? (
          <span className="text-[10px] text-slate-400 font-mono truncate">{subtitle}</span>
        ) : (
          <span />
        )}

        {status && <StatusBadge status={status.variant} label={status.label} size="sm" />}
      </div>
    </div>
  );
};
