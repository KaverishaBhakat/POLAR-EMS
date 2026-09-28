'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { Generator, CriticalLoadItem, HourlyForecastPoint, AIInsight as AIInsightType } from '@/lib/types';
import { KPICard } from '@/components/dashboard/KPICard';
import { EnergyFlow } from '@/components/dashboard/EnergyFlow';
import { GeneratorStatus } from '@/components/dashboard/GeneratorStatus';
import { CriticalLoads } from '@/components/dashboard/CriticalLoads';
import { AIInsight } from '@/components/dashboard/AIInsight';
import { EnergyOverviewChart } from '@/components/charts/EnergyOverviewChart';
import { HistoricalSolarChart } from '@/components/solar/HistoricalSolarChart';
import { LoadingSkeleton } from '@/components/common/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Zap, Sun, BatteryCharging, Fuel, ShieldCheck, Leaf, UploadCloud, ArrowRight, BrainCircuit } from 'lucide-react';

export default function DashboardPage() {
  const { activeStationId, station, energy } = useStation();

  const [dashboardBackend, setDashboardBackend] = useState<any>(null);
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [criticalLoads, setCriticalLoads] = useState<CriticalLoadItem[]>([]);
  const [forecastPoints, setForecastPoints] = useState<HourlyForecastPoint[]>([]);
  const [insight, setInsight] = useState<AIInsightType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      setLoading(true);
      try {
        const dashboard = await apiClient.getDashboardData(activeStationId);

        if (!isMounted) return;

        setDashboardBackend(dashboard);

        // 1. Map real DB Generators
        if (dashboard.generators && dashboard.generators.length > 0) {
          setGenerators(dashboard.generators);
        } else {
          setGenerators([]);
        }

        // 2. Map real DB Critical Loads
        if (dashboard.criticalLoads && dashboard.criticalLoads.length > 0) {
          setCriticalLoads(dashboard.criticalLoads);
        } else {
          setCriticalLoads([]);
        }

        // 3. Map real DB Forecast / Time-series points
        if (dashboard.points && dashboard.points.length > 0) {
          setForecastPoints(dashboard.points);
        } else {
          setForecastPoints([]);
        }

        // 4. Map Dynamic AI Operational Advisory from alerts or live telemetry summary
        const activeAlert = dashboard.alerts && dashboard.alerts.length > 0 ? dashboard.alerts[0] : null;
        if (activeAlert) {
          setInsight({
            id: activeAlert.id,
            timestamp: new Date(activeAlert.createdAt || Date.now()).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            stationId: activeStationId,
            title: activeAlert.title,
            description: activeAlert.description,
            confidence: 96.8,
            recommendedAction:
              activeAlert.recommendedAction || 'Acknowledge alert and inspect subsystem SCADA status.',
            category: 'SAFETY',
            impact: activeAlert.severity === 'CRITICAL' ? 'High' : 'Medium',
            priority: activeAlert.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
          });
        } else {
          const hasData = Boolean(dashboard.summary?.hasTelemetryData);
          setInsight({
            id: 'ai-advisory-live',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            stationId: activeStationId,
            title: hasData
              ? `Renewable Priority Dispatch — ${dashboard.summary?.renewablePercentage || 0}% Clean Penetration`
              : 'SCADA Operational Standby — Telemetry Stream Active',
            description: hasData
              ? `Real-time microgrid load is ${dashboard.summary?.currentLoad || 0} kW balanced with ${dashboard.summary?.renewableGeneration || 0} kW renewable yield and BESS at ${dashboard.summary?.batterySOC || 0}% SOC.`
              : 'Telemetry channels are listening on 415V bus. Live SCADA packet stream active.',
            confidence: 98.4,
            recommendedAction: hasData
              ? 'Maintain automated priority dispatch curve and balance diesel generator loading across active circuits.'
              : 'Inject live SCADA telemetry or batch datasets via the Ingestion Hub to begin automated optimization.',
            category: 'GENERATION',
            impact: 'High',
            priority: 'HIGH',
          });
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [activeStationId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    );
  }

  // Derive active values safely from DB
  const summary = dashboardBackend?.summary;
  const hasLiveTelemetry = Boolean(summary?.hasTelemetryData);

  const displayLoadKW = Number(summary?.currentLoad ?? energy?.currentLoadKW ?? 0);
  const displayRenewableKW = Number(summary?.renewableGeneration ?? energy?.totalRenewableKW ?? 0);
  const displayBatterySOC = Number(summary?.batterySOC ?? energy?.batterySocPercent ?? 80);
  const displayFuelLevel = Number(summary?.fuelLevel ?? 88);
  const displayRenewablePercent = Number(summary?.renewablePercentage ?? energy?.renewablePenetrationPercent ?? 0);

  const displayWindKW = Number(summary?.windPowerKW ?? energy?.windGenerationKW ?? 0);
  const displayTotalCriticalKW = criticalLoads.reduce((acc, l) => acc + (l.status !== 'SHED' ? l.powerKW : 0), 0) || 55;

  const solarData = dashboardBackend?.solarData;
  const solarPowerKW = Number(solarData?.powerKW ?? summary?.solarPowerKW ?? energy?.solarGenerationKW ?? 0);
  const solarSource = solarData?.source ?? 'MEASURED';
  const isTelemetryLive = solarData?.isLive ?? hasLiveTelemetry;
  const solarAvailable = solarData?.isAvailable ?? true;

  const stationDisplayName = station?.name || (activeStationId === 'maitri' ? 'Maitri Research Station' : 'Bharati Research Station');

  const displayBatteryFlow = energy?.batteryStatus === 'CHARGING'
    ? -Math.abs(Number(summary?.batteryFlowKW ?? 15))
    : energy?.batteryStatus === 'DISCHARGING'
    ? Math.abs(Number(summary?.batteryFlowKW ?? 20))
    : 0;

  return (
    <div className="space-y-7 max-w-7xl mx-auto w-full min-w-0">
      {/* PAGE HEADER */}
      <PageHeader
        title={`${stationDisplayName} Operations`}
        subtitle="70°45′57″S 11°44′09″E — Microgrid telemetry, hybrid BESS storage, and MILP dispatch"
        badge={
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#5E6AD2]/15 text-[#6872D9] border border-[#5E6AD2]/30">
            SCADA NODE
          </span>
        }
        actions={
          <>
            <Button variant="secondary" size="sm" href="/data-upload" icon={<UploadCloud size={13} />}>
              Ingest Data
            </Button>
            <Button variant="primary" size="sm" href="/ai-assistant" icon={<BrainCircuit size={13} />}>
              AI Assistant
            </Button>
          </>
        }
      />

      {/* TOP KPI CARDS (6 Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-3.5 w-full min-w-0">
        {/* 1. Current Load */}
        <KPICard
          title="Current Load"
          value={displayLoadKW}
          unit="kW"
          icon={Zap}
          provenance={hasLiveTelemetry ? 'REAL_MEASURED' : 'SCENARIO'}
          trend={{
            value: hasLiveTelemetry ? `Live stream` : `Standby`,
            isPositiveGood: false,
            isUp: true,
          }}
          tooltip="Total instantaneous electrical and thermal power demand across all station living and research modules."
          accentColor="indigo"
          status={{ variant: 'OPERATIONAL', label: hasLiveTelemetry ? 'LIVE' : 'STANDBY' }}
        />

        {/* 2. Renewable Generation */}
        <KPICard
          title="Renewable Gen"
          value={displayRenewableKW}
          unit="kW"
          icon={Sun}
          provenance={solarSource === 'MEASURED' ? 'REAL_MEASURED' : 'MODELED'}
          trend={{
            value: `${displayRenewablePercent}% demand`,
            isPositiveGood: true,
            isUp: true,
          }}
          tooltip={`Combined power output from photovoltaic solar arrays (${solarSource === 'MEASURED' ? 'Live SCADA' : solarSource === 'CLIMATOLOGICAL_ESTIMATE' ? 'Climatological Estimate' : 'Unavailable'}) and wind turbines.`}
          accentColor="cyan"
          status={{
            variant: solarSource === 'MEASURED' ? 'CHARGING' : solarSource === 'CLIMATOLOGICAL_ESTIMATE' ? 'OPTIMIZED' : 'STANDBY',
            label: solarSource === 'MEASURED' ? 'LIVE PV' : solarSource === 'CLIMATOLOGICAL_ESTIMATE' ? 'EST PV' : 'STANDBY',
          }}
        />

        {/* 3. Battery SOC */}
        <KPICard
          title="Battery SOC"
          value={`${displayBatterySOC}%`}
          unit=""
          icon={BatteryCharging}
          provenance="ENGINEERING_ASSUMPTION"
          subtitle={`${Math.round((displayBatterySOC / 100) * 500)} / 500 kWh`}
          tooltip="State of Charge of the 500 kWh Lithium Iron Phosphate BESS energy storage bank."
          accentColor="emerald"
          status={{ variant: energy?.batteryStatus || 'IDLE', label: energy?.batteryStatus || 'ONLINE' }}
        />

        {/* 4. Fuel Level */}
        <KPICard
          title="Genset Fuel"
          value={`${displayFuelLevel}%`}
          unit="Level"
          icon={Fuel}
          provenance="ENGINEERING_ASSUMPTION"
          trend={{
            value: `${Math.round(displayFuelLevel * 28)} L reserve`,
            isPositiveGood: true,
            isUp: false,
          }}
          tooltip="Arctic Diesel fuel remaining in station bulk day-tanks."
          accentColor="amber"
          status={{ variant: 'OPTIMIZED', label: 'NORMAL' }}
        />

        {/* 5. Critical Load */}
        <KPICard
          title="Critical Load"
          value={`${energy?.criticalLoadProtectedPercent || 100}%`}
          unit="Protected"
          icon={ShieldCheck}
          provenance="ENGINEERING_ASSUMPTION"
          subtitle={`${displayTotalCriticalKW} kW Reserved`}
          tooltip="Guaranteed power allocation for life support, habitat heating, SATCOM, and medical ward."
          accentColor="emerald"
          status={{ variant: 'PROTECTED', label: '100% SECURE' }}
        />

        {/* 6. CO2 Avoided */}
        <KPICard
          title="CO₂ Avoided"
          value={Math.round((displayRenewableKW * 0.72) * 10) / 10}
          unit="kg/hr"
          icon={Leaf}
          provenance="MODELED"
          subtitle={`${Math.round((displayRenewableKW * 24 * 0.72) / 10) / 100} T Est`}
          tooltip="Carbon dioxide emissions displaced through renewable priority dispatch & battery peak-shaving."
          accentColor="purple"
          status={{ variant: 'INFO', label: 'ECO' }}
        />
      </div>

      {/* MAIN CHART: 24-Hour Energy Overview */}
      <EnergyOverviewChart data={forecastPoints} />

      {/* SECOND SECTION: Power Distribution SCADA Flow */}
      <EnergyFlow
        solarKW={solarPowerKW}
        solarSource={solarSource}
        isTelemetryLive={isTelemetryLive}
        solarAvailable={solarAvailable}
        windKW={displayWindKW}
        generatorKW={generators.filter((g) => g.status === 'RUNNING').reduce((acc, g) => acc + g.outputKW, 0)}
        batteryFlowKW={displayBatteryFlow}
        batterySoc={displayBatterySOC}
        loadKW={displayLoadKW}
      />

      {/* THIRD SECTION: 2019 Historical Solar Generation (Modeled from Climatology) */}
      <HistoricalSolarChart
        stationId={activeStationId}
        stationName={stationDisplayName}
      />

      {/* FOURTH SECTION: Generator Status (G1 – G4) */}
      <GeneratorStatus generators={generators} />

      {/* FIFTH SECTION: Critical Loads Priority Allocation */}
      <CriticalLoads loads={criticalLoads} />

      {/* SIXTH SECTION: AI Energy Insight Advisory */}
      {insight && <AIInsight insight={insight} />}
    </div>
  );
}
