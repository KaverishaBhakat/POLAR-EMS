'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { HourlyDispatchPoint } from '@/lib/types';
import { BatteryCharging, ShieldAlert, CheckCircle } from 'lucide-react';

interface BatterySOCChartProps {
  data: HourlyDispatchPoint[];
  minSOCLimit?: number;
  maxSOCLimit?: number;
}

export const BatterySOCChart: React.FC<BatterySOCChartProps> = ({
  data,
  minSOCLimit = 20,
  maxSOCLimit = 95,
}) => {
  // Compute actual min and max SOC in data
  const socValues = data.map((d) => d.battery_soc_percent ?? d.batterySOC ?? 75.0);
  const currentMinSOC = socValues.length > 0 ? Math.min(...socValues) : 20.0;
  const currentMaxSOC = socValues.length > 0 ? Math.max(...socValues) : 78.5;

  const chartData = data.map((pt, idx) => ({
    time: pt.time || `${String(pt.hour ?? idx).padStart(2, '0')}:00`,
    batterySOC: pt.battery_soc_percent ?? pt.batterySOC ?? 75.0,
    chargeKW: pt.battery_charge_kW ?? pt.batteryChargeKW ?? 0,
    dischargeKW: pt.battery_discharge_kW ?? pt.batteryDischargeKW ?? 0,
  }));

  return (
    <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2.5 border-b border-[#1B2C42]/50">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase flex items-center gap-2">
            <BatteryCharging className="w-4 h-4 text-cyan-400" />
            24-Hour Battery State of Charge (SOC) & Safety Envelopes
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            OR-Tools bounded storage trajectory with strict 20.0% life-support reserve constraint
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded bg-[#0A1828] border border-cyan-500/30 text-cyan-300">
            SOC RANGE: <span className="font-bold text-white">{currentMinSOC.toFixed(1)}% – {currentMaxSOC.toFixed(1)}%</span>
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded bg-[#0A1828] border border-rose-500/30 text-rose-300">
            MIN LIMIT: <span className="font-bold text-white">{minSOCLimit}%</span>
          </span>
        </div>
      </div>

      <div className="w-full h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="socGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.7} />
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" vertical={false} />
            <XAxis dataKey="time" stroke="#64748B" fontSize={11} fontFamily="monospace" tickLine={false} />
            <YAxis
              domain={[0, 100]}
              stroke="#64748B"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              unit="%"
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const point = payload[0].payload;
                return (
                  <div className="bg-[#0A121E]/95 border border-cyan-500/40 p-3 rounded shadow-2xl font-mono text-xs text-slate-200 min-w-[200px]">
                    <p className="text-cyan-400 font-bold mb-1 border-b border-[#1B2C42] pb-1">
                      TIME: {label}
                    </p>
                    <div className="flex justify-between py-0.5">
                      <span className="text-cyan-300">Battery SOC:</span>
                      <span className="font-bold text-white">{point.batterySOC.toFixed(1)}%</span>
                    </div>
                    {point.chargeKW > 0 && (
                      <div className="flex justify-between py-0.5 text-emerald-300">
                        <span>Charging Power:</span>
                        <span className="font-bold">+{point.chargeKW.toFixed(1)} kW</span>
                      </div>
                    )}
                    {point.dischargeKW > 0 && (
                      <div className="flex justify-between py-0.5 text-blue-300">
                        <span>Discharging Power:</span>
                        <span className="font-bold">-{point.dischargeKW.toFixed(1)} kW</span>
                      </div>
                    )}
                    <div className="border-t border-[#1B2C42] mt-1 pt-1 flex justify-between text-[10px] text-slate-400">
                      <span>Reserve Buffer:</span>
                      <span className="text-emerald-400 font-bold">
                        +{(point.batterySOC - minSOCLimit).toFixed(1)}% above cutoff
                      </span>
                    </div>
                  </div>
                );
              }}
            />

            {/* Min SOC Safety Constraint Line (20%) */}
            <ReferenceLine
              y={minSOCLimit}
              stroke="#EF4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `MIN SOC LIMIT (${minSOCLimit}%)`,
                fill: '#EF4444',
                fontSize: 10,
                position: 'insideBottomRight',
                fontFamily: 'monospace',
              }}
            />

            {/* Max SOC Upper Bound (95%) */}
            <ReferenceLine
              y={maxSOCLimit}
              stroke="#10B981"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `MAX SOC LIMIT (${maxSOCLimit}%)`,
                fill: '#10B981',
                fontSize: 10,
                position: 'insideTopRight',
                fontFamily: 'monospace',
              }}
            />

            <Area
              type="monotone"
              dataKey="batterySOC"
              name="Battery SOC (%)"
              stroke="#06B6D4"
              strokeWidth={2.5}
              fill="url(#socGradient)"
              dot={{ r: 3, fill: '#06B6D4', strokeWidth: 1, stroke: '#FFFFFF' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
