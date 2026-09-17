'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { HourlyForecastPoint } from '@/lib/types';
import { Sun, Wind } from 'lucide-react';

interface RenewableChartProps {
  data: HourlyForecastPoint[];
}

export const RenewableChart: React.FC<RenewableChartProps> = ({ data }) => {
  return (
    <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2.5 border-b border-[#1B2C42]/50">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm bg-cyan-400" />
            Renewable Co-Generation Forecast (Solar PV + Wind)
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Physics-informed irradiance & katabatic wind velocity power conversion models
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-amber-300">
            <Sun size={13} className="text-amber-400" /> Solar PV
          </span>
          <span className="flex items-center gap-1.5 text-cyan-300">
            <Wind size={13} className="text-cyan-400" /> Wind Turbines
          </span>
        </div>
      </div>

      <div className="w-full h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="solarFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="windFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" vertical={false} />
            <XAxis dataKey="time" stroke="#64748B" fontSize={11} fontFamily="monospace" tickLine={false} />
            <YAxis stroke="#64748B" fontSize={11} fontFamily="monospace" tickLine={false} unit=" kW" />

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const total = payload.reduce((acc, p: any) => acc + (p.value || 0), 0);
                return (
                  <div className="bg-[#0A121E]/95 border border-cyan-500/40 p-3 rounded shadow-2xl font-mono text-xs text-slate-200">
                    <p className="text-cyan-400 font-bold mb-1 border-b border-[#1B2C42] pb-0.5">
                      TIME: {label}
                    </p>
                    {payload.map((entry: any) => (
                      <div key={entry.name} className="flex justify-between gap-3 py-0.5">
                        <span style={{ color: entry.color }}>{entry.name}:</span>
                        <span className="font-bold text-white">{entry.value} kW</span>
                      </div>
                    ))}
                    <div className="border-t border-[#1B2C42] mt-1 pt-1 flex justify-between font-bold text-cyan-300">
                      <span>Total Renewables:</span>
                      <span>{total} kW</span>
                    </div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontFamily: 'monospace' }} />

            <Area
              type="monotone"
              dataKey="solarForecastKW"
              name="Solar PV Generation"
              stackId="1"
              stroke="#F59E0B"
              fill="url(#solarFill)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="windForecastKW"
              name="Wind Turbine Generation"
              stackId="1"
              stroke="#06B6D4"
              fill="url(#windFill)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
