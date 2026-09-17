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
  ReferenceLine,
} from 'recharts';
import { HourlyForecastPoint } from '@/lib/types';
import { useStation, TimeRange } from '@/lib/context/StationContext';

interface EnergyOverviewChartProps {
  data: HourlyForecastPoint[];
}

export const EnergyOverviewChart: React.FC<EnergyOverviewChartProps> = ({ data }) => {
  const { timeRange, setTimeRange } = useStation();

  // Filter data according to timeRange
  const displayData = React.useMemo(() => {
    if (timeRange === '6H') return data.slice(0, 6);
    if (timeRange === '12H') return data.slice(0, 12);
    return data; // 24H or 7D simulated points
  }, [data, timeRange]);

  const currentHourStr = new Date().getHours().toString().padStart(2, '0') + ':00';

  const ranges: TimeRange[] = ['6H', '12H', '24H', '7D'];

  return (
    <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2.5 border-b border-[#1B2C42]/50">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm bg-cyan-400" />
            24-Hour Energy Demand & Generation Overview
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Real-time telemetry tracking vs AI-projected demand curve and renewable yield
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-1 bg-[#090F18] p-1 rounded border border-[#1B2C42]">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                timeRange === r
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Recharts Chart Container */}
      <div className="w-full h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={displayData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="renewableGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="loadConfidence" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#64748B"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              unit=" kW"
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div className="bg-[#0A121E]/95 border border-cyan-500/40 p-3 rounded shadow-2xl backdrop-blur-md font-mono text-xs text-slate-200">
                    <p className="text-cyan-400 font-bold mb-1.5 border-b border-[#1B2C42] pb-1">
                      TIME: {label}
                    </p>
                    {payload.map((entry: any) => (
                      <div key={entry.name} className="flex items-center justify-between gap-4 py-0.5">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: entry.color }}
                          />
                          {entry.name}:
                        </span>
                        <span className="font-bold text-white">
                          {entry.value !== undefined ? `${entry.value} kW` : 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />

            <Legend
              wrapperStyle={{
                paddingTop: '12px',
                fontSize: '11px',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
              }}
            />

            {/* Current Time Marker */}
            <ReferenceLine
              x={currentHourStr}
              stroke="#10B981"
              strokeDasharray="4 4"
              label={{
                value: 'LIVE TIME',
                fill: '#10B981',
                fontSize: 10,
                fontFamily: 'monospace',
                position: 'top',
              }}
            />

            {/* Renewable Generation Area */}
            <Area
              type="monotone"
              dataKey="totalRenewableKW"
              name="Renewable Generation"
              fill="url(#renewableGradient)"
              stroke="#06B6D4"
              strokeWidth={2}
            />

            {/* Forecasted Load Line */}
            <Line
              type="monotone"
              dataKey="predictedLoadKW"
              name="Forecasted Load"
              stroke="#60A5FA"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />

            {/* Actual Load Line */}
            <Line
              type="monotone"
              dataKey="actualLoadKW"
              name="Actual Load"
              stroke="#10B981"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#10B981' }}
              activeDot={{ r: 5, stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
