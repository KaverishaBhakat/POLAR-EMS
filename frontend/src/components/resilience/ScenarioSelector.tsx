'use client';

import React from 'react';
import {
  Sun,
  Moon,
  AlertTriangle,
  BatteryLow,
  Wind,
  CloudSnow,
  TrendingUp,
  CheckCircle2,
  Sliders,
  Shield,
} from 'lucide-react';
import { ResilienceSimulationScenario } from '@/lib/types';

interface ScenarioSelectorProps {
  scenarios: ResilienceSimulationScenario[];
  selectedScenarioId: string;
  onSelectScenario: (scenarioId: string) => void;
  isLoading: boolean;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  isLoading,
}) => {
  // Helper for scenario icon
  const getScenarioIcon = (id: string) => {
    switch (id) {
      case 'baseline':
        return <Sun className="w-4 h-4 text-amber-400" />;
      case 'polar-night':
        return <Moon className="w-4 h-4 text-indigo-400" />;
      case 'generator-failure':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'low-battery':
        return <BatteryLow className="w-4 h-4 text-amber-400" />;
      case 'renewable-drop':
        return <Wind className="w-4 h-4 text-cyan-400" />;
      case 'severe-blizzard':
        return <CloudSnow className="w-4 h-4 text-blue-300" />;
      case 'high-demand':
        return <TrendingUp className="w-4 h-4 text-orange-400" />;
      default:
        return <Shield className="w-4 h-4 text-cyan-400" />;
    }
  };

  // Build items including baseline option
  const allOptions = [
    {
      id: 'baseline',
      name: 'Normal Operations (Baseline)',
      category: 'BASELINE',
      description: 'Standard 24-hour microgrid operations with full solar PV, wind generation, nominal battery SOC (75%), and dual diesel generators available.',
    },
    ...scenarios.map((s) => ({
      id: s.scenario_id,
      name: s.scenario_name,
      category: s.category || 'RESILIENCE',
      description: s.description,
    })),
  ];

  const activeOption = allOptions.find((o) => o.id === selectedScenarioId) || allOptions[0];

  return (
    <div className="bg-[#0E1724]/95 rounded-lg border border-[#1B2C42] p-4 sm:p-5 font-mono space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1B2C42]/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm bg-cyan-400" />
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
            Contingency &amp; Stress Scenario Selector
          </h2>
        </div>
        <span className="text-[11px] text-slate-400">
          Select scenario to run OR-Tools MILP resilience simulation
        </span>
      </div>

      {/* Scenario Pill Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        {allOptions.map((opt) => {
          const isSelected = selectedScenarioId === opt.id;
          const icon = getScenarioIcon(opt.id);

          return (
            <button
              key={opt.id}
              onClick={() => onSelectScenario(opt.id)}
              disabled={isLoading}
              className={`p-2.5 rounded-lg border text-left transition-all duration-200 flex flex-col justify-between gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-cyan-500/15 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.2)] text-white'
                  : 'bg-[#080E17] border-[#18283B] text-slate-300 hover:text-white hover:bg-[#121E2E] hover:border-[#253E5C]'
              } ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
            >
              <div className="flex items-center justify-between w-full">
                {icon}
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
              </div>

              <div>
                <p className="text-[11px] font-bold leading-tight line-clamp-1" title={opt.name}>
                  {opt.name.replace(' (Baseline)', '')}
                </p>
                <span className="text-[9px] uppercase tracking-wider text-slate-400">
                  {opt.category}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Scenario Technical Details Banner */}
      <div className="p-3 rounded bg-[#09111C] border border-[#1B2C42]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5">{getScenarioIcon(activeOption.id)}</div>
          <div>
            <span className="font-bold text-white mr-1.5 uppercase">
              {activeOption.name}:
            </span>
            <span className="text-slate-300">{activeOption.description}</span>
          </div>
        </div>

        <div className="flex-shrink-0">
          <span className="text-[10px] font-bold px-2 py-1 rounded bg-[#132338] text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
            {activeOption.id === 'baseline' ? 'NOMINAL DISPATCH' : 'CONTINGENCY RUN'}
          </span>
        </div>
      </div>
    </div>
  );
};
