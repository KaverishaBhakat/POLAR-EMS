'use client';

import React from 'react';
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
import { HourlyDispatchPoint } from '@/lib/types';
import { BarChart3 } from 'lucide-react';

interface ResilienceDispatchChartProps {
  data: HourlyDispatchPoint[];
  scenarioName: string;
}

export const ResilienceDispatchChart: React.FC<ResilienceDispatchChartProps> = ({
  data,
  scenarioName,
}) => {
  const formattedData = data.map((pt, idx) => {
    const pvUsed = pt.pv_used_kW ?? pt.solar ?? 0;
    const windUsed = pt.wind_used_kW ?? pt.wind ?? 0;
    const g1Power = pt.generator1Power ?? 0;
    const g2Power = pt.generator2Power ?? 0;
    const genTotal = pt.generator_output_kW ?? (g1Power + g2Power);
    const bessDischarge = pt.battery_discharge_kW ?? pt.batteryDischarge ?? 0;
    const bessCharge = pt.battery_charge_kW ?? pt.batteryCharge ?? 0;
    const load = pt.load_kW ?? pt.demand ?? 0;
    const critShed = pt.critical_load_shed_kW ?? pt.flexibleLoadShedding ?? 0;
    const timeLabel = pt.time || `${String(pt.hour ?? idx + 1).padStart(2, '0')}:00`;

    return {
      time: timeLabel,
      hour: pt.hour ?? idx + 1,
      pvUsed: Number(pvUsed.toFixed(1)),
      windUsed: Number(windUsed.toFixed(1)),
      generator1: Number(g1Power.toFixed(1)),
      generator2: Number(g2Power.toFixed(1)),
      generatorTotal: Number(genTotal.toFixed(1)),
      bessDischarge: Number(bessDischarge.toFixed(1)),
      bessCharge: Number(bessCharge.toFixed(1)),
      loadDemand: Number(load.toFixed(1)),
      criticalShed: Number(critShed.toFixed(1)),
    };
  });

  return (
    <div className="bg-[#0E1724]/95 rounded-lg border border-[#1B2C42] p-4 sm:p-5 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1B2C42]/60 pb-3 mb-4">
        <div>
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            24-Hour Energy Dispatch Schedule: {scenarioName}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Microgrid dispatch balance: PV + Wind + Generator Fleet + BESS matching Station Load
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className="px-2 py-0.5 rounded bg-[#09111C] border border-[#1B2C42]">
            UNITS: KILOWATTS (kW)
          </span>
        </div>
      </div>

      <div className="w-full h-80 sm:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="resilienceSolar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.85} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.25} />
              </linearGradient>
              <linearGradient id="resilienceWind" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.85} />
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.25} />
              </linearGradient>
              <linearGradient id="resilienceBess" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.85} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.25} />
              </linearGradient>
              <linearGradient id="resilienceGen1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.85} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.25} />
              </linearGradient>
              <linearGradient id="resilienceGen2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.85} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.25} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" vertical={false} />
            <XAxis dataKey="time" stroke="#64748B" fontSize={11} fontFamily="monospace" tickLine={false} />
            <YAxis stroke="#64748B" fontSize={11} fontFamily="monospace" tickLine={false} unit=" kW" />

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const pt = payload[0]?.payload;
                return (
                  <div className="bg-[#0A121E]/95 border border-cyan-500/40 p-3.5 rounded shadow-2xl font-mono text-xs text-slate-200 min-w-[260px]">
                    <p className="text-cyan-400 font-bold mb-1.5 border-b border-[#1B2C42] pb-1">
                      HOUR {label} DISPATCH BREAKDOWN
                    </p>

                    <div className="space-y-1">
                      <div className="flex justify-between text-amber-300">
                        <span>Solar PV Used:</span>
                        <span className="font-bold text-white">{pt?.pvUsed} kW</span>
                      </div>

                      <div className="flex justify-between text-cyan-300">
                        <span>Wind Generation:</span>
                        <span className="font-bold text-white">{pt?.windUsed} kW</span>
                      </div>

                      {pt?.generator1 > 0 && (
                        <div className="flex justify-between text-blue-300">
                          <span>Primary Genset (GEN-01):</span>
                          <span className="font-bold text-white">{pt?.generator1} kW</span>
                        </div>
                      )}

                      {pt?.generator2 > 0 && (
                        <div className="flex justify-between text-purple-300">
                          <span>Secondary Genset (GEN-02):</span>
                          <span className="font-bold text-white">{pt?.generator2} kW</span>
                        </div>
                      )}

                      {pt?.bessDischarge > 0 && (
                        <div className="flex justify-between text-emerald-300">
                          <span>BESS Discharge:</span>
                          <span className="font-bold text-white">{pt?.bessDischarge} kW</span>
                        </div>
                      )}

                      {pt?.bessCharge > 0 && (
                        <div className="flex justify-between text-teal-300">
                          <span>BESS Charging:</span>
                          <span className="font-bold text-teal-300">+{pt?.bessCharge} kW</span>
                        </div>
                      )}

                      <div className="border-t border-[#1B2C42] pt-1 flex justify-between text-rose-300 font-bold">
                        <span>Station Demand:</span>
                        <span className="text-white">{pt?.loadDemand} kW</span>
                      </div>

                      {pt?.criticalShed > 0 && (
                        <div className="border-t border-rose-500/40 pt-1 flex justify-between text-rose-400 font-bold">
                          <span>Critical Load Shed:</span>
                          <span>{pt?.criticalShed} kW</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />

            <Legend
              wrapperStyle={{ paddingTop: 10, fontSize: 11, fontFamily: 'monospace' }}
              iconType="square"
            />

            {/* Stacked Generation Areas */}
            <Area
              type="monotone"
              dataKey="pvUsed"
              name="Solar PV"
              stackId="gen"
              stroke="#F59E0B"
              fill="url(#resilienceSolar)"
            />
            <Area
              type="monotone"
              dataKey="windUsed"
              name="Wind Power"
              stackId="gen"
              stroke="#06B6D4"
              fill="url(#resilienceWind)"
            />
            <Area
              type="monotone"
              dataKey="generator1"
              name="GEN-01 (100 kW)"
              stackId="gen"
              stroke="#3B82F6"
              fill="url(#resilienceGen1)"
            />
            <Area
              type="monotone"
              dataKey="generator2"
              name="GEN-02 (80 kW)"
              stackId="gen"
              stroke="#8B5CF6"
              fill="url(#resilienceGen2)"
            />
            <Area
              type="monotone"
              dataKey="bessDischarge"
              name="BESS Discharge"
              stackId="gen"
              stroke="#10B981"
              fill="url(#resilienceBess)"
            />

            {/* Station Demand Overlaid as Bold Line */}
            <Line
              type="monotone"
              dataKey="loadDemand"
              name="Station Demand"
              stroke="#FFFFFF"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#FFFFFF' }}
            />

            {/* Critical Load Shedding */}
            <Line
              type="stepAfter"
              dataKey="criticalShed"
              name="Critical Shed"
              stroke="#EF4444"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
