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
import { LoadingSkeleton } from '@/components/common/Toast';
import { Zap, Sun, BatteryCharging, Fuel, ShieldCheck, Leaf, Activity, UploadCloud, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const { activeStationId, station, energy } = useStation();
  console.log('ACTIVE STATION:', activeStationId);

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
        try {
          const dashboard = await apiClient.getDashboardData(activeStationId);
          console.log('BACKEND DASHBOARD:', dashboard);
          if (isMounted) {
            setDashboardBackend(dashboard);
          }
        } catch (apiErr) {
          console.warn('Backend live dashboard data not yet available, using client telemetry:', apiErr);
        }

        const gens = await apiClient.getGenerators(activeStationId);
        const loads = await apiClient.getCriticalLoads(activeStationId);
        const fc = await apiClient.getForecast(activeStationId);
        if (isMounted) {
          setGenerators(gens);
          setCriticalLoads(loads);
          setForecastPoints(fc.points);
          setInsight(fc.insights[0] || null);
        }
      } catch (err) {
        console.error('Error loading dashboard telemetry:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [activeStationId]);

  if (!energy || loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-24" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-28" />
          ))}
        </div>
        <LoadingSkeleton className="h-80" />
      </div>
    );
  }

  const hasLiveTelemetry = Boolean(dashboardBackend?.summary?.hasTelemetryData);

  const displayLoadKW = hasLiveTelemetry
    ? dashboardBackend.summary.currentLoad
    : (energy?.currentLoadKW || 0);

  const displayRenewableKW = hasLiveTelemetry
    ? dashboardBackend.summary.renewableGeneration
    : (energy?.totalRenewableKW || 0);

  const displayRenewablePercent = hasLiveTelemetry
    ? dashboardBackend.summary.renewablePercentage
    : (energy?.renewablePenetrationPercent || 0);

  const displayBatterySOC = hasLiveTelemetry
    ? dashboardBackend.summary.batterySOC
    : (energy?.batterySocPercent || 0);

  const displayFuelLevel = hasLiveTelemetry
    ? dashboardBackend.summary.fuelLevel
    : 78.5;

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1B2C42]/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wide uppercase flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-cyan-400" />
            Energy Operations Center
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time energy monitoring and intelligent resource management | {station?.name}
          </p>
        </div>

        <Link
          href="/data-upload"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider font-mono transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] self-start sm:self-auto cursor-pointer"
        >
          <UploadCloud size={15} />
          <span>Upload Telemetry</span>
        </Link>
      </div>

      {/* Awaiting SCADA Telemetry Notification Banner */}
      {!hasLiveTelemetry && (
        <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-950/40 via-[#0B1728] to-blue-950/40 border border-cyan-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono shadow-[0_0_15px_rgba(6,182,212,0.1)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <UploadCloud size={22} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Awaiting Real-Time SCADA Telemetry Ingestion</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Clean Database State
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Synthetic demo readings have been removed. Manually inject live SCADA readings or batch-upload CSV/JSON datasets to update real-time graphs and PostgreSQL.
              </p>
            </div>
          </div>
          <Link
            href="/data-upload"
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0"
          >
            <span>Open Ingestion Hub</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* TOP KPI CARDS (6 Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Current Load */}
        <KPICard
          title="Current Load"
          value={displayLoadKW}
          unit="kW"
          icon={Zap}
          trend={{
            value: hasLiveTelemetry ? `Live telemetry active` : `Awaiting ingestion`,
            isPositiveGood: false,
            isUp: true,
          }}
          tooltip="Total instantaneous electrical and thermal power demand across all station living and research modules."
          accentColor="cyan"
          status={{ variant: 'OPERATIONAL', label: hasLiveTelemetry ? 'LIVE DB' : 'STANDBY' }}
        />

        {/* 2. Renewable Generation */}
        <KPICard
          title="Renewable Gen"
          value={displayRenewableKW}
          unit="kW"
          icon={Sun}
          trend={{
            value: `${displayRenewablePercent}% of demand`,
            isPositiveGood: true,
            isUp: true,
          }}
          tooltip="Combined power output from photovoltaic solar arrays and high-latitude wind turbines."
          accentColor="cyan"
          status={{ variant: 'CHARGING', label: hasLiveTelemetry ? 'SOLAR+WIND' : 'STANDBY' }}
        />

        {/* 3. Battery SOC */}
        <KPICard
          title="Battery SOC"
          value={`${displayBatterySOC}%`}
          unit=""
          icon={BatteryCharging}
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
          trend={{
            value: `${Math.round(displayFuelLevel * 28)} L in reserve`,
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
          subtitle={`${energy?.criticalLoadKW || 73.2} kW Reserved`}
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
          subtitle={`${Math.round((displayRenewableKW * 24 * 0.72) / 10) / 100} Tonnes Est`}
          tooltip="Carbon dioxide emissions displaced through renewable priority dispatch & battery peak-shaving."
          accentColor="purple"
          status={{ variant: 'INFO', label: 'ECO BENEFIT' }}
        />
      </div>

      {/* MAIN CHART: 24-Hour Energy Overview */}
      <EnergyOverviewChart data={forecastPoints} />

      {/* SECOND SECTION: Power Distribution SCADA Flow */}
      <EnergyFlow
        solarKW={energy.solarGenerationKW}
        windKW={energy.windGenerationKW}
        generatorKW={generators.filter((g) => g.status === 'RUNNING').reduce((acc, g) => acc + g.outputKW, 0)}
        batteryFlowKW={energy.batteryFlowKW}
        batterySoc={energy.batterySocPercent}
        loadKW={energy.currentLoadKW}
      />

      {/* THIRD SECTION: Generator Status (G1 – G4) */}
      <GeneratorStatus generators={generators} />

      {/* FOURTH SECTION: Critical Loads Priority Allocation */}
      <CriticalLoads loads={criticalLoads} />

      {/* FIFTH SECTION: AI Energy Insight Advisory */}
      {insight && <AIInsight insight={insight} />}
    </div>
  );
}
