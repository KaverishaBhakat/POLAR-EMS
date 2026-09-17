import React from 'react';

interface MetricCardProps {
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  glow?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'none';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  subtitle,
  badge,
  headerAction,
  children,
  className = '',
  glow = 'none',
}) => {
  const glowBorder = {
    cyan: 'border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]',
    emerald: 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    amber: 'border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
    rose: 'border-rose-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]',
    none: 'border-[#1B2C42]/80 hover:border-[#263D5C]',
  }[glow];

  return (
    <div
      className={`relative bg-[#0E1724]/90 backdrop-blur-md rounded-lg border ${glowBorder} p-4 sm:p-5 transition-all duration-300 ${className}`}
    >
      {/* Corner bracket tech accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-500/40 rounded-tl-sm pointer-events-none" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-500/40 rounded-tr-sm pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-500/40 rounded-bl-sm pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-500/40 rounded-br-sm pointer-events-none" />

      {(title || badge || headerAction) && (
        <div className="flex items-start justify-between gap-3 mb-3.5 pb-2.5 border-b border-[#1B2C42]/50">
          <div>
            {title && (
              <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-sm inline-block" />
                {title}
              </h3>
            )}
            {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {badge}
            {headerAction}
          </div>
        </div>
      )}
      {children}
    </div>
  );
};
