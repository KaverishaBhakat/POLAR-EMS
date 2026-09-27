'use client';

import React from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Minus, AlertCircle } from 'lucide-react';
import { ResilienceComparison, ResilienceMetrics } from '@/lib/types';

interface ScenarioImpactSummaryProps {
  comparison: ResilienceComparison | null | undefined;
  metrics: ResilienceMetrics | null | undefined;
  scenarioName: string;
}

export const ScenarioImpactSummary: React.FC<ScenarioImpactSummaryProps> = ({
  comparison,
  metrics,
  scenarioName,
}) => {
  if (!comparison || !metrics) return null;

  const renewPct = comparison.total_renewable_energy_kwh?.percent_delta;
  const genPct = comparison.generator_energy_kwh?.percent_delta;
  const fuelPct = comparison.fuel_consumption_liters?.percent_delta;
  const runtimePct = comparison.generator_runtime_hours?.percent_delta;
  const critShed = metrics.total_critical_load_shed_kwh ?? 0;

  const impactCards = [
    {
      label: 'Renewable Generation',
      pctDelta: renewPct,
      absDelta: comparison.total_renewable_energy_kwh?.absolute_delta,
      unit: 'kWh',
      baseVal: comparison.total_renewable_energy_kwh?.baseline,
      scenVal: comparison.total_renewable_energy_kwh?.scenario,
    },
    {
      label: 'Generator Output',
      pctDelta: genPct,
      absDelta: comparison.generator_energy_kwh?.absolute_delta,
      unit: 'kWh',
      baseVal: comparison.generator_energy_kwh?.baseline,
      scenVal: comparison.generator_energy_kwh?.scenario,
    },
    {
      label: 'Diesel Fuel Consumed',
      pctDelta: fuelPct,
      absDelta: comparison.fuel_consumption_liters?.absolute_delta,
      unit: 'L',
      baseVal: comparison.fuel_consumption_liters?.baseline,
      scenVal: comparison.fuel_consumption_liters?.scenario,
    },
    {
      label: 'Generator Runtime',
      pctDelta: runtimePct,
      absDelta: comparison.generator_runtime_hours?.absolute_delta,
      unit: 'h',
      baseVal: comparison.generator_runtime_hours?.baseline,
      scenVal: comparison.generator_runtime_hours?.scenario,
    },
    {
      label: 'Critical Load Shedding',
      pctDelta: null,
      absDelta: critShed,
      unit: 'kWh',
      baseVal: 0,
      scenVal: critShed,
      isCritical: true,
    },
  ];

  return (
    <div className="bg-[#0E1724]/95 rounded-lg border border-[#1B2C42] p-4 sm:p-5 font-mono space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1B2C42]/60 pb-2.5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
            Scenario Operational Impact ({scenarioName})
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">
          Relative variance from nominal 24-hour baseline
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {impactCards.map((card) => {
          const hasPct = card.pctDelta !== null && card.pctDelta !== undefined;
          const isUp = hasPct && (card.pctDelta ?? 0) > 0;
          const isDown = hasPct && (card.pctDelta ?? 0) < 0;

          return (
            <div
              key={card.label}
              className={`p-3 rounded-lg border bg-[#080E17] flex flex-col justify-between ${
                card.isCritical && card.scenVal > 0
                  ? 'border-rose-500/50 bg-rose-950/20'
                  : 'border-[#1B2C42]'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                {card.label}
              </span>

              <div className="my-1.5">
                {hasPct ? (
                  <div
                    className={`text-lg sm:text-xl font-extrabold flex items-center gap-1 ${
                      isUp ? 'text-amber-400' : isDown ? 'text-cyan-400' : 'text-slate-300'
                    }`}
                  >
                    {isUp ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : isDown ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : (
                      <Minus className="w-4 h-4 text-slate-500" />
                    )}
                    <span>
                      {isUp && '+'}
                      {(card.pctDelta ?? 0).toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <div
                    className={`text-lg sm:text-xl font-extrabold ${
                      card.scenVal > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {card.scenVal.toFixed(1)} {card.unit}
                  </div>
                )}
              </div>

              <p className="text-[9px] text-slate-400 truncate">
                {card.isCritical
                  ? card.scenVal === 0
                    ? '0 kWh (100% Protected)'
                    : `Shed: ${card.scenVal.toFixed(1)} kWh`
                  : `Delta: ${card.absDelta !== undefined && card.absDelta > 0 ? '+' : ''}${card.absDelta?.toFixed(1)} ${card.unit}`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
