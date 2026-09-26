'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { HourlyDispatchPoint, OptimizationMetrics, OptimizationResultData } from '@/lib/types';
import { OptimizationComparison } from '@/components/optimization/OptimizationComparison';
import { EnergyDispatchChart } from '@/components/charts/EnergyDispatchChart';
import { BatterySOCChart } from '@/components/charts/BatterySOCChart';
import { GeneratorScheduleTable } from '@/components/optimization/GeneratorScheduleTable';
import { StrategyCard } from '@/components/optimization/StrategyCard';
import { OptimizationRunner } from '@/components/optimization/OptimizationRunner';
import { OptimizationKPICards } from '@/components/optimization/OptimizationKPICards';
import { ScenarioDisclosure } from '@/components/optimization/ScenarioDisclosure';
import { OptimizationDecision } from '@/components/optimization/OptimizationDecision';
import { DataProvenance } from '@/components/optimization/DataProvenance';
import { LoadingSkeleton } from '@/components/common/Toast';
import { Sliders, Sparkles, AlertTriangle, RefreshCw, Layers, ShieldCheck } from 'lucide-react';

export default function OptimizationPage() {
  const { activeStationId, station } = useStation();

  const [optimizationData, setOptimizationData] = useState<OptimizationResultData | null>(null);
  const [metrics, setMetrics] = useState<OptimizationMetrics | null>(null);
  const [dispatchSchedule, setDispatchSchedule] = useState<HourlyDispatchPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOptimizationData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getOptimizationResult(activeStationId);
      if (res.status === 'ERROR' && (!res.dispatchSchedule || res.dispatchSchedule.length === 0)) {
        setError(res.message || `No optimization dispatch model available for ${station?.name || activeStationId}.`);
        setOptimizationData(res);
        setMetrics(res.metrics || null);
        setDispatchSchedule([]);
      } else {
        setOptimizationData(res);
        setMetrics(res.metrics);
        setDispatchSchedule(res.dispatchSchedule || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load optimization dispatch data from backend.');
    } finally {
      setLoading(false);
    }
  }, [activeStationId, station?.name]);

  useEffect(() => {
    loadOptimizationData();
  }, [loadOptimizationData]);

  // Loading State
  if (loading) {
    return (
      <div className="space-y-4 font-mono">
        <div className="flex items-center justify-between pb-2 border-b border-[#1B2C42]/50">
          <div>
            <div className="h-6 w-64 bg-slate-800 rounded animate-pulse mb-1" />
            <div className="h-4 w-96 bg-slate-900 rounded animate-pulse" />
          </div>
        </div>
        <LoadingSkeleton className="h-16" />
        <LoadingSkeleton className="h-28" />
        <LoadingSkeleton className="h-72" />
        <LoadingSkeleton className="h-96" />
      </div>
    );
  }

  // Error / Unavailable State without crash
  if (error && (!metrics || dispatchSchedule.length === 0)) {
    return (
      <div className="space-y-6 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1B2C42]/50">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide uppercase flex items-center gap-2.5">
              <Sliders className="w-5 h-5 text-emerald-400" />
              Microgrid Dispatch Optimization
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Station: <span className="text-white font-bold">{station?.name || activeStationId}</span>
            </p>
          </div>
        </div>

        <div className="p-8 rounded-lg bg-[#0E1724]/90 border border-amber-500/40 text-center space-y-4 max-w-2xl mx-auto my-12">
          <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
            <AlertTriangle size={28} />
          </div>
          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white uppercase">
              Optimization Model Unavailable
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {error}
            </p>
            <p className="text-[11px] text-slate-400">
              The OR-Tools MILP optimization pipeline currently features the December historical climatology solar model for <strong className="text-amber-300">Maitri Station</strong>.
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={loadOptimizationData}
              className="flex items-center gap-2 px-4 py-2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs font-bold transition-all"
            >
              <RefreshCw size={14} />
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active / Ready State
  return (
    <div className="space-y-6 font-mono">
      {/* 1. Header & Scenario Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1B2C42]/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide uppercase flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-emerald-400" />
            Microgrid Dispatch Optimization
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Google OR-Tools MILP 24-hour lookahead economic dispatch & storage co-optimization | {station?.name || activeStationId}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded bg-[#0A1828] border border-emerald-500/40 text-emerald-300">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>SOLVER: OR-Tools MILP (SCIP)</span>
          </span>
        </div>
      </div>

      {/* 2. Interactive Solver Execution Runner */}
      {metrics && (
        <OptimizationRunner
          metrics={metrics}
          onMetricsUpdate={(newM) => setMetrics(newM)}
          onResultUpdate={(newRes) => {
            setOptimizationData(newRes);
            if (newRes.metrics) setMetrics(newRes.metrics);
            if (newRes.dispatchSchedule) setDispatchSchedule(newRes.dispatchSchedule);
          }}
        />
      )}

      {/* 3. Scenario / Assumption Disclosure Notice (Section 7) */}
      <ScenarioDisclosure
        metadata={optimizationData?.scenarioMetadata}
        stationName={station?.name || activeStationId}
      />

      {/* 4. Optimization KPI Cards (Section 6) */}
      {optimizationData && metrics && (
        <OptimizationKPICards
          optimizationData={optimizationData}
          metrics={metrics}
        />
      )}

      {/* 5. Baseline vs POLAR-EMS Optimized Comparison (Fuel Saved Banner & 6 tiles) */}
      {metrics && <OptimizationComparison metrics={metrics} />}

      {/* 6. Dynamic Optimization Decision Explanation (Section 8) */}
      {optimizationData && metrics && (
        <OptimizationDecision
          optimizationData={optimizationData}
          metrics={metrics}
          dispatchSchedule={dispatchSchedule}
        />
      )}

      {/* 7. 24-Hour Stacked Generation Dispatch Schedule (Section 4) */}
      <EnergyDispatchChart data={dispatchSchedule} />

      {/* 8. 24-Hour Battery SOC & Safety Envelopes (Section 5) */}
      <BatterySOCChart
        data={dispatchSchedule}
        minSOCLimit={optimizationData?.minimumBatterySOC ?? 20}
        maxSOCLimit={optimizationData?.maximumBatterySOC ?? 95}
      />

      {/* 9. 24-Hour Generator Schedule & Commitment Table (Section 9) */}
      <GeneratorScheduleTable dispatchSchedule={dispatchSchedule} />

      {/* 10. Strategy Card & Core Architectural Control Policy */}
      <StrategyCard />

      {/* 11. Data & Model Provenance Section (Section 11) */}
      <DataProvenance />
    </div>
  );
}
