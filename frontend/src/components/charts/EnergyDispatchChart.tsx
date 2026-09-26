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

interface EnergyDispatchChartProps {
  data: HourlyDispatchPoint[];
}

export const EnergyDispatchChart: React.FC<EnergyDispatchChartProps> = ({ data }) => {
  // Normalize data points to handle both direct OR-Tools fields and legacy mock fields
  const formattedData = data.map((pt, idx) => {
    const pvUsed = pt.pv_used_kW ?? pt.solarKW ?? 0;
    const pvAvailable = pt.pv_available_kW ?? pt.pvAvailableKW ?? pvUsed;
    const windUsed = pt.wind_used_kW ?? pt.windKW ?? 0;
    const bessDischarge = pt.battery_discharge_kW ?? pt.batteryDischargeKW ?? 0;
    const bessCharge = pt.battery_charge_kW ?? pt.batteryChargeKW ?? 0;
    const genOutput = pt.generator_output_kW ?? ((pt.generator1KW || 0) + (pt.generator2KW || 0) + (pt.generator3KW || 0));
    const load = pt.load_kW ?? pt.totalLoadKW ?? 0;
    const timeLabel = pt.time || `${String(pt.hour ?? idx).padStart(2, '0')}:00`;

    return {
      time: timeLabel,
      pvUsed: Number(pvUsed.toFixed(1)),
      pvAvailable: Number(pvAvailable.toFixed(1)),
      windUsed: Number(windUsed.toFixed(1)),
      bessDischarge: Number(bessDischarge.toFixed(1)),
      bessCharge: Number(bessCharge.toFixed(1)),
      genOutput: Number(genOutput.toFixed(1)),
      loadDemand: Number(load.toFixed(1)),
    };
  });

  return (
    <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2.5 border-b border-[#1B2C42]/50">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm bg-cyan-400" />
            24-Hour Optimal Energy Dispatch Schedule (Stacked Sources)
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Hourly generation stacking: Solar PV + Wind + BESS Discharge + Generator Output matching Station Demand
          </p>
        </div>
      </div>

      <div className="w-full h-80 sm:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="solarStack" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.85} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.35} />
              </linearGradient>
              <linearGradient id="windStack" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.85} />
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.35} />
              </linearGradient>
              <linearGradient id="bessStack" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.85} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.35} />
              </linearGradient>
              <linearGradient id="genStack" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.85} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.35} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" vertical={false} />
            <XAxis dataKey="time" stroke="#64748B" fontSize={11} fontFamily="monospace" tickLine={false} />
            <YAxis stroke="#64748B" fontSize={11} fontFamily="monospace" tickLine={false} unit=" kW" />

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const pt = payload[0]?.payload;
                const totalGen = (pt?.pvUsed || 0) + (pt?.windUsed || 0) + (pt?.bessDischarge || 0) + (pt?.genOutput || 0);

                return (
                  <div className="bg-[#0A121E]/95 border border-cyan-500/40 p-3.5 rounded shadow-2xl font-mono text-xs text-slate-200 min-w-[240px]">
                    <p className="text-cyan-400 font-bold mb-1.5 border-b border-[#1B2C42] pb-1">
                      DISPATCH HOUR: {label}
                    </p>

                    <div className="space-y-1">
                      <div className="flex justify-between text-amber-300">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" />
                          Solar PV Used:
                        </span>
                        <span className="font-bold text-white">{pt?.pvUsed} kW</span>
                      </div>

                      <div className="flex justify-between text-cyan-300">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-sm bg-cyan-400 inline-block" />
                          Wind Turbines:
                        </span>
                        <span className="font-bold text-white">{pt?.windUsed} kW</span>
                      </div>

                      <div className="flex justify-between text-emerald-300">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block" />
                          BESS Discharge:
                        </span>
                        <span className="font-bold text-white">{pt?.bessDischarge} kW</span>
                      </div>

                      {pt?.bessCharge > 0 && (
                        <div className="flex justify-between text-teal-300">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm bg-teal-400 inline-block" />
                            BESS Charging:
                          </span>
                          <span className="font-bold text-teal-300">+{pt?.bessCharge} kW</span>
                        </div>
                      )}

                      <div className="flex justify-between text-blue-300">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-sm bg-blue-400 inline-block" />
                          Generator Output:
                        </span>
                        <span className="font-bold text-white">{pt?.genOutput} kW</span>
                      </div>
                    </div>

                    <div className="border-t border-[#1B2C42] mt-2 pt-1.5 flex justify-between font-bold text-slate-100">
                      <span>Total Supply:</span>
                      <span className="text-cyan-300">{totalGen.toFixed(1)} kW</span>
                    </div>

                    <div className="flex justify-between font-bold text-rose-300">
                      <span>Station Demand:</span>
                      <span>{pt?.loadDemand} kW</span>
                    </div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '11px', fontFamily: 'monospace' }} />

            {/* Stacked Generation Areas */}
            <Area
              type="monotone"
              dataKey="pvUsed"
              name="Solar PV (Used)"
              stackId="dispatch"
              stroke="#F59E0B"
              fill="url(#solarStack)"
            />
            <Area
              type="monotone"
              dataKey="windUsed"
              name="Wind Generation"
              stackId="dispatch"
              stroke="#06B6D4"
              fill="url(#windStack)"
            />
            <Area
              type="monotone"
              dataKey="bessDischarge"
              name="BESS Discharge"
              stackId="dispatch"
              stroke="#10B981"
              fill="url(#bessStack)"
            />
            <Area
              type="monotone"
              dataKey="genOutput"
              name="Diesel Generator"
              stackId="dispatch"
              stroke="#3B82F6"
              fill="url(#genStack)"
            />

            {/* Total Demand Load Overlay Line */}
            <Line
              type="monotone"
              dataKey="loadDemand"
              name="Station Load Demand"
              stroke="#FFFFFF"
              strokeWidth={3}
              dot={{ r: 3, fill: '#FFFFFF' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
