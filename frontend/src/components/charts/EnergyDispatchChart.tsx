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
  return (
    <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2.5 border-b border-[#1B2C42]/50">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm bg-cyan-400" />
            24-Hour Optimal Energy Dispatch Schedule (Stacked Sources)
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Hourly generation stacking: Solar + Wind + Battery Discharge + G1 + G2 matching Station Demand
          </p>
        </div>
      </div>

      <div className="w-full h-80 sm:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="solarStack" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.4} />
              </linearGradient>
              <linearGradient id="windStack" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.4} />
              </linearGradient>
              <linearGradient id="bessStack" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.4} />
              </linearGradient>
              <linearGradient id="gen1Stack" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.4} />
              </linearGradient>
              <linearGradient id="gen2Stack" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.4} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" vertical={false} />
            <XAxis dataKey="time" stroke="#64748B" fontSize={11} fontFamily="monospace" tickLine={false} />
            <YAxis stroke="#64748B" fontSize={11} fontFamily="monospace" tickLine={false} unit=" kW" />

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const total = payload.reduce((acc, p: any) => (p.dataKey !== 'totalLoadKW' ? acc + (p.value || 0) : acc), 0);
                const load = payload.find((p: any) => p.dataKey === 'totalLoadKW')?.value;

                return (
                  <div className="bg-[#0A121E]/95 border border-cyan-500/40 p-3.5 rounded shadow-2xl font-mono text-xs text-slate-200 min-w-[220px]">
                    <p className="text-cyan-400 font-bold mb-1.5 border-b border-[#1B2C42] pb-1">
                      DISPATCH TIME: {label}
                    </p>
                    {payload.map((entry: any) => {
                      if (entry.dataKey === 'totalLoadKW') return null;
                      return (
                        <div key={entry.name} className="flex justify-between gap-3 py-0.5">
                          <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                            <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: entry.color }} />
                            {entry.name}:
                          </span>
                          <span className="font-bold text-white">{entry.value} kW</span>
                        </div>
                      );
                    })}
                    <div className="border-t border-[#1B2C42] mt-1.5 pt-1.5 flex justify-between font-bold text-slate-100">
                      <span>Total Generation:</span>
                      <span className="text-cyan-300">{total} kW</span>
                    </div>
                    {load !== undefined && (
                      <div className="flex justify-between font-bold text-rose-300">
                        <span>Station Load:</span>
                        <span>{load} kW</span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '11px', fontFamily: 'monospace' }} />

            {/* Stacked Generation Areas */}
            <Area
              type="monotone"
              dataKey="solarKW"
              name="Solar PV"
              stackId="dispatch"
              stroke="#F59E0B"
              fill="url(#solarStack)"
            />
            <Area
              type="monotone"
              dataKey="windKW"
              name="Wind Turbines"
              stackId="dispatch"
              stroke="#06B6D4"
              fill="url(#windStack)"
            />
            <Area
              type="monotone"
              dataKey="batteryDischargeKW"
              name="BESS Discharge"
              stackId="dispatch"
              stroke="#10B981"
              fill="url(#bessStack)"
            />
            <Area
              type="monotone"
              dataKey="generator1KW"
              name="Primary Genset G1"
              stackId="dispatch"
              stroke="#3B82F6"
              fill="url(#gen1Stack)"
            />
            <Area
              type="monotone"
              dataKey="generator2KW"
              name="Secondary Genset G2"
              stackId="dispatch"
              stroke="#8B5CF6"
              fill="url(#gen2Stack)"
            />

            {/* Total Demand Load Overlay Line */}
            <Line
              type="monotone"
              dataKey="totalLoadKW"
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
