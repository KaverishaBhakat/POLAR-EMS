'use client';

import React from 'react';
import { CriticalLoadItem } from '@/lib/types';
import { Shield, ShieldCheck, Thermometer, Radio, HeartPulse, Droplet, FlaskConical, Snowflake } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface CriticalLoadsProps {
  loads: CriticalLoadItem[];
}

const ICONS: Record<string, React.ReactNode> = {
  'load-heat': <Thermometer size={14} className="text-rose-400" />,
  'load-heat-b': <Thermometer size={14} className="text-rose-400" />,
  'load-med': <HeartPulse size={14} className="text-rose-400" />,
  'load-med-b': <HeartPulse size={14} className="text-rose-400" />,
  'load-comm': <Radio size={14} className="text-cyan-400" />,
  'load-comm-b': <Radio size={14} className="text-cyan-400" />,
  'load-water': <Droplet size={14} className="text-blue-400" />,
  'load-water-b': <Droplet size={14} className="text-blue-400" />,
  'load-lab': <FlaskConical size={14} className="text-purple-400" />,
  'load-lab-b': <FlaskConical size={14} className="text-purple-400" />,
  'load-cold': <Snowflake size={14} className="text-cyan-300" />,
  'load-cold-b': <Snowflake size={14} className="text-cyan-300" />,
};

export const CriticalLoads: React.FC<CriticalLoadsProps> = ({ loads }) => {
  const totalKW = loads.reduce((acc, l) => acc + l.powerKW, 0);
  const criticalOnlyKW = loads
    .filter((l) => l.category === 'CRITICAL')
    .reduce((acc, l) => acc + l.powerKW, 0);

  return (
    <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-[#1B2C42]/50">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Station Subsystems & Critical Loads
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Priority-tiered load allocation: Critical life support guaranteed 100% un-sheddable
          </p>
        </div>
        <div className="text-right font-mono">
          <span className="text-xs text-emerald-400 font-bold">{criticalOnlyKW} kW</span>
          <span className="text-[10px] text-slate-400 ml-1">/ {totalKW} kW Total</span>
        </div>
      </div>

      <div className="space-y-2.5">
        {loads.map((item) => {
          const categoryBadge = {
            CRITICAL: {
              badge: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
              bar: 'bg-rose-500',
            },
            IMPORTANT: {
              badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
              bar: 'bg-cyan-400',
            },
            FLEXIBLE: {
              badge: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
              bar: 'bg-slate-400',
            },
          }[item.category];

          return (
            <div
              key={item.id}
              className="p-2.5 rounded bg-[#0A121E] border border-[#1B2C42]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-[200px]">
                <div className="w-6 h-6 rounded bg-[#132032] border border-[#1B2C42] flex items-center justify-center flex-shrink-0">
                  {ICONS[item.id] || <Shield size={14} className="text-slate-400" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-slate-200">
                      {item.name}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${categoryBadge.badge}`}
                    >
                      {item.category}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {item.subsystem}
                  </span>
                </div>
              </div>

              {/* Progress and percentage */}
              <div className="flex items-center gap-3 flex-1 max-w-xs font-mono">
                <div className="flex-1 bg-[#080D14] h-1.5 rounded-full overflow-hidden border border-[#1B2C42]">
                  <div
                    className={`h-full ${categoryBadge.bar}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-100 min-w-[55px] text-right">
                  {item.powerKW} kW
                </span>
                <span className="text-[10px] text-slate-400 min-w-[35px] text-right">
                  {item.percentage}%
                </span>
              </div>

              <StatusBadge status={item.status} size="sm" />
            </div>
          );
        })}
      </div>
    </div>
  );
};
