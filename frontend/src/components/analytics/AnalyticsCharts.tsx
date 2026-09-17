'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { HistoricalAnalyticsPoint } from '@/lib/types';
import { Fuel, Leaf, Gauge, Zap, IndianRupee, ShieldCheck } from 'lucide-react';

interface AnalyticsChartsProps {
  data: HistoricalAnalyticsPoint[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ data }) => {
  return (
    <div className="space-y-4">
      {/* 1. Daily Fuel Consumption: Actual vs Baseline */}
      <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
        <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-[#1B2C42]/50">
          <div>
            <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
              <Fuel className="w-4 h-4 text-amber-400" />
              Daily Diesel Fuel Consumption vs Conventional Baseline
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              Direct comparison of daily liters consumed vs un-optimized baseline
            </p>
          </div>
        </div>

        <div className="w-full h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" vertical={false} />
              <XAxis dataKey="date" stroke="#64748B" fontSize={11} fontFamily="monospace" tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} fontFamily="monospace" tickLine={false} unit=" L" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <div className="bg-[#0A121E]/95 border border-cyan-500/40 p-3 rounded shadow-2xl font-mono text-xs text-slate-200">
                      <p className="text-cyan-400 font-bold mb-1 border-b border-[#1B2C42] pb-0.5">
                        DATE: {label}
                      </p>
                      {payload.map((entry: any) => (
                        <div key={entry.name} className="flex justify-between gap-3 py-0.5">
                          <span style={{ color: entry.color }}>{entry.name}:</span>
                          <span className="font-bold text-white">{entry.value} L</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontFamily: 'monospace' }} />
              <Bar dataKey="baselineFuelL" name="Conventional Baseline" fill="#475569" radius={[2, 2, 0, 0]} />
              <Bar dataKey="actualFuelL" name="POLAR-EMS Optimized" fill="#10B981" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Grid of 2 Charts: Renewable Penetration Trend & Generator Efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Renewable Penetration */}
        <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
          <div className="mb-3 pb-2 border-b border-[#1B2C42]/50">
            <h3 className="text-xs font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
              <Leaf className="w-4 h-4 text-cyan-400" />
              Daily Renewable Energy Penetration (%)
            </h3>
          </div>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="renPenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={10} fontFamily="monospace" tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} fontFamily="monospace" tickLine={false} unit="%" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="renewablePenetrationPercent"
                  name="Renewable Share (%)"
                  stroke="#06B6D4"
                  fill="url(#renPenGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Generator Thermal Efficiency */}
        <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
          <div className="mb-3 pb-2 border-b border-[#1B2C42]/50">
            <h3 className="text-xs font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-400" />
              Fleet Average Generator Efficiency (%)
            </h3>
          </div>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={10} fontFamily="monospace" tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} fontFamily="monospace" tickLine={false} unit="%" domain={[75, 95]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="avgGenEfficiencyPercent"
                  name="Efficiency (%)"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
