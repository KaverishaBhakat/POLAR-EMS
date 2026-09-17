'use client';

import React, { useEffect, useState } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { HistoricalAnalyticsPoint } from '@/lib/types';
import { ANALYTICS_SUMMARY } from '@/lib/mock-data/analytics';
import { AnalyticsCharts } from '@/components/analytics/AnalyticsCharts';
import { LoadingSkeleton } from '@/components/common/Toast';
import { BarChart3, Fuel, Leaf, Gauge, ShieldCheck, Zap, IndianRupee, Sparkles } from 'lucide-react';

export default function AnalyticsPage() {
  const { activeStationId, station } = useStation();

  const [days, setDays] = useState<number>(30);
  const [timeline, setTimeline] = useState<HistoricalAnalyticsPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadAnalytics() {
      setLoading(true);
      try {
        const res = await apiClient.getHistoricalAnalytics(days, activeStationId);
        if (isMounted) setTimeline(res.timeline);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadAnalytics();
    return () => {
      isMounted = false;
    };
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
            Longitudinal performance metrics, fuel displacement, and efficiency audit | {station?.name}
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

      {/* Demo Notice Banner */}
      <div className="p-3 rounded-lg bg-[#0A1422] border border-cyan-500/30 font-mono text-xs text-slate-300 flex items-center gap-2">
        <Sparkles size={16} className="text-cyan-400 flex-shrink-0" />
        <span>
          Note: Historical telemetry records are simulated based on realistic Antarctic meteorological seasonal cycles and NCPOR expedition logistics.
        </span>
      </div>

      {/* Performance Summary Cards (5 Metrics from prompt) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 font-mono">
        {/* 1. Fuel Savings */}
        <div className="p-4 rounded-lg bg-[#0E1724]/90 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.08)]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>FUEL SAVINGS</span>
            <Fuel size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {ANALYTICS_SUMMARY.fuelSavingsPercent}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {ANALYTICS_SUMMARY.dieselSavedLitres.toLocaleString()} Litres Total Saved
          </div>
        </div>

        {/* 2. Renewable Utilization */}
        <div className="p-4 rounded-lg bg-[#0E1724]/90 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>RENEWABLE PENETRATION</span>
            <Leaf size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-300">
            {ANALYTICS_SUMMARY.renewablePenetrationPercent}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Solar PV + Wind Fleet Average</div>
        </div>

        {/* 3. Average Generator Efficiency */}
        <div className="p-4 rounded-lg bg-[#0E1724]/90 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.08)]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>AVG GEN EFFICIENCY</span>
            <Gauge size={16} className="text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-300">
            {ANALYTICS_SUMMARY.avgGenEfficiencyPercent}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">SFC Sweet-Spot Locked</div>
        </div>

        {/* 4. Critical Load Reliability */}
        <div className="p-4 rounded-lg bg-[#0E1724]/90 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.08)]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>CRITICAL RELIABILITY</span>
            <ShieldCheck size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {ANALYTICS_SUMMARY.criticalLoadReliabilityPercent}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Zero Life-Support Outages</div>
        </div>

        {/* 5. CO2 Avoided */}
        <div className="p-4 rounded-lg bg-[#0E1724]/90 border border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.08)]">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>CO₂ DISPLACED</span>
            <Zap size={16} className="text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300">
            {ANALYTICS_SUMMARY.co2AvoidedTonnes} T
          </div>
          <div className="text-[10px] text-slate-400 mt-1">₹48.6 Lakhs Logistics Saved</div>
        </div>
      </div>

      {/* Analytics Charts */}
      {loading ? <LoadingSkeleton className="h-80" /> : <AnalyticsCharts data={timeline} />}
    </div>
  );
}
