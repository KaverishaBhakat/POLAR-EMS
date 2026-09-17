'use client';

import React from 'react';
import { OptimizationMetrics } from '@/lib/types';
import { Fuel, Leaf, Clock, BatteryCharging, ShieldCheck, Zap, ArrowDownRight, Sparkles } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface OptimizationComparisonProps {
  metrics: OptimizationMetrics;
}

export const OptimizationComparison: React.FC<OptimizationComparisonProps> = ({ metrics }) => {
  return (
    <div className="space-y-4">
      {/* Prominent Fuel Savings Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0C1E30] via-[#0E2842] to-[#0A1A2A] rounded-lg border-2 border-emerald-500/50 p-6 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
        {/* Glow effect */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold tracking-widest uppercase flex items-center gap-1">
                <Sparkles size={12} className="text-emerald-400" />
                MILP OPTIMAL SOLUTION CONVERGED
              </span>
              <StatusBadge status="OPERATIONAL" label="FEASIBILITY: 100%" size="sm" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-mono tracking-wide text-white uppercase">
              POLAR-EMS AI Dispatch Optimization
            </h2>
            <p className="text-xs text-slate-300 max-w-xl font-mono">
              Dynamic co-optimization of generator SFC curves, BESS battery cycle depth, and real-time renewable priority absorption.
            </p>
          </div>

          {/* Big Prominent Fuel Savings Badge */}
          <div className="flex items-center gap-4 bg-[#08121E]/90 border border-emerald-500/40 px-5 py-4 rounded-lg shadow-xl font-mono flex-shrink-0">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Fuel size={26} />
            </div>
            <div>
              <div className="text-[11px] text-emerald-300 font-bold uppercase tracking-wider">
                DAILY DIESEL SAVED
              </div>
              <div className="text-3xl font-bold text-white flex items-baseline gap-1.5">
                {metrics.fuelSavedL}{' '}
                <span className="text-xs text-emerald-400 font-semibold">L / day</span>
              </div>
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                <ArrowDownRight size={14} />
                <span>{metrics.fuelSavedPercent}% vs Conventional Baseline</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparative Metrics Grid: BASELINE vs POLAR-EMS OPTIMIZED */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* 1. Fuel Consumption */}
        <div className="p-4 rounded-lg bg-[#0E1724]/90 border border-[#1B2C42] font-mono space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-bold uppercase">
              <Fuel size={15} className="text-amber-400" /> Fuel Consumption
            </span>
            <span className="text-emerald-400 font-bold">-{metrics.fuelSavedPercent}%</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Standard Baseline:</span>
              <span className="text-slate-300 font-bold">{metrics.baselineFuelL} L/day</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>POLAR-EMS Optimized:</span>
              <span className="text-emerald-400 font-bold">{metrics.optimizedFuelL} L/day</span>
            </div>
          </div>

          <div className="w-full bg-[#080D14] h-2 rounded-full overflow-hidden border border-[#1B2C42]">
            <div
              className="h-full bg-emerald-400"
              style={{ width: `${(metrics.optimizedFuelL / metrics.baselineFuelL) * 100}%` }}
            />
          </div>
        </div>

        {/* 2. Renewable Utilization */}
        <div className="p-4 rounded-lg bg-[#0E1724]/90 border border-[#1B2C42] font-mono space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-bold uppercase">
              <Leaf size={15} className="text-cyan-400" /> Renewable Utilization
            </span>
            <span className="text-cyan-400 font-bold">+{metrics.optimizedRenewableUtilPercent - metrics.baselineRenewableUtilPercent}%</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Standard Baseline:</span>
              <span className="text-slate-300 font-bold">{metrics.baselineRenewableUtilPercent}%</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>POLAR-EMS Optimized:</span>
              <span className="text-cyan-300 font-bold">{metrics.optimizedRenewableUtilPercent}%</span>
            </div>
          </div>

          <div className="w-full bg-[#080D14] h-2 rounded-full overflow-hidden border border-[#1B2C42]">
            <div
              className="h-full bg-cyan-400"
              style={{ width: `${metrics.optimizedRenewableUtilPercent}%` }}
            />
          </div>
        </div>

        {/* 3. Generator Runtime */}
        <div className="p-4 rounded-lg bg-[#0E1724]/90 border border-[#1B2C42] font-mono space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-bold uppercase">
              <Clock size={15} className="text-blue-400" /> Genset Operating Hours
            </span>
            <span className="text-blue-400 font-bold">-14 hrs/day</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Standard Baseline:</span>
              <span className="text-slate-300 font-bold">{metrics.baselineGeneratorRuntimeHours}h (Continuous 2-Gen)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>POLAR-EMS Optimized:</span>
              <span className="text-blue-300 font-bold">{metrics.optimizedGeneratorRuntimeHours}h (Smart Staged)</span>
            </div>
          </div>

          <div className="w-full bg-[#080D14] h-2 rounded-full overflow-hidden border border-[#1B2C42]">
            <div
              className="h-full bg-blue-400"
              style={{ width: `${(metrics.optimizedGeneratorRuntimeHours / metrics.baselineGeneratorRuntimeHours) * 100}%` }}
            />
          </div>
        </div>

        {/* 4. CO2 Emissions */}
        <div className="p-4 rounded-lg bg-[#0E1724]/90 border border-[#1B2C42] font-mono space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-bold uppercase">
              <Zap size={15} className="text-purple-400" /> CO₂ Carbon Emissions
            </span>
            <span className="text-emerald-400 font-bold">-{metrics.co2AvoidedKg} kg/day</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Standard Baseline:</span>
              <span className="text-slate-300 font-bold">{metrics.baselineCo2Kg} kg/day</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>POLAR-EMS Optimized:</span>
              <span className="text-emerald-300 font-bold">{metrics.optimizedCo2Kg} kg/day</span>
            </div>
          </div>

          <div className="w-full bg-[#080D14] h-2 rounded-full overflow-hidden border border-[#1B2C42]">
            <div
              className="h-full bg-purple-400"
              style={{ width: `${(metrics.optimizedCo2Kg / metrics.baselineCo2Kg) * 100}%` }}
            />
          </div>
        </div>

        {/* 5. Battery Degradation & Cycles */}
        <div className="p-4 rounded-lg bg-[#0E1724]/90 border border-[#1B2C42] font-mono space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-bold uppercase">
              <BatteryCharging size={15} className="text-cyan-400" /> Battery Health Protection
            </span>
            <span className="text-cyan-400 font-bold">Optimal C-Rate</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>DoD Cycle Limit:</span>
              <span className="text-slate-300 font-bold">30% – 90% Bound</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Est. Cell Lifetime:</span>
              <span className="text-cyan-300 font-bold">12.5 Years (+3.2 Yrs)</span>
            </div>
          </div>

          <div className="w-full bg-[#080D14] h-2 rounded-full overflow-hidden border border-[#1B2C42]">
            <div className="h-full bg-cyan-400" style={{ width: '85%' }} />
          </div>
        </div>

        {/* 6. Critical Load Reliability */}
        <div className="p-4 rounded-lg bg-[#0E1724]/90 border border-[#1B2C42] font-mono space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-bold uppercase">
              <ShieldCheck size={15} className="text-emerald-400" /> Critical Reliability
            </span>
            <span className="text-emerald-400 font-bold">100.0%</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Life-Support Reserve:</span>
              <span className="text-emerald-300 font-bold">100% Guaranteed</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Spinning Reserve Margin:</span>
              <span className="text-slate-200 font-bold">+150 kW Excess</span>
            </div>
          </div>

          <div className="w-full bg-[#080D14] h-2 rounded-full overflow-hidden border border-[#1B2C42]">
            <div className="h-full bg-emerald-400" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
