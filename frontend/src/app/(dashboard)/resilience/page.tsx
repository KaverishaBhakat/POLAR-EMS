'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import {
  HourlyDispatchPoint,
  ResilienceMetrics,
  ResilienceComparison,
  ResilienceSimulationResult,
  ResilienceSimulationScenario,
} from '@/lib/types';
import { ResilienceHero } from '@/components/resilience/ResilienceHero';
import { ScenarioSelector } from '@/components/resilience/ScenarioSelector';
import { ResilienceKPICards } from '@/components/resilience/ResilienceKPICards';
import { BaselineComparisonPanel } from '@/components/resilience/BaselineComparisonPanel';
import { ResilienceDispatchChart } from '@/components/resilience/ResilienceDispatchChart';
import { ResilienceBatterySOCChart } from '@/components/resilience/ResilienceBatterySOCChart';
import { RenewableGenerationPanel } from '@/components/resilience/RenewableGenerationPanel';
import { ScenarioImpactSummary } from '@/components/resilience/ScenarioImpactSummary';
import { OperationalRecommendation } from '@/components/resilience/OperationalRecommendation';
import { DataProvenanceAssumptions } from '@/components/resilience/DataProvenanceAssumptions';
import { BharatiUnsupportedNotice } from '@/components/resilience/BharatiUnsupportedNotice';
import { LoadingSkeleton } from '@/components/common/Toast';
import { ShieldCheck, AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import { PageHeader, GlassCard, Button } from '@/components/ui';

export default function ResiliencePage() {
  const { activeStationId, station } = useStation();

  // Scenarios list from API
  const [scenarios, setScenarios] = useState<ResilienceSimulationScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('polar-night');

  // Simulation Result State
  const [simResult, setSimResult] = useState<ResilienceSimulationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // 1. Fetch available scenarios once on mount
  useEffect(() => {
    let isMounted = true;
    async function loadScenarios() {
      try {
        const res = await apiClient.getSimulationScenarios();
        if (isMounted && res.scenarios && res.scenarios.length > 0) {
          setScenarios(res.scenarios);
        }
      } catch {
        // Handled by client fallback
      }
    }
    loadScenarios();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch resilience simulation for selected scenario
  const fetchResilienceData = useCallback(async (scenarioId: string, stationId: string) => {
    // If Bharati station is selected, we do not fetch or fabricate simulation data
    if (stationId.toLowerCase() !== 'maitri') {
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      // If 'baseline' is selected, run polar-night to obtain the identical baseline model & comparison
      const targetScenario = scenarioId === 'baseline' ? 'polar-night' : scenarioId;
      const res = await apiClient.runResilienceSimulation(stationId, targetScenario, {
        horizonHours: 24,
        initialSoc: 75.0,
        signal: controller.signal,
      });

      if (res.status === 'ERROR') {
        setError(res.message || `Failed to load resilience simulation for '${scenarioId}'.`);
        setSimResult(null);
      } else {
        setSimResult(res);
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError(e?.message || 'Network error connecting to resilience simulation engine.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResilienceData(selectedScenarioId, activeStationId);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedScenarioId, activeStationId, fetchResilienceData]);

  // Handle scenario change without full reload
  const handleSelectScenario = (newScenarioId: string) => {
    setSelectedScenarioId(newScenarioId);
  };

  // Check if active station is Bharati
  const isBharati = activeStationId.toLowerCase() !== 'maitri';

  if (isBharati) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Microgrid Resilience & Contingency Dashboard"
          subtitle={`Antarctic Station: ${station?.name || activeStationId}`}
          icon={<ShieldCheck className="w-6 h-6 text-accent-bright" />}
          breadcrumbs={[
            { label: "Intelligence", href: "/resilience" },
            { label: "Stress Testing" }
          ]}
        />

        <BharatiUnsupportedNotice />
      </div>
    );
  }

  const isBaseline = selectedScenarioId === 'baseline';
  const currentScenario = isBaseline
    ? {
        scenario_id: 'baseline',
        scenario_type: 'BASELINE_OPERATIONS',
        scenario_name: 'Normal Operations (Baseline)',
        description: 'Nominal 24-hour microgrid operations with full solar PV, wind generation, 75% initial battery SOC, and dual diesel generators available.',
        category: 'BASELINE',
        is_active: true,
        provenance: {},
        assumptions: {},
      }
    : simResult?.scenario;

  const metrics: ResilienceMetrics | null = simResult?.resilienceMetrics || null;
  const comparison: ResilienceComparison | null = simResult?.comparison || null;
  const dispatch: HourlyDispatchPoint[] = simResult?.dispatch || [];

  return (
    <div className="space-y-6">
      {/* 1. Hero & Status Header */}
      <ResilienceHero
        stationName={station?.name || 'Maitri Station'}
        stationCode="MAITRI"
        scenario={currentScenario}
        metrics={metrics}
        isBaseline={isBaseline}
      />

      {/* 2. Contingency Scenario Selector */}
      <ScenarioSelector
        scenarios={scenarios}
        selectedScenarioId={selectedScenarioId}
        onSelectScenario={handleSelectScenario}
        isLoading={loading}
      />

      {/* Loading Skeleton during scenario fetch */}
      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-24" />
          <LoadingSkeleton className="h-80" />
          <LoadingSkeleton className="h-64" />
          <LoadingSkeleton className="h-48" />
        </div>
      ) : error ? (
        /* Error State with Retry */
        <GlassCard className="p-8 text-center space-y-4 max-w-2xl mx-auto my-8 border-rose-500/30">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <AlertTriangle size={28} />
          </div>
          <div className="space-y-2 font-mono">
            <h2 className="text-base sm:text-lg font-bold text-white uppercase">
              Unable to Load Resilience Simulation
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">{error}</p>
          </div>
          <div className="pt-2 flex justify-center">
            <Button
              onClick={() => fetchResilienceData(selectedScenarioId, activeStationId)}
              variant="secondary"
              size="sm"
            >
              <RefreshCw size={14} className="mr-1.5" />
              <span>Retry Simulation</span>
            </Button>
          </div>
        </GlassCard>
      ) : (
        /* Active Simulation Results */
        <>
          {/* 3. Operational KPI Cards */}
          <ResilienceKPICards
            metrics={metrics}
            objectiveValue={simResult?.objectiveValue}
          />

          {/* 4. Scenario Impact Summary (when not baseline) */}
          {!isBaseline && comparison && metrics && (
            <ScenarioImpactSummary
              comparison={comparison}
              metrics={metrics}
              scenarioName={currentScenario?.scenario_name || 'Selected Scenario'}
            />
          )}

          {/* 5. Baseline vs Scenario Side-by-Side Comparison Panel */}
          {comparison && (
            <BaselineComparisonPanel
              comparison={comparison}
              scenarioName={currentScenario?.scenario_name || 'Selected Scenario'}
            />
          )}

          {/* 6. Hourly Dispatch Chart */}
          <ResilienceDispatchChart
            data={dispatch}
            scenarioName={currentScenario?.scenario_name || 'Selected Scenario'}
          />

          {/* 7. Battery State of Charge (SOC) Chart */}
          <ResilienceBatterySOCChart
            data={dispatch}
            minSOCLimit={20.0}
            maxSOCLimit={95.0}
          />

          {/* 8. Renewable Generation & Curtailment Section */}
          <RenewableGenerationPanel
            metrics={metrics}
            dispatch={dispatch}
            stationId={activeStationId}
          />

          {/* 9. SCADA Operational Recommendation */}
          <OperationalRecommendation
            recommendation={simResult?.recommendation}
            metrics={metrics}
            scenarioName={currentScenario?.scenario_name || 'Selected Scenario'}
          />

          {/* 10. Data Provenance & Scientific Assumptions */}
          <DataProvenanceAssumptions
            scenario={currentScenario}
            stationId={activeStationId}
          />
        </>
      )}
    </div>
  );
}
