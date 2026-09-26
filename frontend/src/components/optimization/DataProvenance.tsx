'use client';

import React from 'react';
import { Database, Activity, Sliders, Cpu, Info } from 'lucide-react';

export const DataProvenance: React.FC = () => {
  return (
    <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5 font-mono">
      <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-[#1B2C42]/50">
        <Info size={16} className="text-cyan-400" />
        <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase">
          Data & Model Provenance
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Real Data */}
        <div className="p-3.5 rounded-lg bg-[#09111C] border border-cyan-500/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase">
            <Database size={14} className="text-cyan-400" />
            <span>Real Data</span>
          </div>
          <div className="text-[11px] text-slate-300 leading-relaxed space-y-1">
            <p className="font-semibold text-white">Maitri Historical Radiation</p>
            <p className="text-slate-400">
              Measured global solar radiation (1985–2000, hourly mean records) sourced from IMD / NCPOR Antarctic station archives.
            </p>
          </div>
        </div>

        {/* 2. Modeled */}
        <div className="p-3.5 rounded-lg bg-[#09111C] border border-amber-500/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase">
            <Activity size={14} className="text-amber-400" />
            <span>Modeled</span>
          </div>
          <div className="text-[11px] text-slate-300 leading-relaxed space-y-1">
            <p className="font-semibold text-white">PV Generation Synthesis</p>
            <p className="text-slate-400">
              Hourly electrical output computed from solar irradiance via engineering model (<span className="text-amber-300">P = G · A · η</span>). <span className="text-slate-400 font-normal">Not direct station telemetry.</span>
            </p>
          </div>
        </div>

        {/* 3. Scenario Assumptions */}
        <div className="p-3.5 rounded-lg bg-[#09111C] border border-purple-500/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase">
            <Sliders size={14} className="text-purple-400" />
            <span>Scenario Assumptions</span>
          </div>
          <div className="text-[11px] text-slate-300 leading-relaxed space-y-1">
            <p className="font-semibold text-white">Engineering Parameters</p>
            <ul className="text-slate-400 space-y-0.5 list-disc list-inside">
              <li>PV Capacity: <span className="text-purple-300 font-semibold">100 kW</span></li>
              <li>Performance Ratio: <span className="text-purple-300 font-semibold">0.80</span></li>
              <li>Month: <span className="text-purple-300 font-semibold">December Climatology</span></li>
            </ul>
          </div>
        </div>

        {/* 4. Optimization Engine */}
        <div className="p-3.5 rounded-lg bg-[#09111C] border border-emerald-500/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase">
            <Cpu size={14} className="text-emerald-400" />
            <span>Optimization</span>
          </div>
          <div className="text-[11px] text-slate-300 leading-relaxed space-y-1">
            <p className="font-semibold text-white">Google OR-Tools MILP</p>
            <p className="text-slate-400">
              Mixed-Integer Linear Programming unit commitment & dispatch with branch-and-cut SCIP solver under strict physical and life-support bounds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
