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
import { PlaySquare, Play, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import { PageHeader, GlassCard, Button } from '@/components/ui';

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
      {/* Page Header */}
      <PageHeader
        title="Polar Scenario Simulator"
        subtitle={`Interactive physics parameter modeling & load-shedding sandbox | ${station?.name || 'Maitri'}`}
        icon={<PlaySquare className="w-5 h-5 text-amber-400" />}
        badge={{
          label: "SANDBOX / SIMULATION",
          variant: "warning"
        }}
        breadcrumbs={[
          { label: "Intelligence", href: "/simulation" },
          { label: "Scenario Sandbox" }
        ]}
        actions={
          <a
            href="/resilience"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-200 hover:text-white hover:bg-white/[0.08] text-xs font-mono font-medium transition-all"
          >
            <ShieldCheck size={14} className="text-accent-bright" />
            <span>RESILIENCE DASHBOARD</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent-bright">6 SCENARIOS</span>
          </a>
        }
      />

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
