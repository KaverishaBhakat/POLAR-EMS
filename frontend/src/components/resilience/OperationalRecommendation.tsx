'use client';

import React from 'react';
import { Lightbulb, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ResilienceMetrics } from '@/lib/types';

interface OperationalRecommendationProps {
  recommendation?: string | null;
  metrics?: ResilienceMetrics | null;
  scenarioName: string;
}

export const OperationalRecommendation: React.FC<OperationalRecommendationProps> = ({
  recommendation,
  metrics,
  scenarioName,
}) => {
  const isProtected = (metrics?.resilience_status || 'PROTECTED') === 'PROTECTED';
  const text =
    recommendation ||
    `Under the modeled ${scenarioName} scenario, the microgrid remains ${
      isProtected ? 'PROTECTED' : 'AT_RISK'
    } with ${metrics?.critical_load_reliability_percent?.toFixed(1) ?? 100}% critical-load reliability.`;

  return (
    <div className="bg-[#0E1724]/95 rounded-lg border border-[#1B2C42] p-4 sm:p-5 font-mono space-y-3">
      <div className="flex items-center justify-between border-b border-[#1B2C42]/60 pb-2.5">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
            SCADA Operational Recommendation &amp; Dispatch Analysis
          </h3>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
            isProtected
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}
        >
          {isProtected ? 'NOMINAL SAFETY ENVELOPE' : 'CONTINGENCY DEFICIT DETECTED'}
        </span>
      </div>

      <div className="p-3.5 rounded-lg bg-[#080E17] border border-[#1B2C42] text-xs text-slate-200 leading-relaxed space-y-2">
        <p className="text-slate-200 font-mono">{text}</p>

        {metrics && (
          <div className="pt-2 border-t border-[#1B2C42]/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span>Genset Runtime: {metrics.generator_runtime_hours} h committed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span>Renewable Utilization: {metrics.renewable_utilization_percent?.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span>Battery Min SOC: {metrics.minimum_battery_soc_percent?.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span>Critical Load Shed: {metrics.total_critical_load_shed_kwh?.toFixed(1)} kWh</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
