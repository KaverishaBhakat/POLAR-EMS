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
import { StationUnavailableState } from '@/components/common/StationUnavailableState';
import { LoadingSkeleton } from '@/components/common/Toast';
import { Sliders, Sparkles, AlertTriangle, RefreshCw, Layers, ShieldCheck } from 'lucide-react';
import { PageHeader, GlassCard, Button } from '@/components/ui';

export default function OptimizationPage() {
  const { activeStationId, station } = useStation();

  const [optimizationData, setOptimizationData] = useState<OptimizationResultData | null>(null);
  const [metrics, setMetrics] = useState<OptimizationMetrics | null>(null);
  const [dispatchSchedule, setDispatchSchedule] = useState<HourlyDispatchPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOptimizationData = useCallback(async () => {
    if (activeStationId === 'bharati') {
      setLoading(false);
      setOptimizationData(null);
      setMetrics(null);
      setDispatchSchedule([]);
      return;
    }

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

  const isBharati = activeStationId === 'bharati';

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

  // Bharati Unavailable State
  if (isBharati) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Microgrid Dispatch Optimization"
          subtitle="Station: Bharati Research Station (Larsemann Hills)"
          icon={<Sliders className="w-5 h-5 text-emerald-400" />}
          badge={{
            label: "UNAVAILABLE FOR BHARATI",
            variant: "warning"
          }}
          breadcrumbs={[
            { label: "Intelligence", href: "/optimization" },
            { label: "OR-Tools MILP" }
          ]}
        />

        <StationUnavailableState
          title="Optimization unavailable for Bharati"
          subsystemName="dispatch optimization"
          description="A validated Bharati electrical-load, BESS, generator and renewable-generation dataset is required before station-specific dispatch optimization can be presented."
          stationName="Bharati Research Station"
          icon={Sliders}
          provenanceType="UNAVAILABLE"
        />
      </div>
    );
  }

  // Error / Unavailable State without crash for Maitri
  if (!metrics || !optimizationData || dispatchSchedule.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Microgrid Dispatch Optimization"
          subtitle={`Station: ${station?.name || activeStationId}`}
          icon={<Sliders className="w-5 h-5 text-emerald-400" />}
          breadcrumbs={[
            { label: "Intelligence", href: "/optimization" },
            { label: "OR-Tools MILP" }
          ]}
        />

        <GlassCard className="p-8 text-center space-y-4 max-w-2xl mx-auto my-12 border-amber-500/30">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <AlertTriangle size={28} />
          </div>
          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white uppercase font-mono">
              Optimization Model Unavailable
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              {error || `Optimization dispatch data is currently loading or unavailable for ${station?.name || activeStationId}.`}
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              The OR-Tools MILP optimization pipeline currently features the December historical climatology solar model for <strong className="text-amber-300">Maitri Station</strong>.
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <Button
              onClick={loadOptimizationData}
              variant="secondary"
              size="sm"
            >
              <RefreshCw size={14} className="mr-1.5" />
              Retry Connection
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Active / Ready State for Maitri
  return (
    <div className="space-y-6">
      {/* 1. Header & Scenario Badge */}
      <PageHeader
        title="Microgrid Dispatch Optimization"
        subtitle={`Google OR-Tools MILP 24-hour lookahead economic dispatch & storage co-optimization | ${station?.name || activeStationId}`}
        icon={<Sliders className="w-5 h-5 text-emerald-400" />}
        badge={{
          label: "SOLVER: OR-Tools MILP (SCIP)",
          variant: "success"
        }}
        breadcrumbs={[
          { label: "Intelligence", href: "/optimization" },
          { label: "OR-Tools MILP" }
        ]}
      />

      {/* 2. Interactive Solver Execution Runner */}
      {metrics && (
        <OptimizationRunner
          metrics={metrics}
          onMetricsUpdate={(newMetrics) => setMetrics(newMetrics)}
          onResultUpdate={(newRes) => {
            setOptimizationData(newRes);
            setMetrics(newRes.metrics);
            setDispatchSchedule(newRes.dispatchSchedule || []);
          }}
        />
      )}

      {/* 3. Operational Dispatch Summary KPIs */}
      {metrics && optimizationData && (
        <OptimizationKPICards
          optimizationData={optimizationData}
          metrics={metrics}
        />
      )}

      {/* 4. Optimization Engine Decision Rationale & Recommendation */}
      <OptimizationDecision
        optimizationData={optimizationData}
        metrics={metrics}
        dispatchSchedule={dispatchSchedule}
      />

      {/* 5. 24-Hour Power Balance & Economic Dispatch Schedule Chart */}
      <EnergyDispatchChart data={dispatchSchedule} />

      {/* 6. Co-Optimized BESS State-of-Charge Profile Chart */}
      <BatterySOCChart data={dispatchSchedule} />

      {/* 7. Comprehensive Baseline vs Optimized System Performance Comparison */}
      <OptimizationComparison metrics={metrics} />

      {/* 8. Tabular Hourly Generator Commitment Schedule */}
      <GeneratorScheduleTable dispatchSchedule={dispatchSchedule} />

      {/* 9. Operational Dispatch Strategy Reference */}
      <StrategyCard />

      {/* 10. Formal Scenario Methodology & Environmental Disclosures */}
      <ScenarioDisclosure
        metadata={optimizationData.scenarioMetadata}
        stationName={station?.name}
      />

      {/* 11. Technical Data Provenance & Methodology Documentation */}
      <DataProvenance />
    </div>
  );
}
