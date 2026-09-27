'use client';

import React from 'react';
import { Sun, Wind, Leaf, CheckCircle2 } from 'lucide-react';
import { HourlyDispatchPoint, ResilienceMetrics } from '@/lib/types';

interface RenewableGenerationPanelProps {
  metrics: ResilienceMetrics | null | undefined;
  dispatch: HourlyDispatchPoint[];
  stationId: string;
}

export const RenewableGenerationPanel: React.FC<RenewableGenerationPanelProps> = ({
  metrics,
  dispatch,
  stationId,
}) => {
  if (!metrics) return null;

  // Sum up from dispatch or metrics
  const totalPVAvail = metrics.total_pv_available_kwh ?? 0;
  const totalPVUsed = dispatch.reduce((acc, pt) => acc + (pt.pv_used_kW ?? pt.solar ?? 0), 0);
  const totalPVCurt = Math.max(0, totalPVAvail - totalPVUsed);
  const pvUtil = totalPVAvail > 0 ? (totalPVUsed / totalPVAvail) * 100 : 100.0;

  const totalWindAvail = metrics.total_wind_available_kwh ?? 0;
  const totalWindUsed = dispatch.reduce((acc, pt) => acc + (pt.wind_used_kW ?? pt.wind ?? 0), 0);
  const totalWindCurt = Math.max(0, totalWindAvail - totalWindUsed);
  const windUtil = totalWindAvail > 0 ? (totalWindUsed / totalWindAvail) * 100 : 100.0;

  const totalRenewAvail = metrics.total_renewable_available_kwh ?? (totalPVAvail + totalWindAvail);
  const totalRenewUsed = metrics.total_renewable_used_kwh ?? (totalPVUsed + totalWindUsed);
  const totalRenewCurt = totalPVCurt + totalWindCurt;
  const renewUtil = metrics.renewable_utilization_percent ?? (totalRenewAvail > 0 ? (totalRenewUsed / totalRenewAvail) * 100 : 100.0);

  return (
    <div className="bg-[#0E1724]/95 rounded-lg border border-[#1B2C42] p-4 sm:p-5 font-mono space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1B2C42]/60 pb-3">
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
            Polar Renewable Generation &amp; Utilization Breakdown
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">
          Solar PV &amp; Katabatic Wind Co-generation Analysis
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Solar PV Card */}
        <div className="p-4 rounded-lg bg-[#080E17] border border-[#1B2C42] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Sun size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase">Solar PV Array</h4>
                <p className="text-[10px] text-slate-400">100 kW Nameplate</p>
              </div>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase">
              {totalPVAvail === 0 ? 'POLAR NIGHT (0 kW)' : 'MODELED CLIMATOLOGY'}
            </span>
          </div>

          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Available Energy:</span>
              <span className="font-bold text-white">{totalPVAvail.toFixed(1)} kWh</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Dispatched &amp; Used:</span>
              <span className="font-bold text-amber-400">{totalPVUsed.toFixed(1)} kWh</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Curtailed Energy:</span>
              <span className="font-bold text-slate-400">{totalPVCurt.toFixed(1)} kWh</span>
            </div>
            <div className="border-t border-[#1B2C42] pt-1.5 flex justify-between font-bold">
              <span className="text-slate-300">Array Utilization:</span>
              <span className="text-amber-400">{pvUtil.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* 2. Wind Power Card */}
        <div className="p-4 rounded-lg bg-[#080E17] border border-[#1B2C42] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Wind size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase">Wind Turbines</h4>
                <p className="text-[10px] text-slate-400">50 kW Nameplate</p>
              </div>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase">
              REAL 2019 AWS DATA
            </span>
          </div>

          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Available Energy:</span>
              <span className="font-bold text-white">{totalWindAvail.toFixed(1)} kWh</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Dispatched &amp; Used:</span>
              <span className="font-bold text-cyan-400">{totalWindUsed.toFixed(1)} kWh</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Curtailed Energy:</span>
              <span className="font-bold text-slate-400">{totalWindCurt.toFixed(1)} kWh</span>
            </div>
            <div className="border-t border-[#1B2C42] pt-1.5 flex justify-between font-bold">
              <span className="text-slate-300">Turbine Utilization:</span>
              <span className="text-cyan-400">{windUtil.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* 3. Total Renewable Card */}
        <div className="p-4 rounded-lg bg-[#080E17] border border-emerald-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Leaf size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase">Total Renewable Fleet</h4>
                <p className="text-[10px] text-slate-400">Solar PV + Wind</p>
              </div>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 uppercase">
              OR-TOOLS MILP
            </span>
          </div>

          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Total Available:</span>
              <span className="font-bold text-white">{totalRenewAvail.toFixed(1)} kWh</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Total Dispatched:</span>
              <span className="font-bold text-emerald-400">{totalRenewUsed.toFixed(1)} kWh</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Total Curtailed:</span>
              <span className="font-bold text-slate-400">{totalRenewCurt.toFixed(1)} kWh</span>
            </div>
            <div className="border-t border-[#1B2C42] pt-1.5 flex justify-between font-bold">
              <span className="text-slate-300">Overall Utilization:</span>
              <span className="text-emerald-400">{renewUtil.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
