'use client';

import React from 'react';
import { SCENARIO_PRESETS } from '@/lib/mock-data/simulation';
import { SimulationParams } from '@/lib/types';
import { Sparkles, CloudSnow, Wind, AlertTriangle, Users, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface ScenarioPresetsProps {
  onSelectPreset: (presetKey: string, params: SimulationParams) => void;
  activePresetKey: string;
}

const PRESET_ICONS: Record<string, React.ReactNode> = {
  normal: <CheckCircle2 size={16} className="text-emerald-400" />,
  extremeCold: <CloudSnow size={16} className="text-cyan-400" />,
  storm: <Wind size={16} className="text-amber-400" />,
  lowRenewable: <AlertTriangle size={16} className="text-orange-400" />,
  highOccupancy: <Users size={16} className="text-purple-400" />,
  genFailure: <AlertOctagon size={16} className="text-rose-400" />,
};

export const ScenarioPresets: React.FC<ScenarioPresetsProps> = ({
  onSelectPreset,
  activePresetKey,
}) => {
  return (
    <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
      <div className="mb-3.5 pb-2 border-b border-[#1B2C42]/50 flex items-center justify-between">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Standard Extreme Scenario Presets
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
            One-click stress-testing profiles calibrated against historical Antarctic station events
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 font-mono">
        {Object.entries(SCENARIO_PRESETS).map(([key, item]) => {
          const isActive = activePresetKey === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectPreset(key, item.params)}
              className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                isActive
                  ? 'bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                  : 'bg-[#0A121E] border-[#1B2C42]/80 hover:border-cyan-500/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {PRESET_ICONS[key]}
                <span
                  className={`text-xs font-bold uppercase ${
                    isActive ? 'text-cyan-300' : 'text-slate-200'
                  }`}
                >
                  {item.name}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                {item.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
