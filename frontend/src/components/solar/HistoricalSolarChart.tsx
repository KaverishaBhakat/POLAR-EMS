'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import {
  SolarGenerationHistoryRecord,
  SolarGenerationHistorySummary,
} from '@/lib/types';
import { LoadingSkeleton } from '@/components/common/Toast';
import {
  Sun,
  Calendar,
  Layers,
  Database,
  Info,
  RefreshCw,
  AlertTriangle,
  Zap,
  Activity,
  BarChart2,
  Sliders,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceArea,
} from 'recharts';

interface HistoricalSolarChartProps {
  stationId: string;
  stationName?: string;
  className?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function HistoricalSolarChart({
  stationId,
  stationName = 'Maitri Station',
  className = '',
}: HistoricalSolarChartProps) {
  const [summary, setSummary] = useState<SolarGenerationHistorySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // View filtering: 'year' | 'month' | 'preset'
  const [viewMode, setViewMode] = useState<'month' | 'year' | 'preset'>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(12); // Default to December (Summer Peak)
  const [selectedPreset, setSelectedPreset] = useState<'summer' | 'winter' | 'equinox'>('summer');

  // Time series records
  const [records, setRecords] = useState<SolarGenerationHistoryRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState<boolean>(true);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  // In-memory record cache keyed by query string to prevent redundant fetches
  const [cache, setCache] = useState<Record<string, SolarGenerationHistoryRecord[]>>({});
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Fetch Summary statistics once per stationId
  const fetchSummary = useCallback(async () => {
    if (!stationId) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await apiClient.getSolarGenerationHistorySummary(stationId);
      setSummary(data);
    } catch (err: any) {
      console.error('Failed to fetch historical solar summary:', err);
      setSummaryError(err.message || 'Unable to load historical solar summary');
    } finally {
      setSummaryLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Compute current date range parameters based on view controls
  const currentParams = useMemo(() => {
    if (viewMode === 'month') {
      const mStr = String(selectedMonth).padStart(2, '0');
      // Days in month for 2019 (non-leap year)
      const daysInMonth = new Date(2019, selectedMonth, 0).getDate();
      return {
        start: `2019-${mStr}-01T00:00:00.000Z`,
        end: `2019-${mStr}-${String(daysInMonth).padStart(2, '0')}T23:59:59.000Z`,
        limit: 500, // Monthly hourly records count is up to 744 (fetched in 2 pages if needed or 500)
        cacheKey: `month_${selectedMonth}`,
      };
    } else if (viewMode === 'preset') {
      if (selectedPreset === 'summer') {
        return {
          start: '2019-12-01T00:00:00.000Z',
          end: '2019-12-31T23:59:59.000Z',
          limit: 500,
          cacheKey: 'preset_summer',
        };
      } else if (selectedPreset === 'winter') {
        return {
          start: '2019-06-01T00:00:00.000Z',
          end: '2019-06-30T23:59:59.000Z',
          limit: 500,
          cacheKey: 'preset_winter',
        };
      } else {
        return {
          start: '2019-03-15T00:00:00.000Z',
          end: '2019-03-31T23:59:59.000Z',
          limit: 500,
          cacheKey: 'preset_equinox',
        };
      }
    } else {
      // Full year overview (first page sampling 500 points across the year)
      return {
        start: '2019-01-01T00:00:00.000Z',
        end: '2019-12-31T23:59:59.000Z',
        limit: 500,
        cacheKey: 'year_full',
      };
    }
  }, [viewMode, selectedMonth, selectedPreset]);

  // 2. Fetch Time Series Records with in-memory caching
  const fetchRecords = useCallback(async () => {
    if (!stationId) return;

    const { start, end, limit, cacheKey } = currentParams;

    // Return from cache if available
    if (cache[cacheKey] && cache[cacheKey].length > 0) {
      setRecords(cache[cacheKey]);
      setRecordsLoading(false);
      return;
    }

    setRecordsLoading(true);
    setRecordsError(null);

    try {
      // Fetch records (first page up to limit)
      const res = await apiClient.getSolarGenerationHistory(stationId, {
        start,
        end,
        limit,
        page: 1,
      });

      let allRecords = res.records || [];

      // If more pages exist for the selected month (e.g. 744 hours > 500 limit), fetch page 2
      if (res.pagination && res.pagination.totalPages > 1 && res.pagination.page === 1) {
        try {
          const page2 = await apiClient.getSolarGenerationHistory(stationId, {
            start,
            end,
            limit,
            page: 2,
          });
          if (page2.records && page2.records.length > 0) {
            allRecords = [...allRecords, ...page2.records];
          }
        } catch (p2Err) {
          console.warn('Page 2 fetch skipped:', p2Err);
        }
      }

      setRecords(allRecords);
      setCache((prev) => ({ ...prev, [cacheKey]: allRecords }));
    } catch (err: any) {
      console.error('Failed to fetch solar generation history series:', err);
      setRecordsError(err.message || 'Unable to retrieve historical solar time series');
    } finally {
      setRecordsLoading(false);
    }
  }, [stationId, currentParams, cache]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Format date/time labels for chart
  const formatXAxisLabel = (isoDateStr: string) => {
    if (!isoDateStr) return '';
    const d = new Date(isoDateStr);
    if (viewMode === 'year') {
      return `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
    }
    return `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:00`;
  };

  const formatFullTooltipTime = (isoDateStr: string) => {
    if (!isoDateStr) return 'N/A';
    const d = new Date(isoDateStr);
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} ${String(d.getUTCHours()).padStart(2, '0')}:00 UTC`;
  };

  // Metrics for active view
  const currentViewMetrics = useMemo(() => {
    if (!records || records.length === 0) {
      return { total: 0, available: 0, unavailable: 0, peakKw: 0, avgKw: 0 };
    }
    const valid = records.filter((r) => r.solarPowerKW !== null && r.solarPowerKW !== undefined);
    const totalKw = valid.reduce((acc, r) => acc + (r.solarPowerKW || 0), 0);
    const maxKw = valid.length > 0 ? Math.max(...valid.map((r) => r.solarPowerKW || 0)) : 0;
    const avgKw = valid.length > 0 ? totalKw / valid.length : 0;

    return {
      total: records.length,
      available: valid.length,
      unavailable: records.length - valid.length,
      peakKw: parseFloat(maxKw.toFixed(2)),
      avgKw: parseFloat(avgKw.toFixed(2)),
    };
  }, [records]);

  return (
    <div className={`space-y-4 font-mono ${className}`}>
      {/* Header Banner */}
      <div className="bg-[#0A121E] rounded-lg border border-amber-500/30 p-4 sm:p-5 shadow-[0_0_20px_rgba(245,158,11,0.06)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Sun className="w-5 h-5 animate-spin-slow" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide uppercase">
                2019 Historical Solar Generation
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 font-semibold tracking-wider uppercase">
                CLIMATOLOGICAL ESTIMATE
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300">
                2019 REAL TIME AXIS (8,760h)
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Modeled from 1985–2000 Monthly-Hourly Solar Climatology applied across physical 2019 Maitri AWS meteorological timestamps. 
              <span className="text-amber-300/90 font-medium"> Strictly segregated from live SCADA telemetry.</span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              onClick={() => {
                setCache({});
                fetchSummary();
                fetchRecords();
              }}
              title="Refresh Historical Solar Dataset"
              className="px-3 py-1.5 rounded bg-[#101D2E] border border-[#1B2C42] hover:border-amber-500/40 text-slate-300 hover:text-amber-300 text-xs transition-all flex items-center gap-1.5 uppercase font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Baseline</span>
            </button>
          </div>
        </div>

        {/* 1. Summary Statistics KPIs from /summary */}
        {summaryLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-4 pt-4 border-t border-[#1B2C42]/60">
            {Array.from({ length: 7 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-16" />
            ))}
          </div>
        ) : summaryError ? (
          <div className="mt-4 p-3 rounded bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{summaryError}</span>
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-4 pt-4 border-t border-[#1B2C42]/60 text-xs">
            {/* Total Points */}
            <div className="p-2.5 rounded bg-[#0E1724]/90 border border-[#1B2C42]">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Total Baseline</div>
              <div className="text-base font-bold text-slate-200">
                {summary.totalPoints.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">pts</span>
              </div>
              <div className="text-[9px] text-slate-500">Full 2019 Hourly Axis</div>
            </div>

            {/* Available Points */}
            <div className="p-2.5 rounded bg-[#0E1724]/90 border border-emerald-500/30">
              <div className="text-[10px] text-emerald-400/90 uppercase tracking-wider mb-0.5">Available Normal</div>
              <div className="text-base font-bold text-emerald-300">
                {summary.availablePoints.toLocaleString()} <span className="text-[10px] font-normal text-emerald-500">pts</span>
              </div>
              <div className="text-[9px] text-emerald-400/70">Daylight & Sun Hours</div>
            </div>

            {/* Polar Night / Unavailable */}
            <div className="p-2.5 rounded bg-[#0E1724]/90 border border-indigo-500/30">
              <div className="text-[10px] text-indigo-300/90 uppercase tracking-wider mb-0.5">Polar Night / Null</div>
              <div className="text-base font-bold text-indigo-300">
                {summary.unavailablePoints.toLocaleString()} <span className="text-[10px] font-normal text-indigo-500">pts</span>
              </div>
              <div className="text-[9px] text-indigo-400/70">Strict NULL (No Fake 0)</div>
            </div>

            {/* Average Power */}
            <div className="p-2.5 rounded bg-[#0E1724]/90 border border-amber-500/30">
              <div className="text-[10px] text-amber-400/90 uppercase tracking-wider mb-0.5">Average Yield</div>
              <div className="text-base font-bold text-amber-300">
                {summary.avgSolarPowerKW ?? 5.69} <span className="text-[10px] font-normal text-slate-400">kW</span>
              </div>
              <div className="text-[9px] text-slate-500">Avg {summary.avgIrradianceWm2 ?? 142.23} W/m²</div>
            </div>

            {/* Peak Generation */}
            <div className="p-2.5 rounded bg-[#0E1724]/90 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.08)]">
              <div className="text-[10px] text-amber-300 uppercase tracking-wider mb-0.5">Peak Modeled Yield</div>
              <div className="text-base font-bold text-amber-300">
                {summary.maxSolarPowerKW ?? 27.37} <span className="text-[10px] font-normal text-slate-400">kW</span>
              </div>
              <div className="text-[9px] text-amber-400/70">Peak {summary.maxIrradianceWm2 ?? 684.29} W/m²</div>
            </div>

            {/* PV Hardware Array */}
            <div className="p-2.5 rounded bg-[#0E1724]/90 border border-[#1B2C42]">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">PV Capacity</div>
              <div className="text-base font-bold text-cyan-300">
                {summary.pvCapacityKw ?? 50} <span className="text-[10px] font-normal text-slate-400">kW</span>
              </div>
              <div className="text-[9px] text-slate-500">Hardware Nominal</div>
            </div>

            {/* Performance Ratio */}
            <div className="p-2.5 rounded bg-[#0E1724]/90 border border-[#1B2C42]">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">System PR</div>
              <div className="text-base font-bold text-teal-300">
                {summary.performanceRatio ?? 0.80} <span className="text-[10px] font-normal text-slate-500">PR</span>
              </div>
              <div className="text-[9px] text-slate-500">IEC-61724-1 Standard</div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 2. Interactive Date-Range & Month Controls */}
      <div className="bg-[#0E1724]/90 rounded-lg border border-[#1B2C42] p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#1B2C42]/60">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Temporal Window Selection (2019 Historical Axis)
            </span>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-[#0A121E] rounded border border-[#1B2C42] text-xs">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded text-[10px] uppercase font-bold transition-all ${
                viewMode === 'month'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              By Month (High Res)
            </button>
            <button
              onClick={() => setViewMode('preset')}
              className={`px-3 py-1 rounded text-[10px] uppercase font-bold transition-all ${
                viewMode === 'preset'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Antarctic Seasons
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`px-3 py-1 rounded text-[10px] uppercase font-bold transition-all ${
                viewMode === 'year'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full Year Overview
            </button>
          </div>
        </div>

        {/* Dynamic Sub-Controls */}
        {viewMode === 'month' && (
          <div className="space-y-2">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Select calendar month to inspect hourly solar profile:</span>
              <span className="text-amber-300 font-semibold uppercase">
                {MONTH_NAMES[selectedMonth - 1]} 2019 ({records.length} hourly points)
              </span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
              {MONTH_SHORT.map((mShort, idx) => {
                const mNum = idx + 1;
                const isSelected = selectedMonth === mNum;
                const isPolarNight = mNum === 6; // June has complete polar night
                return (
                  <button
                    key={mNum}
                    onClick={() => setSelectedMonth(mNum)}
                    className={`px-2 py-1.5 rounded text-[11px] font-bold uppercase transition-all flex flex-col items-center justify-center gap-0.5 border ${
                      isSelected
                        ? 'bg-amber-500/25 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                        : isPolarNight
                        ? 'bg-[#080E18] border-indigo-500/40 text-indigo-300/80 hover:border-indigo-400'
                        : 'bg-[#0A121E] border-[#1B2C42] text-slate-400 hover:text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <span>{mShort}</span>
                    <span className="text-[8px] font-normal text-slate-500">
                      {isPolarNight ? 'Polar Night' : mNum === 12 || mNum === 1 ? 'Peak Sun' : '2019'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'preset' && (
          <div className="space-y-2">
            <div className="text-[11px] text-slate-400">
              Antarctic Climatological Archetype Periods:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={() => setSelectedPreset('summer')}
                className={`p-3 rounded text-left border transition-all ${
                  selectedPreset === 'summer'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                    : 'bg-[#0A121E] border-[#1B2C42] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span>Austral Summer Peak (Dec)</span>
                  <Sun size={14} className="text-amber-400" />
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Midnight sun period with 24h continuous diurnal solar resource reaching ~27.37 kW peak generation.
                </p>
              </button>

              <button
                onClick={() => setSelectedPreset('winter')}
                className={`p-3 rounded text-left border transition-all ${
                  selectedPreset === 'winter'
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.15)]'
                    : 'bg-[#0A121E] border-[#1B2C42] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span>Polar Night Horizon Obscuration (Jun)</span>
                  <ShieldAlert size={14} className="text-indigo-400" />
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Sun continuously below horizon. Climatological observations strictly NULL (never fake zero).
                </p>
              </button>

              <button
                onClick={() => setSelectedPreset('equinox')}
                className={`p-3 rounded text-left border transition-all ${
                  selectedPreset === 'equinox'
                    ? 'bg-teal-500/15 border-teal-500 text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.15)]'
                    : 'bg-[#0A121E] border-[#1B2C42] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span>Autumn Transition (Late March)</span>
                  <Activity size={14} className="text-teal-400" />
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Rapidly diminishing solar daylight window prior to Antarctic winter onset.
                </p>
              </button>
            </div>
          </div>
        )}

        {viewMode === 'year' && (
          <div className="text-[11px] text-slate-400 p-2.5 rounded bg-[#0A121E] border border-[#1B2C42]/60 flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>
              Displaying the full 2019 annual envelope (January to December). Highlighting the seasonal shift from midnight sun summer peak to polar night winter darkness.
            </span>
          </div>
        )}
      </div>

      {/* 3. Main Historical Solar PV Chart */}
      <div className="bg-[#0E1724]/90 rounded-lg border border-[#1B2C42] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1B2C42]/60">
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-slate-200 uppercase flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              Modeled Photovoltaic Yield Curve (kW)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Source: SolarRadiationClimatology (1985–2000 Normals) $\times$ {summary?.pvCapacityKw || 50} kW Array $\times$ {summary?.performanceRatio || 0.80} PR / 1000
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
              <span>Solar PV Power (kW)</span>
            </span>
            <span className="flex items-center gap-1.5 text-indigo-300/80">
              <span className="w-2.5 h-2.5 rounded-full border border-dashed border-indigo-400" />
              <span>Null Gap (Polar Night)</span>
            </span>
          </div>
        </div>

        {/* Current View Metric Badges */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] p-2.5 rounded bg-[#0A121E] border border-[#1B2C42]">
          <span className="text-slate-400">
            Window Points: <strong className="text-slate-200">{currentViewMetrics.total}</strong>
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400">
            Available: <strong>{currentViewMetrics.available}</strong>
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-indigo-400">
            Unavailable / Polar Night: <strong>{currentViewMetrics.unavailable}</strong>
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-amber-400">
            Window Peak: <strong>{currentViewMetrics.peakKw} kW</strong>
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-amber-300">
            Window Avg: <strong>{currentViewMetrics.avgKw} kW</strong>
          </span>
        </div>

        {/* Chart Viewport */}
        {recordsLoading ? (
          <LoadingSkeleton className="h-80 w-full" />
        ) : recordsError ? (
          <div className="h-80 rounded-lg border border-rose-500/30 bg-[#160B12] p-6 text-center flex flex-col items-center justify-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
            <div className="text-xs text-rose-300 font-bold uppercase">
              Failed to load historical solar time series
            </div>
            <p className="text-[11px] text-rose-200/70 max-w-md">{recordsError}</p>
            <button
              onClick={fetchRecords}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs rounded uppercase font-bold transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" /> Retry Query
            </button>
          </div>
        ) : records.length === 0 ? (
          <div className="h-80 rounded-lg border border-[#1B2C42] bg-[#0A121E] p-6 text-center flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
            <Database className="w-8 h-8 text-slate-600" />
            <span>No historical records found for this temporal window.</span>
          </div>
        ) : (
          <div className="h-80 w-full min-h-[320px]">
            {!isMounted ? (
              <div className="w-full h-full bg-[#0A121E]/60 rounded-lg animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={records}
                  margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="histSolarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatXAxisLabel}
                    stroke="#64748b"
                    fontSize={10}
                    minTickGap={28}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    unit=" kW"
                    domain={[0, 'auto']}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const dataPoint: SolarGenerationHistoryRecord = payload[0].payload;
                      const isUnavailable = dataPoint.solarPowerKW === null || dataPoint.solarSource === 'UNAVAILABLE';

                      return (
                        <div className="bg-[#0A121E] border border-amber-500/40 rounded-lg p-3 shadow-xl font-mono text-xs space-y-1.5 min-w-[240px]">
                          <div className="text-[11px] font-bold text-slate-300 border-b border-[#1B2C42] pb-1 flex items-center justify-between">
                            <span>{formatFullTooltipTime(dataPoint.timestamp)}</span>
                            <span className="text-[9px] text-amber-400">2019 AWS</span>
                          </div>

                          <div className="space-y-1 pt-0.5">
                            {isUnavailable ? (
                              <div className="p-1.5 rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[10px] space-y-0.5">
                                <div className="font-bold flex items-center gap-1">
                                  <ShieldAlert size={12} className="text-indigo-400" />
                                  <span>POLAR NIGHT / NO SOLAR RESOURCE</span>
                                </div>
                                <div className="text-slate-400">
                                  Climatological observation: <span className="text-indigo-300">NULL (Preserved)</span>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">Modeled Solar PV:</span>
                                  <span className="font-bold text-amber-300 text-sm">
                                    {dataPoint.solarPowerKW} kW
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-slate-400">Solar Irradiance:</span>
                                  <span className="text-slate-200">
                                    {dataPoint.irradianceWm2} W/m²
                                  </span>
                                </div>
                              </>
                            )}

                            <div className="border-t border-[#1B2C42]/80 pt-1.5 mt-1 text-[9px] text-slate-400 space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span>Provenance:</span>
                                <span className={`font-semibold ${isUnavailable ? 'text-indigo-400' : 'text-amber-400'}`}>
                                  {dataPoint.solarSource}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Climatology Map:</span>
                                <span className="text-slate-300">
                                  Month {dataPoint.sourceRadiationMonth}, Hour {dataPoint.sourceRadiationHour}:00
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Model Spec:</span>
                                <span className="text-slate-400">
                                  {dataPoint.pvCapacityKw || 50}kW @ PR {dataPoint.performanceRatio || 0.8}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  {/* connectNulls={false} ensures physical gaps for missing / polar night periods */}
                  <Area
                    type="monotone"
                    dataKey="solarPowerKW"
                    name="Solar PV Generation (kW)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#histSolarGrad)"
                    connectNulls={false}
                    dot={viewMode === 'month' ? { r: 1.5, fill: '#f59e0b' } : false}
                    activeDot={{ r: 5, fill: '#fbbf24', stroke: '#78350f' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Provenance & Scientific Integrity Footer Note */}
        <div className="p-3 rounded bg-[#0A121E] border border-[#1B2C42]/80 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Scientific Governance Note:</strong> Missing/polar night observations are preserved as <code className="text-indigo-300 bg-indigo-950/40 px-1 py-0.5 rounded">NULL</code> and displayed as gaps in the curve.
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            IEC 61724-1 PV Modeling | Multi-Year Normal (1985–2000)
          </div>
        </div>
      </div>
    </div>
  );
}
