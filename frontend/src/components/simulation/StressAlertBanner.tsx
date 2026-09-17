'use client';

import React from 'react';
import { AlertTriangle, AlertOctagon, ShieldAlert, ZapOff, CheckCircle2 } from 'lucide-react';

interface StressAlertBannerProps {
  stressLevel: 'NORMAL' | 'ELEVATED' | 'CRITICAL';
  actions: string[];
}

export const StressAlertBanner: React.FC<StressAlertBannerProps> = ({
  stressLevel,
  actions,
}) => {
  if (stressLevel === 'NORMAL') return null;

  const isCritical = stressLevel === 'CRITICAL';

  return (
    <div
      className={`rounded-lg border p-5 font-mono shadow-2xl animate-pulse-subtle ${
        isCritical
          ? 'bg-gradient-to-r from-rose-950/90 via-[#1A0A0E] to-rose-950/90 border-rose-500/60 shadow-[0_0_30px_rgba(239,68,68,0.25)]'
          : 'bg-gradient-to-r from-amber-950/90 via-[#1A150A] to-amber-950/90 border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
      }`}
    >
      <div className="flex items-start gap-3.5 mb-3.5">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isCritical
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
          }`}
        >
          {isCritical ? <AlertOctagon size={24} /> : <AlertTriangle size={24} />}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h3
              className={`text-sm sm:text-base font-bold uppercase tracking-wider ${
                isCritical ? 'text-rose-200' : 'text-amber-200'
              }`}
            >
              ENERGY STRESS DETECTED — POLAR CONTINGENCY PROTOCOL ACTIVE
            </h3>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                isCritical
                  ? 'bg-rose-500 text-black'
                  : 'bg-amber-500 text-black'
              }`}
            >
              {stressLevel}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Simulated net generation deficit exceeds standard reserve envelope. Automated safety shedding protocols triggered.
          </p>
        </div>
      </div>

      {/* Contingency Actions List */}
      <div className="space-y-1.5 pt-3 border-t border-[#1B2C42]/60">
        <p className="text-[11px] font-bold text-slate-200 uppercase mb-2 flex items-center gap-1.5">
          <ShieldAlert size={14} className={isCritical ? 'text-rose-400' : 'text-amber-400'} />
          Executed Microgrid Protection Sequence:
        </p>
        {actions.map((act, i) => (
          <div
            key={i}
            className="flex items-start gap-2 text-xs p-2 rounded bg-[#080D14]/80 border border-[#1B2C42] text-slate-200"
          >
            <span className="w-4 h-4 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span>{act}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
