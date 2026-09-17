'use client';

import React, { useEffect, useState } from 'react';
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
import { Zap, Sun, BatteryCharging, Fuel, ShieldCheck, Leaf, Activity } from 'lucide-react';

export default function DashboardPage() {
  const { activeStationId, station, energy } = useStation();

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
        const gens = await apiClient.getGenerators(activeStationId);
        const loads = await apiClient.getCriticalLoads(activeStationId);
        const fc = await apiClient.getForecast(activeStationId);
        if (isMounted) {
          setGenerators(gens);
          setCriticalLoads(loads);
          setForecastPoints(fc.points);
          setInsight(fc.insights[0] || null);
        }
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

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1B2C42]/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wide uppercase flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-cyan-400" />
            Energy Operations Center
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time energy monitoring and intelligent resource management | {station?.name}
          </p>
        </div>
      </div>

      {/* TOP KPI CARDS (6 Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Current Load */}
        <KPICard
          title="Current Load"
          value={energy.currentLoadKW}
          unit="kW"
          icon={Zap}
          trend={{
            value: `+${energy.loadTrendPercent}% vs prev hr`,
            isPositiveGood: false,
            isUp: true,
          }}
          tooltip="Total instantaneous electrical and thermal power demand across all station living and research modules."
          accentColor="cyan"
          status={{ variant: 'OPERATIONAL', label: 'NORMAL' }}
        />

        {/* 2. Renewable Generation */}
        <KPICard
          title="Renewable Gen"
          value={energy.totalRenewableKW}
          unit="kW"
          icon={Sun}
          trend={{
            value: `${energy.renewablePenetrationPercent}% of demand`,
            isPositiveGood: true,
            isUp: true,
          }}
          tooltip="Combined power output from photovoltaic solar arrays and high-latitude wind turbines."
          accentColor="cyan"
          status={{ variant: 'CHARGING', label: 'SOLAR+WIND' }}
        />

        {/* 3. Battery SOC */}
        <KPICard
          title="Battery SOC"
          value={`${energy.batterySocPercent}%`}
          unit=""
          icon={BatteryCharging}
          subtitle={`${energy.batteryCurrentKWh} / ${energy.batteryCapacityKWh} kWh`}
          tooltip="State of Charge of the 500 kWh Lithium Iron Phosphate BESS energy storage bank."
          accentColor="emerald"
          status={{ variant: energy.batteryStatus, label: energy.batteryStatus }}
        />

        {/* 4. Fuel Consumption */}
        <KPICard
          title="Fuel Consumed"
          value={energy.dailyFuelConsumptionL}
          unit="L/day"
          icon={Fuel}
          trend={{
            value: `${energy.fuelSavingsPercent}% below baseline`,
            isPositiveGood: true,
            isUp: false,
          }}
          tooltip="24-hour Arctic Diesel consumption compared against the un-optimized baseline."
          accentColor="amber"
          status={{ variant: 'OPTIMIZED', label: `${energy.fuelConsumptionRateLh} L/h` }}
        />

        {/* 5. Critical Load */}
        <KPICard
          title="Critical Load"
          value={`${energy.criticalLoadProtectedPercent}%`}
          unit="Protected"
          icon={ShieldCheck}
          subtitle={`${energy.criticalLoadKW} kW Reserved`}
          tooltip="Guaranteed power allocation for life support, habitat heating, SATCOM, and medical ward."
          accentColor="emerald"
          status={{ variant: 'PROTECTED', label: '100% SECURE' }}
        />

        {/* 6. CO2 Avoided */}
        <KPICard
          title="CO₂ Avoided"
          value={energy.co2AvoidedDailyKg}
          unit="kg/day"
          icon={Leaf}
          subtitle={`${energy.co2AvoidedTotalTonnes} Tonnes Total`}
          tooltip="Carbon dioxide emissions displaced today through renewable priority dispatch & battery peak-shaving."
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
