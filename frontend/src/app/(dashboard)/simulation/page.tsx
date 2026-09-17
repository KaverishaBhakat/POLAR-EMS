'use client';

import React, { useEffect, useState } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { SimulationParams, SimulationResults as SimResultsType } from '@/lib/types';
import { SCENARIO_PRESETS } from '@/lib/mock-data/simulation';
import { ScenarioControls } from '@/components/simulation/ScenarioControls';
import { ScenarioPresets } from '@/components/simulation/ScenarioPresets';
import { SimulationResults } from '@/components/simulation/SimulationResults';
import { LoadingSkeleton } from '@/components/common/Toast';
import { PlaySquare, Play, RefreshCw, Sparkles } from 'lucide-react';

export default function SimulationPage() {
  const { activeStationId, station, addToast } = useStation();

  const [activePresetKey, setActivePresetKey] = useState<string>('storm');
  const [params, setParams] = useState<SimulationParams>(SCENARIO_PRESETS.storm.params);
  const [results, setResults] = useState<SimResultsType | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Initial calculation on mount
  useEffect(() => {
    let isMounted = true;
    async function initSim() {
      setIsSimulating(true);
      try {
        const res = await apiClient.runSimulation(params, activeStationId);
        if (isMounted) setResults(res);
      } finally {
        if (isMounted) setIsSimulating(false);
      }
    }
    initSim();
    return () => {
      isMounted = false;
    };
  }, [activeStationId]);

  const handleSelectPreset = async (key: string, presetParams: SimulationParams) => {
    setActivePresetKey(key);
    setParams(presetParams);
    setIsSimulating(true);
    try {
      const res = await apiClient.runSimulation(presetParams, activeStationId);
      setResults(res);
      addToast({
        type: res.energyStressDetected ? 'WARNING' : 'INFO',
        title: `Scenario Loaded: ${SCENARIO_PRESETS[key]?.name}`,
        message: `Physics parameters updated for ${station?.name}.`,
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await apiClient.runSimulation(params, activeStationId);
      setResults(res);
      addToast({
        type: res.energyStressDetected ? 'WARNING' : 'SUCCESS',
        title: 'Simulation Complete',
        message: res.energyStressDetected
          ? 'ENERGY STRESS DETECTED: Automated load-shedding sequence recommended.'
          : 'Simulation evaluated successfully within nominal safety envelope.',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1B2C42]/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wide uppercase flex items-center gap-2.5">
            <PlaySquare className="w-5 h-5 text-amber-400" />
            Polar Scenario Simulator
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Test POLAR-EMS under extreme Antarctic operating conditions & meteorological disruptions | {station?.name}
          </p>
        </div>
      </div>

      {/* Scenario Presets Bar */}
      <ScenarioPresets
        activePresetKey={activePresetKey}
        onSelectPreset={handleSelectPreset}
      />

      {/* Main Simulation Layout: Controls on Left, Results on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Parameter Controls (4 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          <ScenarioControls
            params={params}
            onChange={(newP) => {
              setParams(newP);
              setActivePresetKey('custom');
            }}
            disabled={isSimulating}
          />

          {/* Run Simulation Button */}
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className={`w-full py-3.5 rounded-lg font-mono font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-xl flex items-center justify-center gap-2 cursor-pointer ${
              isSimulating
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 cursor-wait'
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)]'
            }`}
          >
            {isSimulating ? (
              <>
                <RefreshCw size={15} className="animate-spin text-cyan-300" />
                <span>COMPUTING POLAR SCENARIO...</span>
              </>
            ) : (
              <>
                <Play size={15} className="fill-current" />
                <span>RUN SIMULATION</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Results & Timeline (7 cols on lg) */}
        <div className="lg:col-span-7">
          {results ? (
            <SimulationResults results={results} />
          ) : (
            <LoadingSkeleton className="h-96" />
          )}
        </div>
      </div>
    </div>
  );
}
