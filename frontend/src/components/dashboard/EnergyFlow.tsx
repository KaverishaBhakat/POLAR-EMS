'use client';

import React from 'react';
import { Sun, Wind, BatteryCharging, Zap, Cpu, ArrowRight } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface EnergyFlowProps {
  solarKW: number;
  windKW: number;
  generatorKW: number;
  batteryFlowKW: number; // positive = charging, negative = discharging
  batterySoc: number;
  loadKW: number;
}

export const EnergyFlow: React.FC<EnergyFlowProps> = ({
  solarKW,
  windKW,
  generatorKW,
  batteryFlowKW,
  batterySoc,
  loadKW,
}) => {
  const isCharging = batteryFlowKW >= 0;
  const absBatteryFlow = Math.abs(batteryFlowKW);
  const totalGeneration = solarKW + windKW + generatorKW;

  return (
    <div className="relative bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-[#1B2C42]/50">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            Power Distribution & Microgrid Flow
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Real-time power balancing across generation buses, BESS, and station distribution
          </p>
        </div>
        <StatusBadge status="OPERATIONAL" label="SYNCHRONIZED (50.0 Hz)" size="sm" />
      </div>

      {/* Interactive SCADA Flow Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center my-2">
        {/* Left Column: Generation Sources (Solar, Wind, Generators) */}
        <div className="md:col-span-4 space-y-2.5">
          {/* Solar Card */}
          <div className="flex items-center justify-between p-3 rounded bg-[#0A121E] border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.08)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Sun size={18} />
              </div>
              <div>
                <p className="text-xs font-mono font-medium text-slate-200 uppercase">Solar Array</p>
                <p className="text-[10px] text-slate-400 font-mono">100 kW PV Bifacial</p>
              </div>
            </div>
            <div className="text-right font-mono">
              <span className="text-base font-bold text-amber-300">{solarKW}</span>
              <span className="text-[10px] text-slate-400 ml-1">kW</span>
            </div>
          </div>

          {/* Wind Card */}
          <div className="flex items-center justify-between p-3 rounded bg-[#0A121E] border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.08)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Wind size={18} />
              </div>
              <div>
                <p className="text-xs font-mono font-medium text-slate-200 uppercase">Wind Turbines</p>
                <p className="text-[10px] text-slate-400 font-mono">2x 40 kW Arctic Spec</p>
              </div>
            </div>
            <div className="text-right font-mono">
              <span className="text-base font-bold text-cyan-300">{windKW}</span>
              <span className="text-[10px] text-slate-400 ml-1">kW</span>
            </div>
          </div>

          {/* Genset Card */}
          <div className="flex items-center justify-between p-3 rounded bg-[#0A121E] border border-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.08)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Cpu size={18} />
              </div>
              <div>
                <p className="text-xs font-mono font-medium text-slate-200 uppercase">Generators</p>
                <p className="text-[10px] text-slate-400 font-mono">G1 + G2 Active</p>
              </div>
            </div>
            <div className="text-right font-mono">
              <span className="text-base font-bold text-blue-300">{generatorKW}</span>
              <span className="text-[10px] text-slate-400 ml-1">kW</span>
            </div>
          </div>
        </div>

        {/* Center: Bus & Battery Flow Node */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-[#0A121E]/70 rounded border border-cyan-500/20 text-center relative overflow-hidden">
          {/* Animated Background Pulse */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-cyan-500/5 animate-pulse" />

          <p className="text-[10px] font-mono tracking-widest text-slate-400 uppercase mb-1">
            415V MAIN AC BUS
          </p>
          <div className="text-xl font-bold font-mono text-cyan-300 mb-2">
            {totalGeneration} <span className="text-xs text-slate-400">kW IN</span>
          </div>

          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent my-2" />

          {/* Battery Storage Center node */}
          <div className="w-full p-2.5 rounded bg-[#101C2B] border border-cyan-500/30 mt-1">
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="flex items-center gap-1.5 text-slate-300">
                <BatteryCharging size={14} className="text-cyan-400" />
                BESS Storage
              </span>
              <span className="text-cyan-400 font-bold">{batterySoc}% SOC</span>
            </div>

            {/* Battery progress bar */}
            <div className="w-full bg-[#080D14] h-2 rounded-full overflow-hidden border border-[#1B2C42]">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${batterySoc}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1.5">
              <span>{isCharging ? 'Absorption Rate:' : 'Discharge Rate:'}</span>
              <span className={isCharging ? 'text-emerald-400 font-bold' : 'text-blue-400 font-bold'}>
                {isCharging ? `+${absBatteryFlow}` : `-${absBatteryFlow}`} kW
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Station Demand Load */}
        <div className="md:col-span-4 flex flex-col justify-center">
          <div className="p-4 rounded bg-[#0A121E] border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.12)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Zap size={18} />
                </div>
                <div>
                  <p className="text-xs font-mono font-medium text-slate-200 uppercase">
                    Station Demand Load
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">100% Critical Protected</p>
                </div>
              </div>
            </div>

            <div className="my-2 py-1.5 px-3 rounded bg-[#080E17] border border-[#1B2C42] flex items-baseline justify-between font-mono">
              <span className="text-xs text-slate-400">TOTAL DRAW:</span>
              <div>
                <span className="text-2xl font-bold text-emerald-400">{loadKW}</span>
                <span className="text-xs text-slate-400 ml-1">kW</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 mt-2">
              <div className="bg-[#0D1724] p-1.5 rounded border border-[#1B2C42]">
                <div className="text-slate-400">Renewable Share</div>
                <div className="text-cyan-300 font-bold text-xs mt-0.5">
                  {loadKW > 0 ? (((solarKW + windKW) / loadKW) * 100).toFixed(1) : '0.0'}%
                </div>
              </div>
              <div className="bg-[#0D1724] p-1.5 rounded border border-[#1B2C42]">
                <div className="text-slate-400">Grid Frequency</div>
                <div className="text-emerald-400 font-bold text-xs mt-0.5">50.02 Hz</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
