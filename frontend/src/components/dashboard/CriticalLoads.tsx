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
import { GlassCard } from '../ui/GlassCard';

interface CriticalLoadsProps {
  loads: (CriticalLoadItem | CriticalLoadRecord)[];
}

const getLoadIcon = (name: string, category: string) => {
  const n = name.toLowerCase();
  if (n.includes('heat') || n.includes('hvac')) return <Thermometer size={14} className="text-rose-400" />;
  if (n.includes('med') || n.includes('life') || n.includes('hospital')) return <HeartPulse size={14} className="text-rose-400" />;
  if (n.includes('comm') || n.includes('sat') || n.includes('vlf')) return <Radio size={14} className="text-accent-bright" />;
  if (n.includes('water') || n.includes('melt') || n.includes('plant')) return <Droplet size={14} className="text-blue-400" />;
  if (n.includes('lab') || n.includes('physics') || n.includes('research')) return <FlaskConical size={14} className="text-emerald-400" />;
  if (n.includes('cold') || n.includes('freez') || n.includes('sample')) return <Snowflake size={14} className="text-cyan-300" />;
  if (n.includes('computer') || n.includes('workstation') || n.includes('light')) return <Laptop size={14} className="text-foreground-muted" />;
  if (category === 'CRITICAL') return <ShieldCheck size={14} className="text-rose-400" />;
  return <Cpu size={14} className="text-foreground-muted" />;
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
    <GlassCard className="p-4 sm:p-5 w-full min-w-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-3 border-b border-white/6 gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            Station Subsystems &amp; Critical Loads (PostgreSQL)
          </h3>
          <p className="text-xs text-foreground-muted mt-0.5">
            Priority-tiered circuit allocation: Critical life support guaranteed 100% un-sheddable under all operating conditions.
          </p>
        </div>
        <div className="text-right font-mono flex-shrink-0">
          <span className="text-xs text-emerald-400 font-semibold">{criticalOnlyKW} kW</span>
          <span className="text-[11px] text-foreground-muted ml-1">/ {totalKW} kW Total</span>
        </div>
      </div>

      {normalizedLoads.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-white/10 rounded-xl text-foreground-muted text-xs">
          No Critical Load circuits configured for this station in PostgreSQL database.
        </div>
      ) : (
        <div className="space-y-2 w-full min-w-0">
          {normalizedLoads.map((item) => {
            const categoryBadge = {
              CRITICAL: {
                badge: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
                bar: 'bg-rose-500',
                shedLabel: 'NON-SHEDDABLE',
                shedIcon: <Lock size={10} className="text-rose-400" />,
              },
              IMPORTANT: {
                badge: 'bg-accent/10 text-accent-bright border-accent/30',
                bar: 'bg-accent',
                shedLabel: 'HIGH PRIORITY',
                shedIcon: <Lock size={10} className="text-accent-bright" />,
              },
              FLEXIBLE: {
                badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                bar: 'bg-amber-400',
                shedLabel: 'SHEDDABLE',
                shedIcon: <Unlock size={10} className="text-amber-400" />,
              },
            }[item.category] || {
              badge: 'bg-white/5 text-foreground-muted border-white/10',
              bar: 'bg-foreground-muted',
              shedLabel: 'STANDARD',
              shedIcon: <Unlock size={10} className="text-foreground-muted" />,
            };

            return (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/10 transition-colors w-full min-w-0 overflow-hidden"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/6 flex items-center justify-center flex-shrink-0">
                    {getLoadIcon(item.name, item.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-accent-bright font-semibold border border-white/6 flex-shrink-0">
                        P{item.priority}
                      </span>
                      <span className="text-xs font-medium text-foreground truncate">
                        {item.name}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${categoryBadge.badge}`}
                      >
                        {item.category}
                      </span>
                      <span className="text-[10px] text-foreground-muted flex items-center gap-1 font-mono whitespace-nowrap flex-shrink-0">
                        {categoryBadge.shedIcon}
                        {categoryBadge.shedLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress and percentage */}
                <div className="flex items-center gap-3 flex-1 max-w-sm font-mono min-w-0 w-full sm:w-auto">
                  <div className="flex-1 bg-white/[0.04] h-2 rounded-full overflow-hidden border border-white/5 min-w-[60px]">
                    <div
                      className={`h-full ${categoryBadge.bar} transition-all duration-300 rounded-full`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground min-w-[65px] text-right whitespace-nowrap flex-shrink-0">
                    {item.powerKW} <span className="text-[10px] text-foreground-muted font-normal">/ {item.ratedKW} kW</span>
                  </span>
                  <span className="text-[11px] text-foreground-muted min-w-[32px] text-right whitespace-nowrap flex-shrink-0">
                    {item.percentage}%
                  </span>
                </div>

                <StatusBadge
                  status={item.status === 'ONLINE' ? 'RUNNING' : item.status === 'SHED' ? 'OFFLINE' : item.status}
                  size="sm"
                  className="flex-shrink-0 self-start sm:self-center"
                />
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
};
