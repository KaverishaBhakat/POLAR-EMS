'use client';

import React from 'react';
import { Generator } from '@/lib/types';
import { StatusBadge } from '../common/StatusBadge';
import { Cpu, Gauge, Fuel, Clock, Activity } from 'lucide-react';

interface GeneratorStatusProps {
  generators: Generator[];
}

export const GeneratorStatus: React.FC<GeneratorStatusProps> = ({ generators }) => {
  return (
    <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-[#1B2C42]/50">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            Generator Fleet Telemetry (G1 – G4)
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Heavy-duty Arctic diesel generation units & specific fuel consumption parameters
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {generators.map((gen) => {
          const isRunning = gen.status === 'RUNNING';

          return (
            <div
              key={gen.id}
              className={`p-3.5 rounded-lg border transition-all ${
                isRunning
                  ? 'bg-[#0A1320] border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.08)]'
                  : 'bg-[#0A101A] border-[#1B2C42]/60 opacity-80'
              }`}
            >
              {/* Top Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    {gen.id}
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]" title={gen.name}>
                    {gen.name}
                  </p>
                </div>
                <StatusBadge status={gen.status} size="sm" />
              </div>

              {/* Output & Load percentage bar */}
              <div className="my-2.5">
                <div className="flex justify-between items-baseline text-xs font-mono mb-1">
                  <span className="text-slate-400 text-[11px]">OUTPUT:</span>
                  <span className="font-bold text-slate-100">
                    {gen.outputKW} <span className="text-[10px] text-slate-400">/ {gen.maxOutputKW} kW</span>
                  </span>
                </div>

                <div className="w-full bg-[#080D14] h-2 rounded-full overflow-hidden border border-[#1B2C42]">
                  <div
                    className={`h-full transition-all duration-500 ${
                      gen.loadPercentage > 85
                        ? 'bg-amber-400'
                        : isRunning
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                        : 'bg-slate-600'
                    }`}
                    style={{ width: `${gen.loadPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
                  <span>Load: {gen.loadPercentage}%</span>
                  <span>Optimal: 75–85%</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-2 border-t border-[#1B2C42]/40 text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Gauge size={12} className="text-cyan-400 flex-shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[9px]">Efficiency</span>
                    <span className="font-semibold text-slate-200">{gen.efficiencyPercent}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Fuel size={12} className="text-amber-400 flex-shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[9px]">Fuel Rate</span>
                    <span className="font-semibold text-slate-200">{gen.fuelConsumptionLh} L/h</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-slate-400 flex-shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[9px]">Runtime</span>
                    <span className="font-semibold text-slate-200">{gen.runtimeHours}h</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Activity size={12} className="text-emerald-400 flex-shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[9px]">Engine Temp</span>
                    <span className="font-semibold text-slate-200">{gen.temperatureC}°C</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
