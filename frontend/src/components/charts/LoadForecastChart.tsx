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
import { ForecastMetrics, HourlyForecastPoint } from '@/lib/types';
import { StatusBadge } from '../common/StatusBadge';

interface LoadForecastChartProps {
  data: HourlyForecastPoint[];
  metrics: ForecastMetrics;
}

export const LoadForecastChart: React.FC<LoadForecastChartProps> = ({ data, metrics }) => {
  return (
    <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2.5 border-b border-[#1B2C42]/50">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm bg-blue-400" />
            24-Hour Load Demand Forecast & Error Confidence Interval
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Model: {metrics.modelName} | Updated: {metrics.lastUpdated}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge
            status="OPERATIONAL"
            label={`ACCURACY: ${metrics.accuracyPercent}%`}
            size="sm"
          />
        </div>
      </div>

      {/* Accuracy KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="p-2.5 rounded bg-[#0A121E] border border-[#1B2C42] text-center font-mono">
          <div className="text-[10px] text-slate-400">MEAN ABSOLUTE ERROR</div>
          <div className="text-sm font-bold text-cyan-300 mt-0.5">{metrics.maeKW} kW</div>
        </div>
        <div className="p-2.5 rounded bg-[#0A121E] border border-[#1B2C42] text-center font-mono">
          <div className="text-[10px] text-slate-400">ROOT MEAN SQUARE ERROR</div>
          <div className="text-sm font-bold text-blue-300 mt-0.5">{metrics.rmseKW} kW</div>
        </div>
        <div className="p-2.5 rounded bg-[#0A121E] border border-[#1B2C42] text-center font-mono">
          <div className="text-[10px] text-slate-400">FORECAST CONFIDENCE</div>
          <div className="text-sm font-bold text-emerald-300 mt-0.5">{metrics.confidencePercent}%</div>
        </div>
        <div className="p-2.5 rounded bg-[#0A121E] border border-[#1B2C42] text-center font-mono">
          <div className="text-[10px] text-slate-400">LOOKAHEAD HORIZON</div>
          <div className="text-sm font-bold text-slate-200 mt-0.5">24 Hours (Hourly)</div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.03} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" vertical={false} />
            <XAxis dataKey="time" stroke="#64748B" fontSize={11} fontFamily="monospace" tickLine={false} />
            <YAxis stroke="#64748B" fontSize={11} fontFamily="monospace" tickLine={false} unit=" kW" />

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
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
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontFamily: 'monospace' }} />

            {/* Confidence Interval Upper and Lower */}
            <Area
              type="monotone"
              dataKey="upperConfidenceKW"
              name="Upper Confidence Band (95%)"
              stroke="#3B82F6"
              strokeDasharray="2 2"
              fill="url(#confidenceBand)"
              strokeWidth={1}
            />

            {/* Predicted Curve */}
            <Line
              type="monotone"
              dataKey="predictedLoadKW"
              name="AI Predicted Load"
              stroke="#60A5FA"
              strokeWidth={2.5}
              dot={false}
            />

            {/* Actual Load */}
            <Line
              type="monotone"
              dataKey="actualLoadKW"
              name="Recorded Load (Telemetry)"
              stroke="#10B981"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#10B981' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
