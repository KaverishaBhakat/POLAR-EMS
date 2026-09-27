'use client';

import React from 'react';
import { GitCompare, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { ResilienceComparison } from '@/lib/types';
import { ProvenanceBadge } from '../common/ProvenanceBadge';

interface BaselineComparisonPanelProps {
  comparison: ResilienceComparison | null | undefined;
  scenarioName: string;
}

export const BaselineComparisonPanel: React.FC<BaselineComparisonPanelProps> = ({
  comparison,
  scenarioName,
}) => {
  if (!comparison) return null;

  const rows = [
    {
      label: 'Energy Demand',
      unit: 'kWh',
      data: comparison.total_demand_kwh,
      digits: 1,
      provenance: 'SCENARIO',
    },
    {
      label: 'Renewable Generation',
      unit: 'kWh',
      data: comparison.total_renewable_energy_kwh,
      digits: 1,
      provenance: 'MODELED',
    },
    {
      label: 'Solar PV Available',
      unit: 'kWh',
      data: comparison.pv_available_kwh,
      digits: 1,
      provenance: 'MODELED',
    },
    {
      label: 'Wind Power Available',
      unit: 'kWh',
      data: comparison.wind_available_kwh,
      digits: 1,
      provenance: 'REAL_MEASURED',
    },
    {
      label: 'Renewable Utilization',
      unit: '%',
      data: comparison.renewable_utilization_percent,
      digits: 1,
      provenance: 'OPTIMIZATION',
    },
    {
      label: 'Generator Energy',
      unit: 'kWh',
      data: comparison.generator_energy_kwh,
      digits: 1,
      provenance: 'OPTIMIZATION',
    },
    {
      label: 'Fuel Consumption',
      unit: 'L',
      data: comparison.fuel_consumption_liters,
      digits: 1,
      provenance: 'OPTIMIZATION',
    },
    {
      label: 'Generator Runtime',
      unit: 'h',
      data: comparison.generator_runtime_hours,
      digits: 0,
      provenance: 'OPTIMIZATION',
    },
    {
      label: 'Battery Discharge',
      unit: 'kWh',
      data: comparison.battery_discharge_kwh,
      digits: 1,
      provenance: 'OPTIMIZATION',
    },
    {
      label: 'Battery Charge',
      unit: 'kWh',
      data: comparison.battery_charge_kwh,
      digits: 1,
      provenance: 'OPTIMIZATION',
    },
    {
      label: 'Minimum Battery SOC',
      unit: '%',
      data: comparison.minimum_battery_soc_percent,
      digits: 1,
      provenance: 'OPTIMIZATION',
    },
    {
      label: 'Maximum Battery SOC',
      unit: '%',
      data: comparison.maximum_battery_soc_percent,
      digits: 1,
      provenance: 'OPTIMIZATION',
    },
    {
      label: 'Critical Load Shed',
      unit: 'kWh',
      data: comparison.critical_load_shed_kwh,
      digits: 1,
      provenance: 'OPTIMIZATION',
    },
    {
      label: 'Critical Load Reliability',
      unit: '%',
      data: comparison.critical_load_reliability_percent,
      digits: 1,
      provenance: 'OPTIMIZATION',
    },
    {
      label: 'Optimization Objective',
      unit: '',
      data: comparison.objective_value,
      digits: 2,
      provenance: 'OPTIMIZATION',
    },
  ];

  return (
    <div className="bg-[#0E1724]/95 rounded-lg border border-[#1B2C42] p-4 sm:p-5 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1B2C42]/60 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
            Baseline (Normal Operations) vs. Scenario: {scenarioName}
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">
          Strict delta metrics calculated against nominal December baseline dispatch
        </span>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead>
            <tr className="border-b border-[#1B2C42] text-[10px] text-slate-400 uppercase tracking-wider bg-[#080E17]/60">
              <th className="py-2.5 px-3 font-semibold">Microgrid Metric</th>
              <th className="py-2.5 px-3 font-semibold text-right">Normal Operations (Baseline)</th>
              <th className="py-2.5 px-3 font-semibold text-right text-cyan-400">
                Selected Scenario ({scenarioName})
              </th>
              <th className="py-2.5 px-3 font-semibold text-right">Absolute Delta</th>
              <th className="py-2.5 px-3 font-semibold text-right">Percentage Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#152336]/60">
            {rows.map((row, idx) => {
              if (!row.data) return null;

              const baseVal = row.data.baseline;
              const scenVal = row.data.scenario;
              const absDelta = row.data.absolute_delta;
              const pctDelta = row.data.percent_delta;

              const isPositive = absDelta !== null && absDelta !== undefined && absDelta > 0.001;
              const isNegative = absDelta !== null && absDelta !== undefined && absDelta < -0.001;

              const formatVal = (val: number | null | undefined) => {
                if (val === null || val === undefined || isNaN(val)) return 'N/A';
                if (row.digits === 0) return Math.round(val).toLocaleString();
                return val.toFixed(row.digits);
              };

              return (
                <tr
                  key={row.label}
                  className={`hover:bg-[#121F30]/60 transition-colors ${
                    idx % 2 === 0 ? 'bg-transparent' : 'bg-[#0A121E]/30'
                  }`}
                >
                  <td className="py-2.5 px-3 font-medium text-slate-200 flex items-center justify-between gap-2">
                    <span>{row.label}</span>
                    <ProvenanceBadge type={row.provenance} size="xs" />
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                    {formatVal(baseVal)} {row.unit}
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                    {formatVal(scenVal)} {row.unit}
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono">
                    <span
                      className={`inline-flex items-center gap-0.5 ${
                        isPositive ? 'text-amber-400' : isNegative ? 'text-cyan-400' : 'text-slate-400'
                      }`}
                    >
                      {isPositive && '+'}
                      {formatVal(absDelta)} {row.unit}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono">
                    {pctDelta !== null && pctDelta !== undefined && !isNaN(pctDelta) ? (
                      <span
                        className={`inline-flex items-center gap-0.5 font-bold ${
                          pctDelta > 0
                            ? 'text-amber-300'
                            : pctDelta < 0
                            ? 'text-cyan-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {pctDelta > 0 ? (
                          <ArrowUpRight className="w-3 h-3 text-amber-400" />
                        ) : pctDelta < 0 ? (
                          <ArrowDownRight className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <Minus className="w-3 h-3 text-slate-500" />
                        )}
                        {pctDelta > 0 && '+'}
                        {pctDelta.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
