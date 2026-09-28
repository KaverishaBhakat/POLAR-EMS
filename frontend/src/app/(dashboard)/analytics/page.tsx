'use client';

import React, { useEffect, useState } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { AnalyticsSummary, HistoricalAnalyticsPoint } from '@/lib/types';
import { AnalyticsCharts } from '@/components/analytics/AnalyticsCharts';
import { StationUnavailableState } from '@/components/common/StationUnavailableState';
import { LoadingSkeleton } from '@/components/common/Toast';
import {
  BarChart3,
  Fuel,
  Leaf,
  Gauge,
  ShieldCheck,
  Zap,
  Activity,
  AlertCircle,
  RefreshCw,
  BatteryCharging,
  Cpu,
} from 'lucide-react';
import { PageHeader, GlassCard, Button } from '@/components/ui';

export default function AnalyticsPage() {
  const { activeStationId, station } = useStation();

  const [days, setDays] = useState<number>(30);
  const [timeline, setTimeline] = useState<HistoricalAnalyticsPoint[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [hasData, setHasData] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getHistoricalAnalytics(days, activeStationId);
      setTimeline(res.timeline || []);
      setSummary(res.summary || null);
      setHasData(Boolean(res.hasData && (res.timeline?.length > 0 || res.summary?.totalDataPoints > 0)));
    } catch (err: any) {
      console.error('Failed to load historical analytics:', err);
      setError(err.message || 'Failed to load historical telemetry from database');
      setTimeline([]);
      setSummary(null);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [days, activeStationId]);

  const isBharati = activeStationId === 'bharati';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Historical Energy Analytics & Verification"
        subtitle={`Longitudinal performance metrics, fuel displacement, and efficiency audit | ${station?.name || activeStationId}`}
        icon={<BarChart3 className="w-5 h-5 text-accent-bright" />}
        badge={{
          label: isBharati ? "BHARATI ANALYTICS" : "HISTORICAL SCADA",
          variant: isBharati ? "neutral" : "default"
        }}
        breadcrumbs={[
          { label: "Intelligence", href: "/analytics" },
          { label: "Analytics" }
        ]}
        actions={
          <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/6 font-mono">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  days === d
                    ? 'bg-accent/20 text-accent-bright font-semibold border border-accent/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        }
      />

      {/* Error state if any */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 text-red-200 text-xs font-mono flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            onClick={loadAnalytics}
            variant="ghost"
            size="sm"
          >
            <RefreshCw size={12} className="mr-1" /> Retry
          </Button>
        </div>
      )}

      {/* Bharati or Empty State Handler */}
      {!loading && !error && (!hasData || isBharati) ? (
        <StationUnavailableState
          title="Energy Analytics Unavailable"
          subsystemName="energy & generator"
          description="No measured electrical-load, battery storage, or diesel generator records have been ingested for Bharati Station yet. Historical weather observations (50,248 rows) remain accessible under Meteorology."
          stationName={station?.name || (isBharati ? 'Bharati Research Station' : 'Maitri Research Station')}
          icon={BarChart3}
          provenanceType="UNAVAILABLE"
        />
      ) : (
        <>
          {/* Performance Summary Cards (Derived from PostgreSQL database) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 font-mono">
            {/* 1. Fuel Savings */}
            <GlassCard className="p-4 border-emerald-500/20">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>FUEL SAVINGS</span>
                <Fuel size={16} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 tracking-tight">
                {loading ? '...' : `${summary?.fuelSavingsPercent ?? 0}%`}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {loading
                  ? 'Calculating...'
                  : `${(summary?.dieselSavedLitres ?? 0).toLocaleString()} L Total Saved`}
              </div>
            </GlassCard>

            {/* 2. Renewable Utilization */}
            <GlassCard className="p-4 border-cyan-500/20">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>RENEWABLE PENETRATION</span>
                <Leaf size={16} className="text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-cyan-300 tracking-tight">
                {loading ? '...' : `${summary?.renewablePenetrationPercent ?? 0}%`}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {loading
                  ? 'Calculating...'
                  : `Clean Gen: ${(summary?.totalRenewableKWh ?? 0).toLocaleString()} kWh`}
              </div>
            </GlassCard>

            {/* 3. Average Generator Efficiency */}
            <GlassCard className="p-4 border-blue-500/20">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>AVG GEN EFFICIENCY</span>
                <Gauge size={16} className="text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-300 tracking-tight">
                {loading ? '...' : `${summary?.avgGenEfficiencyPercent ?? 0}%`}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {loading
                  ? 'Calculating...'
                  : `Fleet Runtime: ${summary?.totalGenRuntimeHours ?? 0} hrs`}
              </div>
            </GlassCard>

            {/* 4. Critical Load Reliability */}
            <GlassCard className="p-4 border-emerald-500/20">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>CRITICAL RELIABILITY</span>
                <ShieldCheck size={16} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 tracking-tight">
                {loading ? '...' : `${summary?.criticalLoadReliabilityPercent ?? 100}%`}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Life-Support Circuits Active</div>
            </GlassCard>

            {/* 5. CO2 Avoided */}
            <GlassCard className="p-4 border-purple-500/20">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>CO₂ DISPLACED</span>
                <Zap size={16} className="text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-300 tracking-tight">
                {loading ? '...' : `${summary?.co2AvoidedTonnes ?? 0} T`}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {loading
                  ? 'Calculating...'
                  : `₹${((summary?.financialSavingsINR ?? 0) / 100000).toFixed(1)}L Logistics Saved`}
              </div>
            </GlassCard>
          </div>

          {/* Additional Historical Operational Metrics */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <GlassCard className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Load Demand Profile</span>
                  <span className="text-slate-200 font-bold text-sm">
                    {summary.averageLoadKW} kW <span className="text-[11px] font-normal text-slate-400">(Avg)</span> / {summary.peakLoadKW} kW <span className="text-[11px] font-normal text-slate-400">(Peak)</span>
                  </span>
                </div>
                <Cpu className="w-4 h-4 text-accent-bright" />
              </GlassCard>

              <GlassCard className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Renewable Mix Breakdown</span>
                  <span className="text-slate-200 font-bold text-sm">
                    {summary.totalSolarKWh} kWh <span className="text-[11px] font-normal text-amber-400">PV</span> + {summary.totalWindKWh} kWh <span className="text-[11px] font-normal text-cyan-400">Wind</span>
                  </span>
                </div>
                <Leaf className="w-4 h-4 text-emerald-400" />
              </GlassCard>

              <GlassCard className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Battery Storage Average SOC</span>
                  <span className="text-slate-200 font-bold text-sm">
                    {summary.batteryAvgSOC}% <span className="text-[11px] font-normal text-slate-400">Period Average</span>
                  </span>
                </div>
                <BatteryCharging className="w-4 h-4 text-accent-bright" />
              </GlassCard>
            </div>
          )}

          {/* Analytics Charts */}
          {loading ? (
            <LoadingSkeleton className="h-80" />
          ) : (
            <AnalyticsCharts data={timeline} stationName={station?.name} />
          )}
        </>
      )}
    </div>
  );
}
