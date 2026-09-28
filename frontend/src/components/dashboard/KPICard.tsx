'use client';

import React, { useState } from 'react';
import { LucideIcon, TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';
import { StatusBadge, StatusVariant } from '../common/StatusBadge';
import { ProvenanceBadge, ProvenanceCategory } from '../common/ProvenanceBadge';

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
  provenance?: ProvenanceCategory | string;
  tooltip: string;
  accentColor?: 'cyan' | 'emerald' | 'amber' | 'blue' | 'purple' | 'indigo';
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  subtitle,
  status,
  provenance,
  tooltip,
  accentColor = 'indigo',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const iconStyles = {
    indigo: 'bg-[#5E6AD2]/15 border-[#5E6AD2]/30 text-[#5E6AD2]',
    cyan: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
    emerald: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    amber: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    blue: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
    purple: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
  }[accentColor];

  return (
    <div
      className="relative rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.07] p-5 transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.14] hover:shadow-linear-card-hover shadow-linear-card group flex flex-col justify-between"
    >
      {/* Top row: Icon + Title + (Provenance / Tooltip) */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${iconStyles} shadow-sm transition-transform duration-200 group-hover:scale-105`}
            >
              <Icon size={15} />
            </div>
            <span className="text-xs font-medium text-[#8A8F98] tracking-tight">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {provenance && <ProvenanceBadge type={provenance} size="xs" />}
            <div className="relative">
              <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip(!showTooltip)}
                className="text-[#8A8F98]/70 hover:text-[#EDEDEF] p-0.5 focus:outline-none transition-colors"
                aria-label="Information"
              >
                <HelpCircle size={13} />
              </button>
              {showTooltip && (
                <div className="absolute right-0 top-6 z-50 w-56 p-2.5 rounded-xl bg-[#0A0A0C] border border-white/[0.12] text-xs text-[#EDEDEF] leading-relaxed shadow-2xl font-sans backdrop-blur-xl">
                  {tooltip}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Value & Unit */}
        <div className="flex items-baseline gap-1.5 my-2">
          <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#EDEDEF]">
            {value}
          </span>
          {unit && (
            <span className="text-xs font-medium text-[#8A8F98]">
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Bottom row: Trend & Status */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2.5 border-t border-white/[0.06] text-xs">
        {trend ? (
          <div
            className={`flex items-center gap-1 font-mono text-[11px] ${
              trend.isPositiveGood ?? true
                ? 'text-emerald-400'
                : 'text-amber-400'
            }`}
          >
            {trend.isUp ?? true ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{trend.value}</span>
          </div>
        ) : subtitle ? (
          <span className="text-[11px] text-[#8A8F98] font-mono truncate">{subtitle}</span>
        ) : (
          <span className="text-[11px] text-[#8A8F98]/70 font-mono">SCADA Stream</span>
        )}

        {status && <StatusBadge status={status.variant} label={status.label} size="sm" />}
      </div>
    </div>
  );
};
