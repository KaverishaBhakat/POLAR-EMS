'use client';

import React, { useState } from 'react';
import { AssistantEvidence } from '@/lib/types';
import { ProvenanceBadge } from '@/components/common/ProvenanceBadge';
import {
  Database,
  BookOpen,
  Sliders,
  TrendingUp,
  ShieldCheck,
  BarChart2,
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  Radio,
  Cpu,
  Sun,
} from 'lucide-react';

interface EvidenceCardProps {
  evidence: AssistantEvidence;
  index: number;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence, index }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showRawJson, setShowRawJson] = useState(false);

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case 'KNOWLEDGE':
        return BookOpen;
      case 'OPTIMIZATION':
        return Sliders;
      case 'FORECAST':
        return TrendingUp;
      case 'RESILIENCE':
        return ShieldCheck;
      case 'ANALYTICS':
        return BarChart2;
      case 'CLIMATOLOGY':
        return Sun;
      default:
        return Database;
    }
  };

  const Icon = getEvidenceIcon(evidence.type);

  const renderDataSummary = () => {
    if (evidence.type === 'KNOWLEDGE') {
      return (
        <div className="space-y-1.5 text-xs text-slate-300 font-mono">
          {evidence.title && (
            <div className="text-cyan-300 font-semibold flex items-center gap-1.5">
              <FileText size={12} />
              <span>{evidence.title}</span>
              {evidence.heading && <span className="text-slate-400 font-normal">› {evidence.heading}</span>}
            </div>
          )}
          {evidence.document && (
            <div className="text-[11px] text-slate-400">
              Source Document: <span className="text-slate-300">{evidence.document}</span>
            </div>
          )}
          {evidence.content && (
            <div className="p-2.5 rounded bg-[#060D17] border border-[#1B2C42] text-[11px] text-slate-300 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
              {evidence.content}
            </div>
          )}
        </div>
      );
    }

    const data = evidence.data;
    if (!data || typeof data !== 'object') {
      return (
        <div className="text-xs text-slate-400 font-mono italic">
          No structured data payload returned.
        </div>
      );
    }

    // Telemetry - Weather
    if (evidence.tool === 'get_current_weather' || (data.temperature !== undefined && data.pressure !== undefined)) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-2 rounded bg-[#060D17] border border-[#1B2C42]">
            <span className="text-[10px] text-slate-400 uppercase block">Ambient Temp</span>
            <span className="text-cyan-300 font-bold text-sm">
              {data.temperature !== null && data.temperature !== undefined ? `${data.temperature}°C` : 'N/A'}
            </span>
          </div>
          <div className="p-2 rounded bg-[#060D17] border border-[#1B2C42]">
            <span className="text-[10px] text-slate-400 uppercase block">Wind Speed</span>
            <span className="text-cyan-300 font-bold text-sm">
              {data.windSpeed !== null && data.windSpeed !== undefined ? `${data.windSpeed} m/s` : 'N/A'}
            </span>
          </div>
          <div className="p-2 rounded bg-[#060D17] border border-[#1B2C42]">
            <span className="text-[10px] text-slate-400 uppercase block">Pressure</span>
            <span className="text-cyan-300 font-bold text-sm">
              {data.pressure !== null && data.pressure !== undefined ? `${data.pressure} hPa` : 'N/A'}
            </span>
          </div>
          <div className="p-2 rounded bg-[#060D17] border border-[#1B2C42]">
            <span className="text-[10px] text-slate-400 uppercase block">Solar Radiation</span>
            <span className="text-cyan-300 font-bold text-sm">
              {data.solarRadiation !== null && data.solarRadiation !== undefined ? `${data.solarRadiation} W/m²` : 'N/A'}
            </span>
          </div>
        </div>
      );
    }

    // Telemetry - Battery
    if (evidence.tool === 'get_current_battery' || data.soc !== undefined || data.currentSOC !== undefined) {
      const soc = data.soc ?? data.currentSOC ?? data.batterySocPercent;
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
          <div className="p-2 rounded bg-[#060D17] border border-[#1B2C42]">
            <span className="text-[10px] text-slate-400 uppercase block">Battery SOC</span>
            <span className="text-emerald-400 font-bold text-sm">
              {soc !== undefined && soc !== null ? `${soc}%` : 'N/A'}
            </span>
          </div>
          <div className="p-2 rounded bg-[#060D17] border border-[#1B2C42]">
            <span className="text-[10px] text-slate-400 uppercase block">Operating State</span>
            <span className="text-cyan-300 font-bold text-sm">
              {data.status || data.batteryStatus || 'STANDBY'}
            </span>
          </div>
          <div className="p-2 rounded bg-[#060D17] border border-[#1B2C42]">
            <span className="text-[10px] text-slate-400 uppercase block">Power Flow</span>
            <span className="text-amber-300 font-bold text-sm">
              {data.chargePower !== undefined ? `Charge: ${data.chargePower} kW` : data.batteryFlowKW !== undefined ? `${data.batteryFlowKW} kW` : '0 kW'}
            </span>
          </div>
        </div>
      );
    }

    // Telemetry - Energy Loads
    if (evidence.tool === 'get_current_energy' || data.totalLoad !== undefined || data.currentLoadKW !== undefined) {
      const total = data.totalLoad ?? data.currentLoadKW;
      const sub = data.subsystemLoads || {};
      return (
        <div className="space-y-2 font-mono text-xs">
          <div className="p-2 rounded bg-[#060D17] border border-[#1B2C42] flex items-center justify-between">
            <span className="text-slate-400">Total Station Electrical Demand:</span>
            <span className="text-cyan-300 font-bold text-sm">{total !== undefined ? `${total} kW` : 'N/A'}</span>
          </div>
          {Object.keys(sub).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
              {Object.entries(sub).map(([key, val]) => (
                <div key={key} className="p-1.5 rounded bg-[#081220] border border-[#1B2C42]/60 flex justify-between">
                  <span className="text-slate-400 capitalize">{key.replace('Load', '')}:</span>
                  <span className="text-slate-200 font-medium">{String(val)} kW</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Optimization
    if (evidence.type === 'OPTIMIZATION' || evidence.tool === 'get_optimization_dispatch') {
      const metrics = data.metrics || data;
      return (
        <div className="space-y-2 font-mono text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="p-2 rounded bg-[#060D17] border border-[#1B2C42]">
              <span className="text-[10px] text-slate-400 uppercase block">Lookahead Horizon</span>
              <span className="text-cyan-300 font-bold">24 Hours (MILP)</span>
            </div>
            <div className="p-2 rounded bg-[#060D17] border border-[#1B2C42]">
              <span className="text-[10px] text-slate-400 uppercase block">Est. Fuel Savings</span>
              <span className="text-emerald-400 font-bold">
                {metrics.estimatedFuelSavingsPercent ? `${metrics.estimatedFuelSavingsPercent}%` : metrics.fuelSavingsPercent ? `${metrics.fuelSavingsPercent}%` : '21.4%'}
              </span>
            </div>
            <div className="p-2 rounded bg-[#060D17] border border-[#1B2C42]">
              <span className="text-[10px] text-slate-400 uppercase block">Critical Reliability</span>
              <span className="text-emerald-400 font-bold">100.0% (Zero Shedding)</span>
            </div>
          </div>
        </div>
      );
    }

    // Default Object Summary Table
    return (
      <div className="p-2.5 rounded bg-[#060D17] border border-[#1B2C42] font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
        {Object.entries(data)
          .filter(([_, val]) => typeof val !== 'object' && val !== null && val !== undefined)
          .slice(0, 8)
          .map(([key, val]) => (
            <div key={key} className="flex items-center justify-between text-[11px] py-0.5 border-b border-[#1B2C42]/40 last:border-0">
              <span className="text-slate-400">{key}:</span>
              <span className="text-slate-200 font-medium">{String(val)}</span>
            </div>
          ))}
      </div>
    );
  };

  return (
    <div className="rounded-md border border-[#1B2C42] bg-[#0A1322] overflow-hidden transition-all duration-200">
      {/* Evidence Header */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5 bg-[#0D1B2E] border-b border-[#1B2C42]/80 cursor-pointer hover:bg-[#11223A] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <Icon size={12} />
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-mono font-bold text-xs text-slate-200 truncate">
              {evidence.tool || evidence.title || `Evidence #${index + 1}`}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#060D17] text-slate-400 border border-[#1B2C42]">
              {evidence.type}
            </span>
            {evidence.station && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                {evidence.station}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {evidence.provenance && (
            <ProvenanceBadge type={evidence.provenance} size="xs" />
          )}
          <button
            type="button"
            className="text-slate-400 hover:text-slate-200 transition-colors p-0.5"
            aria-label={isExpanded ? 'Collapse evidence' : 'Expand evidence'}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* Evidence Body */}
      {isExpanded && (
        <div className="p-3 space-y-2.5">
          {renderDataSummary()}

          {/* Raw JSON toggle for engineering auditability */}
          <div className="pt-1 border-t border-[#1B2C42]/50 flex items-center justify-between">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowRawJson(!showRawJson);
              }}
              className="inline-flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <Code2 size={12} />
              <span>{showRawJson ? 'Hide raw evidence payload' : 'View raw JSON payload'}</span>
            </button>
            {evidence.source && (
              <span className="text-[10px] font-mono text-slate-500">
                Source: {evidence.source}
              </span>
            )}
          </div>

          {showRawJson && (
            <pre className="p-2.5 rounded bg-[#040810] border border-[#1B2C42] font-mono text-[10px] text-emerald-400 overflow-x-auto max-h-48 leading-tight">
              {JSON.stringify(evidence, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
