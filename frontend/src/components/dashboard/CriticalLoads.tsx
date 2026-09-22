'use client';

import React from 'react';
import { CriticalLoadItem, CriticalLoadRecord } from '@/lib/types';
import {
  Shield,
  ShieldCheck,
  Thermometer,
  Radio,
  HeartPulse,
  Droplet,
  FlaskConical,
  Snowflake,
  Cpu,
  Laptop,
  Zap,
  Lock,
  Unlock,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface CriticalLoadsProps {
  loads: (CriticalLoadItem | CriticalLoadRecord)[];
}

const getLoadIcon = (name: string, category: string) => {
  const n = name.toLowerCase();
  if (n.includes('heat') || n.includes('hvac')) return <Thermometer size={14} className="text-rose-400" />;
  if (n.includes('med') || n.includes('life') || n.includes('hospital')) return <HeartPulse size={14} className="text-rose-400" />;
  if (n.includes('comm') || n.includes('sat') || n.includes('vlf')) return <Radio size={14} className="text-cyan-400" />;
  if (n.includes('water') || n.includes('melt') || n.includes('plant')) return <Droplet size={14} className="text-blue-400" />;
  if (n.includes('lab') || n.includes('physics') || n.includes('research')) return <FlaskConical size={14} className="text-emerald-400" />;
  if (n.includes('cold') || n.includes('freez') || n.includes('sample')) return <Snowflake size={14} className="text-cyan-300" />;
  if (n.includes('computer') || n.includes('workstation') || n.includes('light')) return <Laptop size={14} className="text-slate-300" />;
  if (category === 'CRITICAL') return <ShieldCheck size={14} className="text-rose-400" />;
  return <Cpu size={14} className="text-slate-400" />;
};

export const CriticalLoads: React.FC<CriticalLoadsProps> = ({ loads }) => {
  const normalizedLoads = loads.map((l, idx) => {
    const isRecord = 'ratedPower' in l && 'currentPower' in l;
    const powerKW = isRecord ? (l as CriticalLoadRecord).currentPower : (l as CriticalLoadItem).powerKW;
    const ratedKW = isRecord ? (l as CriticalLoadRecord).ratedPower : (l as CriticalLoadItem).ratedPower || powerKW;
    const percentage = ratedKW > 0 ? Math.min(100, Math.round((powerKW / ratedKW) * 100)) : 100;
    const priority = (l as any).priority || idx + 1;
    const status = l.status || 'ONLINE';

    return {
      id: l.id,
      name: l.name,
      category: l.category as 'CRITICAL' | 'IMPORTANT' | 'FLEXIBLE',
      priority,
      powerKW,
      ratedKW,
      percentage,
      status,
      subsystem: (l as any).subsystem || l.name,
    };
  });

  const totalKW = Math.round(normalizedLoads.reduce((acc, l) => acc + l.powerKW, 0) * 10) / 10;
  const criticalOnlyKW = Math.round(
    normalizedLoads
      .filter((l) => l.category === 'CRITICAL')
      .reduce((acc, l) => acc + l.powerKW, 0) * 10
  ) / 10;

  return (
    <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-2.5 border-b border-[#1B2C42]/50 gap-2">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Station Subsystems & Critical Loads (PostgreSQL)
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Priority-tiered circuit allocation: Critical life support guaranteed 100% un-sheddable under all operating conditions.
          </p>
        </div>
        <div className="text-right font-mono">
          <span className="text-xs text-emerald-400 font-bold">{criticalOnlyKW} kW</span>
          <span className="text-[10px] text-slate-400 ml-1">/ {totalKW} kW Total</span>
        </div>
      </div>

      {normalizedLoads.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-[#1B2C42] rounded-lg text-slate-400 font-mono text-xs">
          No Critical Load circuits configured for this station in PostgreSQL database.
        </div>
      ) : (
        <div className="space-y-2.5">
          {normalizedLoads.map((item) => {
            const categoryBadge = {
              CRITICAL: {
                badge: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
                bar: 'bg-rose-500',
                shedLabel: 'NON-SHEDDABLE',
                shedIcon: <Lock size={10} className="text-rose-400" />,
              },
              IMPORTANT: {
                badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
                bar: 'bg-cyan-400',
                shedLabel: 'HIGH PRIORITY',
                shedIcon: <Lock size={10} className="text-cyan-400" />,
              },
              FLEXIBLE: {
                badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
                bar: 'bg-amber-400',
                shedLabel: 'SHEDDABLE',
                shedIcon: <Unlock size={10} className="text-amber-400" />,
              },
            }[item.category] || {
              badge: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
              bar: 'bg-slate-400',
              shedLabel: 'STANDARD',
              shedIcon: <Unlock size={10} className="text-slate-400" />,
            };

            return (
              <div
                key={item.id}
                className="p-2.5 rounded bg-[#0A121E] border border-[#1B2C42]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-cyan-500/30 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-[240px]">
                  <div className="w-6 h-6 rounded bg-[#132032] border border-[#1B2C42] flex items-center justify-center flex-shrink-0">
                    {getLoadIcon(item.name, item.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[#1B2C42]/80 text-cyan-300 font-bold border border-[#1B2C42]">
                        P{item.priority}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-200">
                        {item.name}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${categoryBadge.badge}`}
                      >
                        {item.category}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
                        {categoryBadge.shedIcon}
                        {categoryBadge.shedLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress and percentage */}
                <div className="flex items-center gap-3 flex-1 max-w-sm font-mono">
                  <div className="flex-1 bg-[#080D14] h-2 rounded-full overflow-hidden border border-[#1B2C42]">
                    <div
                      className={`h-full ${categoryBadge.bar} transition-all duration-300`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-100 min-w-[70px] text-right">
                    {item.powerKW} <span className="text-[10px] text-slate-400 font-normal">/ {item.ratedKW} kW</span>
                  </span>
                  <span className="text-[10px] text-slate-400 min-w-[35px] text-right">
                    {item.percentage}%
                  </span>
                </div>

                <StatusBadge
                  status={item.status === 'ONLINE' ? 'RUNNING' : item.status === 'SHED' ? 'OFFLINE' : item.status}
                  size="sm"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
