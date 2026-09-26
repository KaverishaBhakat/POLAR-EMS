'use client';

import React, { useState } from 'react';
import { HourlyDispatchPoint } from '@/lib/types';
import { Zap, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface GeneratorScheduleTableProps {
  dispatchSchedule: HourlyDispatchPoint[];
}

export const GeneratorScheduleTable: React.FC<GeneratorScheduleTableProps> = ({
  dispatchSchedule,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const activePoints = dispatchSchedule.filter((pt) => {
    const output = pt.generator_output_kW ?? (pt.generator1KW + pt.generator2KW + (pt.generator3KW || 0));
    return output > 0;
  });

  const totalGenEnergy = dispatchSchedule.reduce((acc, pt) => {
    const output = pt.generator_output_kW ?? (pt.generator1KW + pt.generator2KW + (pt.generator3KW || 0));
    return acc + output;
  }, 0);

  const totalRuntimeHours = activePoints.length;

  return (
    <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2.5 border-b border-[#1B2C42]/50">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" />
            24-Hour Generator Commitment & Dispatch Schedule
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Unit commitment state determined by OR-Tools branch-and-cut optimization
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded bg-[#0A1828] border border-blue-500/30 text-blue-300">
            COMMITTED HOURS: <span className="font-bold text-white">{totalRuntimeHours}h / 24h</span>
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded bg-[#0A1828] border border-blue-500/30 text-blue-300">
            TOTAL OUTPUT: <span className="font-bold text-white">{totalGenEnergy.toFixed(1)} kWh</span>
          </span>
        </div>
      </div>

      {/* 24-Hour Visual Bar Grid */}
      <div className="mb-4">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between">
          <span>Hourly Generator Status (00:00 - 23:00)</span>
          <span className="text-emerald-400 font-semibold">{24 - totalRuntimeHours}h Generators OFFLINE (Fuel Saved)</span>
        </div>
        <div className="grid grid-cols-12 sm:grid-cols-24 gap-1">
          {dispatchSchedule.map((pt, idx) => {
            const output = pt.generator_output_kW ?? (pt.generator1KW + pt.generator2KW + (pt.generator3KW || 0));
            const isRunning = output > 0;
            const timeLabel = pt.time || `${String(idx).padStart(2, '0')}:00`;

            return (
              <div
                key={idx}
                title={`${timeLabel}: ${isRunning ? `RUNNING (${output.toFixed(1)} kW)` : 'OFFLINE (0 kW)'}`}
                className={`p-1.5 rounded text-center transition-all cursor-default border ${
                  isRunning
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                    : 'bg-[#08101A] border-[#1B2C42]/60 text-slate-500 hover:border-slate-600'
                }`}
              >
                <div className="text-[9px] font-bold truncate">{timeLabel.slice(0, 2)}</div>
                <div className="text-[8px] mt-0.5 font-semibold">
                  {isRunning ? `${Math.round(output)}k` : 'OFF'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compact / Expandable Detailed Table */}
      <div className="border border-[#1B2C42]/80 rounded-lg overflow-hidden bg-[#09111C]">
        <div className="p-2.5 bg-[#0C1726] border-b border-[#1B2C42] flex items-center justify-between text-xs">
          <span className="text-slate-300 font-bold">
            {isExpanded ? 'Full 24-Hour Dispatch Table' : 'Active Generator Commitment Windows'}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <span>{isExpanded ? 'Show Active Only' : 'Expand All 24 Hours'}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-[#0A121E] text-slate-400 border-b border-[#1B2C42] uppercase text-[10px] sticky top-0">
              <tr>
                <th className="py-2 px-3">Hour</th>
                <th className="py-2 px-3">Time</th>
                <th className="py-2 px-3">Genset State</th>
                <th className="py-2 px-3 text-right">Output (kW)</th>
                <th className="py-2 px-3 text-right">Load Share (%)</th>
                <th className="py-2 px-3 text-right">Station Demand (kW)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B2C42]/50 text-slate-300">
              {(isExpanded ? dispatchSchedule : activePoints).map((pt, idx) => {
                const output = pt.generator_output_kW ?? (pt.generator1KW + pt.generator2KW + (pt.generator3KW || 0));
                const load = pt.load_kW ?? pt.totalLoadKW ?? 60.0;
                const isRunning = output > 0;
                const loadShare = load > 0 ? ((output / load) * 100).toFixed(1) : '0.0';

                return (
                  <tr
                    key={idx}
                    className={`hover:bg-[#0E1A2C] transition-colors ${
                      isRunning ? 'bg-blue-500/5' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-semibold text-slate-400">{pt.hour ?? idx + 1}</td>
                    <td className="py-2 px-3 font-bold text-white">{pt.time || `${String(idx).padStart(2, '0')}:00`}</td>
                    <td className="py-2 px-3">
                      {isRunning ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold">
                          <CheckCircle2 size={11} className="text-blue-400" />
                          RUNNING
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          <XCircle size={11} className="text-slate-500" />
                          OFFLINE
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-white">
                      {output > 0 ? `${output.toFixed(1)} kW` : '0.0 kW'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-cyan-300">
                      {isRunning ? `${loadShare}%` : '0%'}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300 font-mono">
                      {load.toFixed(1)} kW
                    </td>
                  </tr>
                );
              })}

              {!isExpanded && activePoints.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 px-3 text-center text-slate-400">
                    No generator commitments required. 100% renewable & battery coverage.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
