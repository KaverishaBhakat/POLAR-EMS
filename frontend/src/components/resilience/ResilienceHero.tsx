'use client';

import React from 'react';
import { ShieldCheck, ShieldAlert, Sparkles, Activity, Layers, Info } from 'lucide-react';
import { ResilienceMetrics, ResilienceSimulationScenario } from '@/lib/types';

interface ResilienceHeroProps {
  stationName: string;
  stationCode: string;
  scenario?: ResilienceSimulationScenario | null;
  metrics?: ResilienceMetrics | null;
  isBaseline?: boolean;
}

export const ResilienceHero: React.FC<ResilienceHeroProps> = ({
  stationName,
  stationCode,
  scenario,
  metrics,
  isBaseline = false,
}) => {
  const resilienceStatus = metrics?.resilience_status || 'PROTECTED';
  const isProtected = resilienceStatus === 'PROTECTED';
  const reliability = metrics?.critical_load_reliability_percent ?? 100.0;
  const criticalShed = metrics?.total_critical_load_shed_kwh ?? 0.0;

  return (
    <div className="bg-gradient-to-r from-[#0B1524] via-[#0E1B2E] to-[#0A1422] rounded-lg border border-[#1B2C42] p-4 sm:p-6 font-mono relative overflow-hidden">
      {/* Background Accent Grid / Glow */}
      <div className="absolute top-0 right-0 w-96 h-full bg-cyan-500/5 pointer-events-none blur-3xl" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Title & Metadata */}
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase tracking-widest">
              POLAR-EMS SCADA
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#16273C] text-slate-300 border border-[#223A56] uppercase tracking-wider">
              STATION: {stationName.toUpperCase()} ({stationCode})
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#16273C] text-slate-300 border border-[#223A56] uppercase tracking-wider">
              LOOKAHEAD: 24 HOURS
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white uppercase flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-cyan-400 flex-shrink-0" />
            <span>Resilience &amp; Contingency Analysis</span>
          </h1>

          <p className="text-xs text-slate-300 leading-relaxed">
            {isBaseline ? (
              <span>
                Baseline Microgrid Operations under normal climatological conditions and dual-generator availability.
              </span>
            ) : scenario?.description ? (
              <span>{scenario.description}</span>
            ) : (
              <span>
                Deterministic stress testing and life-support reliability analysis under extreme polar contingencies.
              </span>
            )}
          </p>
        </div>

        {/* Resilience Status & Critical Reliability Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-shrink-0">
          {/* 1. Resilience Status */}
          <div
            className={`p-3.5 rounded-lg border flex flex-col justify-between ${
              isProtected
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Resilience Status</span>
              {isProtected ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              )}
            </div>
            <div className="mt-1">
              <span
                className={`text-lg sm:text-xl font-extrabold tracking-wider ${
                  isProtected ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {resilienceStatus}
              </span>
            </div>
            <p className="text-[9px] text-slate-400 mt-0.5">
              {isProtected ? 'Zero critical load shedding' : 'Life-support shedding detected'}
            </p>
          </div>

          {/* 2. Critical Load Reliability */}
          <div className="p-3.5 rounded-lg bg-[#0D1826] border border-[#1E324A] flex flex-col justify-between text-slate-200">
            <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Critical Reliability</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-1">
              <span className="text-lg sm:text-xl font-extrabold text-white">
                {reliability.toFixed(1)}%
              </span>
            </div>
            <p className="text-[9px] text-slate-400 mt-0.5">
              Target: 100.0% life-support
            </p>
          </div>

          {/* 3. Critical Load Shed */}
          <div className="p-3.5 rounded-lg bg-[#0D1826] border border-[#1E324A] flex flex-col justify-between text-slate-200">
            <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Critical Load Shed</span>
              <Layers className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-1">
              <span className={`text-lg sm:text-xl font-extrabold ${criticalShed > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {criticalShed.toFixed(1)} kWh
              </span>
            </div>
            <p className="text-[9px] text-slate-400 mt-0.5">
              {criticalShed === 0 ? 'Fully protected (0 kWh)' : 'Contingency deficit'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
