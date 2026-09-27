'use client';

import React, { useState } from 'react';
import { Database, ChevronDown, ChevronUp, FileText, CheckCircle2 } from 'lucide-react';
import { ResilienceSimulationScenario } from '@/lib/types';

interface DataProvenanceAssumptionsProps {
  scenario?: ResilienceSimulationScenario | null;
  stationId: string;
}

export const DataProvenanceAssumptions: React.FC<DataProvenanceAssumptionsProps> = ({
  scenario,
  stationId,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const provenanceItems = [
    {
      parameter: 'Solar Radiation / Irradiance',
      classification: 'REAL CLIMATOLOGY',
      description: 'Historical December clear-sky / climatology solar irradiance profile for Maitri Station (70°45′57″S, 11°44′09″E).',
      source: 'Maitri Climatological Solar Model',
    },
    {
      parameter: 'PV Electrical Generation',
      classification: 'MODELED',
      description: '100 kW nameplate PV array modeled with 0.80 Performance Ratio (PR) and temperature derating.',
      source: 'POLAR-EMS PV Electrical Model',
    },
    {
      parameter: 'Wind Speed Telemetry',
      classification: 'REAL OBSERVATION',
      description: 'Observed hourly wind speed telemetry from Maitri Automatic Weather Station (AWS) 2019 dataset.',
      source: 'Maitri 2019 Observational Record',
    },
    {
      parameter: 'Wind Turbine Electrical Output',
      classification: 'MODELED',
      description: '50 kW aggregate turbine capacity modeled through nonlinear aerodynamic power curve (3.5 m/s cut-in, 12 m/s rated, 25 m/s cut-out).',
      source: 'Aerodynamic Turbine Power Curve',
    },
    {
      parameter: 'Electrical Demand',
      classification: 'SCENARIO ASSUMPTION',
      description: 'Deterministic Antarctic station load model (base 65.0 kW, diurnal range 55.2–83.6 kW, 42.5 kW critical life-support floor).',
      source: 'Station Energy Profile Model',
    },
    {
      parameter: 'Diesel Generator Fleet',
      classification: 'SCENARIO ASSUMPTION',
      description: 'Dual-genset fleet: GEN-01 (100 kW primary, 40 kW min) and GEN-02 (80 kW secondary, 30 kW min).',
      source: 'Antarctic Genset Fleet Specifications',
    },
    {
      parameter: 'Battery Energy Storage (BESS)',
      classification: 'SCENARIO ASSUMPTION',
      description: '350 kWh / 100 kW LiFePO4 battery storage with strict 20.0% life-support reserve and 95.0% maximum SOC limits.',
      source: 'Station BESS Technical Model',
    },
    {
      parameter: 'Microgrid Dispatch Optimization',
      classification: 'OR-TOOLS MILP',
      description: 'Google OR-Tools Mixed-Integer Linear Programming (MILP) with SCIP backend for 24-hour lookahead economic dispatch.',
      source: 'Google OR-Tools MILP Solver',
    },
  ];

  return (
    <div className="bg-[#0E1724]/95 rounded-lg border border-[#1B2C42] p-4 sm:p-5 font-mono">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left cursor-pointer focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
            Scientific Data Provenance &amp; Engineering Assumptions
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{isOpen ? 'Collapse Details' : 'Expand Metadata'}</span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-[#1B2C42]/60 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            POLAR-EMS maintains transparent data classification across all inputs and mathematical dispatch formulations.
            Demonstration scenarios stress-test the microgrid against extreme polar contingencies without claiming synthetic assumptions are measured station telemetry.
          </p>

          {/* Scenario-specific Provenance if available */}
          {scenario?.provenance && (
            <div className="p-3.5 rounded-lg bg-[#080E17] border border-cyan-500/30 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
                <FileText size={14} />
                <span>Selected Scenario Provenance: {scenario.scenario_name}</span>
              </div>
              <div className="space-y-1 text-slate-300 text-[11px]">
                {Object.entries(scenario.provenance).map(([key, val]) => (
                  <div key={key} className="flex flex-col sm:flex-row sm:gap-2">
                    <span className="text-slate-400 font-semibold min-w-[180px] uppercase">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-white">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Provenance Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-[#1B2C42] text-[10px] text-slate-400 uppercase tracking-wider bg-[#080E17]/60">
                  <th className="py-2.5 px-3 font-semibold">Parameter / Subsystem</th>
                  <th className="py-2.5 px-3 font-semibold">Classification</th>
                  <th className="py-2.5 px-3 font-semibold">Description &amp; Engineering Basis</th>
                  <th className="py-2.5 px-3 font-semibold">Origin / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#152336]/60">
                {provenanceItems.map((item, idx) => (
                  <tr
                    key={item.parameter}
                    className={`hover:bg-[#121F30]/60 transition-colors ${
                      idx % 2 === 0 ? 'bg-transparent' : 'bg-[#0A121E]/30'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-white">{item.parameter}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase">
                        {item.classification}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 text-[11px]">{item.description}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">{item.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
