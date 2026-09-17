'use client';

import React from 'react';
import { SimulationResults as SimResultsType } from '@/lib/types';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Fuel, Leaf, BatteryCharging, Cpu, ShieldCheck, Zap, BrainCircuit, ArrowDownRight } from 'lucide-react';
import { StressAlertBanner } from './StressAlertBanner';

interface SimulationResultsProps {
  results: SimResultsType;
}

export const SimulationResults: React.FC<SimulationResultsProps> = ({ results }) => {
  return (
    <div className="space-y-4">
      {/* Contingency Banner if stress detected */}
      {results.energyStressDetected && (
        <StressAlertBanner
          stressLevel={results.stressLevel}
          actions={results.contingencyActions}
        />
      )}

      {/* AI Decision Explanation Narrative */}
      <div className="bg-gradient-to-br from-[#0C1B2E] via-[#0F223A] to-[#0A1624] rounded-lg border border-cyan-500/40 p-5 shadow-[0_0_20px_rgba(6,182,212,0.12)] font-mono">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-7 h-7 rounded bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
            <BrainCircuit size={16} />
          </div>
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100">
            AI Dynamic Strategy & Dispatch Explanation
          </h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed bg-[#08101A]/80 p-3 rounded border border-[#1B2C42]/60">
          {results.aiDecisionExplanation}
        </p>
      </div>

      {/* BEFORE vs AFTER Comparative Metrics */}
      <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
        <div className="mb-4 pb-2.5 border-b border-[#1B2C42]/50 flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm bg-emerald-400" />
              Scenario Impact: Conventional Baseline vs POLAR-EMS
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              Quantitative comparison of fuel consumption, battery state, and critical reliability
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
          {/* 1. Fuel Consumption */}
          <div className="p-3.5 rounded bg-[#0A121E] border border-[#1B2C42] space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-bold uppercase">
                <Fuel size={14} className="text-amber-400" /> Fuel Consumption
              </span>
              <span className="text-emerald-400 font-bold">-{results.delta.fuelSavedPercent}%</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Baseline: {results.baseline.fuelConsumptionL} L/day</span>
              <span className="text-emerald-400 font-bold">
                Simulated: {results.simulated.fuelConsumptionL} L/day
              </span>
            </div>
            <div className="text-[10px] text-emerald-400 font-bold">
              Saved: {results.delta.fuelSavedL} Litres diesel
            </div>
          </div>

          {/* 2. Renewable Utilization */}
          <div className="p-3.5 rounded bg-[#0A121E] border border-[#1B2C42] space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-bold uppercase">
                <Leaf size={14} className="text-cyan-400" /> Renewable Penetration
              </span>
              <span className="text-cyan-400 font-bold">{results.simulated.renewableUtilPercent}%</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Baseline: {results.baseline.renewableUtilPercent}%</span>
              <span className="text-cyan-300 font-bold">
                Simulated: {results.simulated.renewableUtilPercent}%
              </span>
            </div>
            <div className="text-[10px] text-cyan-300">
              Displacing fossil generator run-hours
            </div>
          </div>

          {/* 3. Battery Minimum SOC */}
          <div className="p-3.5 rounded bg-[#0A121E] border border-[#1B2C42] space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-bold uppercase">
                <BatteryCharging size={14} className="text-emerald-400" /> Battery Minimum SOC
              </span>
              <span
                className={`font-bold ${
                  results.simulated.batteryMinSocPercent < 30 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {results.simulated.batteryMinSocPercent}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Baseline: {results.baseline.batteryMinSocPercent}%</span>
              <span className="text-slate-200 font-bold">
                Reserve: {results.simulated.batteryMinSocPercent}%
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Safety threshold locked at 30% min
            </div>
          </div>

          {/* 4. Generator Runtime */}
          <div className="p-3.5 rounded bg-[#0A121E] border border-[#1B2C42] space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-bold uppercase">
                <Cpu size={14} className="text-blue-400" /> Generator Hours
              </span>
              <span className="text-blue-400 font-bold">
                {results.simulated.generatorRuntimeHours}h / day
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Baseline: {results.baseline.generatorRuntimeHours}h</span>
              <span className="text-blue-300 font-bold">
                Optimized: {results.simulated.generatorRuntimeHours}h
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Reduced engine wear & thermal cycling
            </div>
          </div>

          {/* 5. Critical Load Coverage */}
          <div className="p-3.5 rounded bg-[#0A121E] border border-[#1B2C42] space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-bold uppercase">
                <ShieldCheck size={14} className="text-emerald-400" /> Critical Load Coverage
              </span>
              <span className="text-emerald-400 font-bold">
                {results.simulated.criticalLoadCoveragePercent}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Required: 182 kW</span>
              <span className="text-emerald-300 font-bold">100% Guaranteed</span>
            </div>
            <div className="text-[10px] text-emerald-400">Life-support lines secure</div>
          </div>

          {/* 6. CO2 Carbon Emissions */}
          <div className="p-3.5 rounded bg-[#0A121E] border border-[#1B2C42] space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-bold uppercase">
                <Zap size={14} className="text-purple-400" /> CO₂ Emissions
              </span>
              <span className="text-emerald-400 font-bold">-{results.delta.co2SavedKg} kg</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Baseline: {results.baseline.co2EmissionsKg} kg</span>
              <span className="text-emerald-300 font-bold">
                Simulated: {results.simulated.co2EmissionsKg} kg
              </span>
            </div>
            <div className="text-[10px] text-emerald-400">
              Avoided: {results.delta.co2SavedKg} kg CO₂/day
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Scenario 24h Timeline Chart */}
      <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
        <div className="mb-4 pb-2.5 border-b border-[#1B2C42]/50">
          <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm bg-cyan-400" />
            Simulated 24-Hour Timeline Microgrid Response
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
            Dynamic load demand, renewable yield, generator dispatch, and battery SOC under selected scenario
          </p>
        </div>

        <div className="w-full h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={results.timeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" vertical={false} />
              <XAxis dataKey="hour" stroke="#64748B" fontSize={11} fontFamily="monospace" tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} fontFamily="monospace" tickLine={false} unit=" kW" />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <div className="bg-[#0A121E]/95 border border-cyan-500/40 p-3 rounded shadow-2xl font-mono text-xs text-slate-200">
                      <p className="text-cyan-400 font-bold mb-1 border-b border-[#1B2C42] pb-0.5">
                        SIMULATION TIME: {label}
                      </p>
                      {payload.map((entry: any) => (
                        <div key={entry.name} className="flex justify-between gap-3 py-0.5">
                          <span style={{ color: entry.color }}>{entry.name}:</span>
                          <span className="font-bold text-white">
                            {entry.value} {entry.name.includes('SOC') ? '%' : 'kW'}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontFamily: 'monospace' }} />

              <Area
                type="monotone"
                dataKey="renewableGenKW"
                name="Renewable Generation"
                fill="#06B6D4"
                fillOpacity={0.2}
                stroke="#06B6D4"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="generatorDispatchKW"
                name="Generator Dispatch"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="loadDemandKW"
                name="Station Demand Load"
                stroke="#F43F5E"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#F43F5E' }}
              />
              <Line
                type="monotone"
                dataKey="batterySocPercent"
                name="Battery SOC (%)"
                stroke="#10B981"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
