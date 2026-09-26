'use client';

import React from 'react';
import { ScenarioMetadata } from '@/lib/types';
import { AlertCircle, Sun, Sliders, Calendar, Info } from 'lucide-react';

interface ScenarioDisclosureProps {
  metadata?: ScenarioMetadata | null;
  stationName?: string;
}

export const ScenarioDisclosure: React.FC<ScenarioDisclosureProps> = ({
  metadata,
  stationName = 'Maitri Station',
}) => {
  const pvCapacity = metadata?.pv_capacity_kw ?? 100.0;
  const pr = metadata?.performance_ratio ?? 0.80;
  const month = metadata?.scenario_month ?? 'December';
  const scenarioType = metadata?.scenario_type ?? 'HISTORICAL_CLIMATOLOGY_SCENARIO';
  const description = metadata?.source_description ?? 
    'Historical climatological solar resource parameterized with 100 kW PV capacity baseline.';

  return (
    <div className="bg-[#0B1522]/90 backdrop-blur-md rounded-lg border border-amber-500/30 p-4 font-mono text-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Header and Disclosure Tag */}
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded bg-amber-500/15 border border-amber-500/40 flex items-center justify-center flex-shrink-0 text-amber-400 mt-0.5">
            <AlertCircle size={16} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-amber-300 font-bold uppercase tracking-wider text-[11px]">
                PV input: Historical climatology scenario
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase">
                MODEL / SIMULATION ASSUMPTIONS
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
              {description} <span className="text-amber-400/90 font-semibold">Values represent modeled PV generation based on historical irradiance, not real-time telemetry.</span>
            </p>
          </div>
        </div>

        {/* Parameters Badges */}
        <div className="flex flex-wrap items-center gap-2 md:flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#07101B] border border-cyan-500/30 text-cyan-300 text-[11px]">
            <Sun size={13} className="text-cyan-400" />
            <span>PV Capacity:</span>
            <span className="font-bold text-white">{pvCapacity} kW</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#07101B] border border-emerald-500/30 text-emerald-300 text-[11px]">
            <Sliders size={13} className="text-emerald-400" />
            <span>Performance Ratio:</span>
            <span className="font-bold text-white">{pr.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#07101B] border border-purple-500/30 text-purple-300 text-[11px]">
            <Calendar size={13} className="text-purple-400" />
            <span>Scenario Month:</span>
            <span className="font-bold text-white">{month}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
