'use client';

import React from 'react';
import { SimulationParams } from '@/lib/types';
import { Thermometer, Wind, Sun, Users, BatteryCharging, AlertCircle, Cpu } from 'lucide-react';

interface ScenarioControlsProps {
  params: SimulationParams;
  onChange: (newParams: SimulationParams) => void;
  disabled?: boolean;
}

export const ScenarioControls: React.FC<ScenarioControlsProps> = ({
  params,
  onChange,
  disabled = false,
}) => {
  const updateParam = <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => {
    onChange({
      ...params,
      [key]: value,
    });
  };

  const toggleGen = (genKey: 'g1' | 'g2' | 'g3' | 'g4') => {
    onChange({
      ...params,
      generatorsAvailable: {
        ...params.generatorsAvailable,
        [genKey]: !params.generatorsAvailable[genKey],
      },
    });
  };

  return (
    <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5 space-y-5">
      <div className="pb-2.5 border-b border-[#1B2C42]/50">
        <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          Environmental & Grid Simulation Parameters
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Adjust physical vectors to simulate severe polar meteorological stressors & equipment outages
        </p>
      </div>

      <div className="space-y-4 font-mono">
        {/* 1. Temperature Slider (-5°C to -50°C) */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Thermometer size={14} className="text-cyan-400" />
              Ambient Temperature:
            </span>
            <span className="font-bold text-cyan-300 text-sm">{params.temperatureC}°C</span>
          </div>
          <input
            type="range"
            min="-50"
            max="-5"
            step="1"
            value={params.temperatureC}
            disabled={disabled}
            onChange={(e) => updateParam('temperatureC', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#080D14] rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-[#1B2C42]"
          />
          <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
            <span>Extreme Cold (-50°C)</span>
            <span>Milder (-5°C)</span>
          </div>
        </div>

        {/* 2. Wind Speed (0 to 40 m/s) */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Wind size={14} className="text-blue-400" />
              Wind Speed:
            </span>
            <span className="font-bold text-blue-300 text-sm">{params.windSpeedMs} m/s</span>
          </div>
          <input
            type="range"
            min="0"
            max="40"
            step="0.5"
            value={params.windSpeedMs}
            disabled={disabled}
            onChange={(e) => updateParam('windSpeedMs', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#080D14] rounded-lg appearance-none cursor-pointer accent-blue-400 border border-[#1B2C42]"
          />
          <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
            <span>Calm (0 m/s)</span>
            <span>Cutout (&gt;25 m/s)</span>
            <span>Blizzard (40 m/s)</span>
          </div>
        </div>

        {/* 3. Solar Availability (0 to 100%) */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Sun size={14} className="text-amber-400" />
              Solar Irradiance Availability:
            </span>
            <span className="font-bold text-amber-300 text-sm">{params.solarAvailabilityPercent}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={params.solarAvailabilityPercent}
            disabled={disabled}
            onChange={(e) => updateParam('solarAvailabilityPercent', parseInt(e.target.value))}
            className="w-full h-1.5 bg-[#080D14] rounded-lg appearance-none cursor-pointer accent-amber-400 border border-[#1B2C42]"
          />
          <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
            <span>Polar Night (0%)</span>
            <span>Midday Sun (100%)</span>
          </div>
        </div>

        {/* 4. Station Occupancy (10 to 100%) */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Users size={14} className="text-purple-400" />
              Station Occupancy:
            </span>
            <span className="font-bold text-purple-300 text-sm">{params.stationOccupancyPercent}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={params.stationOccupancyPercent}
            disabled={disabled}
            onChange={(e) => updateParam('stationOccupancyPercent', parseInt(e.target.value))}
            className="w-full h-1.5 bg-[#080D14] rounded-lg appearance-none cursor-pointer accent-purple-400 border border-[#1B2C42]"
          />
          <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
            <span>Winter Skeleton (10%)</span>
            <span>Summer Peak (100%)</span>
          </div>
        </div>

        {/* 5. Battery Initial SOC (0 to 100%) */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="flex items-center gap-1.5 text-slate-300">
              <BatteryCharging size={14} className="text-emerald-400" />
              Battery Initial SOC:
            </span>
            <span className="font-bold text-emerald-300 text-sm">{params.batteryInitialSocPercent}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={params.batteryInitialSocPercent}
            disabled={disabled}
            onChange={(e) => updateParam('batteryInitialSocPercent', parseInt(e.target.value))}
            className="w-full h-1.5 bg-[#080D14] rounded-lg appearance-none cursor-pointer accent-emerald-400 border border-[#1B2C42]"
          />
          <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
            <span>Depleted (0%)</span>
            <span>Safety Reserve (30%)</span>
            <span>Full (100%)</span>
          </div>
        </div>

        {/* 6. Generator Availability Toggles (G1-G4) */}
        <div className="pt-2 border-t border-[#1B2C42]/50">
          <label className="text-xs text-slate-300 block mb-2 font-bold uppercase">
            Available Diesel Generator Units:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['g1', 'g2', 'g3', 'g4'] as const).map((genKey, idx) => {
              const isEnabled = params.generatorsAvailable[genKey];
              return (
                <button
                  key={genKey}
                  type="button"
                  onClick={() => toggleGen(genKey)}
                  className={`p-2 rounded border text-xs font-mono font-bold transition-all ${
                    isEnabled
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400 line-through opacity-70'
                  }`}
                >
                  G{idx + 1} {isEnabled ? 'ONLINE' : 'OUTAGE'}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
