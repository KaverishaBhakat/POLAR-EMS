'use client';

import React, { useEffect, useState } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { AnalyticsSummary, HistoricalAnalyticsPoint } from '@/lib/types';
import { AnalyticsCharts } from '@/components/analytics/AnalyticsCharts';
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

  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1B2C42]/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wide uppercase flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Historical Energy Analytics & Verification
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Longitudinal performance metrics, fuel displacement, and efficiency audit | {station?.name || activeStationId}
          </p>
        </div>

        {/* Days Filter (7D, 30D, 90D) */}
        <div className="flex items-center gap-1 bg-[#090F18] p-1 rounded border border-[#1B2C42] font-mono self-start sm:self-auto">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                days === d
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Error state if any */}
      {error && (
        <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-200 text-xs font-mono flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadAnalytics}
            className="flex items-center gap-1 px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 rounded border border-red-500/30 text-[11px] transition-colors"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Empty State Banner when 0 telemetry points exist */}
      {!loading && !error && !hasData && (
        <div className="p-4 rounded-lg bg-[#0A1422] border border-cyan-500/30 font-mono text-xs text-slate-300 flex items-start gap-3">
          <Activity size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-cyan-300">
              No historical telemetry records found for {station?.name || 'this station'}
            </p>
            <p className="text-slate-400 text-[11px]">
              The database does not currently contain historical energy, generator, or renewable records for the selected {days}-day window. Operational telemetry ingested via SCADA or the Data Ingestion Hub will automatically populate longitudinal metrics.
            </p>
          </div>
        </div>
      )}

      {/* Performance Summary Cards (Derived from PostgreSQL database) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 font-mono">
        {/* 1. Fuel Savings */}
        <div className="p-4 rounded-lg bg-[#0E1724]/90 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.08)]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>FUEL SAVINGS</span>
            <Fuel size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {loading ? '...' : `${summary?.fuelSavingsPercent ?? 0}%`}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {loading
              ? 'Calculating...'
              : `${(summary?.dieselSavedLitres ?? 0).toLocaleString()} L Total Saved`}
          </div>
        </div>

        {/* 2. Renewable Utilization */}
        <div className="p-4 rounded-lg bg-[#0E1724]/90 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>RENEWABLE PENETRATION</span>
            <Leaf size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-300">
            {loading ? '...' : `${summary?.renewablePenetrationPercent ?? 0}%`}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {loading
              ? 'Calculating...'
              : `Clean Gen: ${(summary?.totalRenewableKWh ?? 0).toLocaleString()} kWh`}
          </div>
        </div>

        {/* 3. Average Generator Efficiency */}
        <div className="p-4 rounded-lg bg-[#0E1724]/90 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.08)]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>AVG GEN EFFICIENCY</span>
            <Gauge size={16} className="text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-300">
            {loading ? '...' : `${summary?.avgGenEfficiencyPercent ?? 0}%`}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {loading
              ? 'Calculating...'
              : `Fleet Runtime: ${summary?.totalGenRuntimeHours ?? 0} hrs`}
          </div>
        </div>

        {/* 4. Critical Load Reliability */}
        <div className="p-4 rounded-lg bg-[#0E1724]/90 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.08)]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>CRITICAL RELIABILITY</span>
            <ShieldCheck size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {loading ? '...' : `${summary?.criticalLoadReliabilityPercent ?? 100}%`}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Life-Support Circuits Active</div>
        </div>

        {/* 5. CO2 Avoided */}
        <div className="p-4 rounded-lg bg-[#0E1724]/90 border border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.08)]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>CO₂ DISPLACED</span>
            <Zap size={16} className="text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300">
            {loading ? '...' : `${summary?.co2AvoidedTonnes ?? 0} T`}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {loading
              ? 'Calculating...'
              : `₹${((summary?.financialSavingsINR ?? 0) / 100000).toFixed(1)}L Logistics Saved`}
          </div>
        </div>
      </div>

      {/* Additional Historical Operational Metrics if data exists */}
      {hasData && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-lg bg-[#0B1320] border border-[#1B2C42] flex items-center justify-between">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Load Demand Profile</span>
              <span className="text-slate-200 font-bold text-sm">
                {summary.averageLoadKW} kW <span className="text-[11px] font-normal text-slate-400">(Avg)</span> / {summary.peakLoadKW} kW <span className="text-[11px] font-normal text-slate-400">(Peak)</span>
              </span>
            </div>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="p-3.5 rounded-lg bg-[#0B1320] border border-[#1B2C42] flex items-center justify-between">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Renewable Mix Breakdown</span>
              <span className="text-slate-200 font-bold text-sm">
                {summary.totalSolarKWh} kWh <span className="text-[11px] font-normal text-amber-400">PV</span> + {summary.totalWindKWh} kWh <span className="text-[11px] font-normal text-cyan-400">Wind</span>
              </span>
            </div>
            <Leaf className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="p-3.5 rounded-lg bg-[#0B1320] border border-[#1B2C42] flex items-center justify-between">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Battery Storage Average SOC</span>
              <span className="text-slate-200 font-bold text-sm">
                {summary.batteryAvgSOC}% <span className="text-[11px] font-normal text-slate-400">Period Average</span>
              </span>
            </div>
            <BatteryCharging className="w-4 h-4 text-cyan-400" />
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      {loading ? (
        <LoadingSkeleton className="h-80" />
      ) : (
        <AnalyticsCharts data={timeline} stationName={station?.name} />
      )}
    </div>
  );
}

