'use client';

import React, { useEffect, useState } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { HourlyDispatchPoint, OptimizationMetrics } from '@/lib/types';
import { OptimizationComparison } from '@/components/optimization/OptimizationComparison';
import { EnergyDispatchChart } from '@/components/charts/EnergyDispatchChart';
import { StrategyCard } from '@/components/optimization/StrategyCard';
import { OptimizationRunner } from '@/components/optimization/OptimizationRunner';
import { LoadingSkeleton } from '@/components/common/Toast';
import { Sliders, Sparkles } from 'lucide-react';

export default function OptimizationPage() {
  const { activeStationId, station } = useStation();

  const [metrics, setMetrics] = useState<OptimizationMetrics | null>(null);
  const [dispatchSchedule, setDispatchSchedule] = useState<HourlyDispatchPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadOptimizationData() {
      setLoading(true);
      try {
        const res = await apiClient.getOptimizationResult(activeStationId);
        if (isMounted) {
          setMetrics(res.metrics);
          setDispatchSchedule(res.dispatchSchedule);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadOptimizationData();
    return () => {
      isMounted = false;
    };
  }, [activeStationId]);

  if (loading || !metrics) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-20" />
        <LoadingSkeleton className="h-32" />
        <LoadingSkeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1B2C42]/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wide uppercase flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-emerald-400" />
            AI Energy Optimization
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Optimal dispatch strategy for generators, batteries and renewable resources | {station?.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded bg-[#0A1828] border border-emerald-500/40 text-emerald-300 font-mono">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Optimization inputs: demonstration scenario</span>
          </span>
        </div>
      </div>

      {/* Interactive Solver Execution Runner */}
      <OptimizationRunner
        metrics={metrics}
        onMetricsUpdate={(newM) => setMetrics(newM)}
      />

      {/* 1. Baseline vs POLAR-EMS Optimized Comparison (Fuel Saved 220 L/day prominent) */}
      <OptimizationComparison metrics={metrics} />

      {/* 2. 24-Hour Stacked Generation Dispatch Schedule */}
      <EnergyDispatchChart data={dispatchSchedule} />

      {/* 3. Strategy Card & Core Architectural Control Policy */}
      <StrategyCard />
    </div>
  );
}
