'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { RenewableRecord, EnergyLoadRecord } from '@/lib/types';
import { LoadingSkeleton } from '@/components/common/Toast';
import {
  Sun,
  Wind,
  Zap,
  Leaf,
  Radio,
  RefreshCw,
  AlertTriangle,
  Database,
  Clock,
  Activity,
  Layers,
  Percent,
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
} from 'recharts';

export default function RenewablePage() {
  const { activeStationId, station, addToast } = useStation();

  const [currentRenewable, setCurrentRenewable] = useState<RenewableRecord | null>(null);
  const [currentEnergy, setCurrentEnergy] = useState<EnergyLoadRecord | null>(null);
  const [history, setHistory] = useState<RenewableRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'total' | 'sources' | 'solar' | 'wind'>('total');

  const fetchRenewableData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch live current renewable reading from PostgreSQL
      const current = await apiClient.getCurrentRenewable(activeStationId);
      setCurrentRenewable(current);

      // 2. Fetch current energy load (to deterministically compute renewable penetration if load exists)
      try {
        const energyLoad = await apiClient.getCurrentEnergy(activeStationId);
        setCurrentEnergy(energyLoad);
      } catch (e) {
        setCurrentEnergy(null);
      }

      // 3. Fetch historical records (up to 50 readings)
      const histData = await apiClient.getRenewableHistory(activeStationId, { limit: 50, page: 1 });
      const sortedHistory = [...(histData.records || [])].sort((a, b) => {
        const tA = new Date(a.timestamp || a.createdAt || 0).getTime();
        const tB = new Date(b.timestamp || b.createdAt || 0).getTime();
        return tA - tB;
      });
      setHistory(sortedHistory);
      setTotalRecords(histData.meta?.total || sortedHistory.length);
    } catch (err: any) {
      console.error(`Failed to fetch renewable telemetry for ${activeStationId}:`, err);
      setError(err.message || 'Unable to retrieve renewable generation telemetry from PostgreSQL backend');
    } finally {
      setLoading(false);
    }
  }, [activeStationId]);

  useEffect(() => {
    fetchRenewableData();
  }, [fetchRenewableData]);

  // Format chart timestamp
  const formatTimeLabel = (ts?: string | Date) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDateLabel = (ts?: string | Date) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`;
  };

  if (loading) {
    return (
      <div className="space-y-4 font-mono">
        <LoadingSkeleton className="h-20" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-28" />
          ))}
        </div>
        <LoadingSkeleton className="h-96" />
        <LoadingSkeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1B2C42]/50">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide uppercase flex items-center gap-2.5">
              <Leaf className="w-5 h-5 text-emerald-400" />
              Polar Renewable Energy Generation
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Solar PV & Wind Turbine Telemetry | {station?.name || activeStationId.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-rose-500/40 bg-[#160B12] p-8 text-center space-y-4 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto animate-pulse" />
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-rose-300 uppercase tracking-wider">
              PostgreSQL Renewable Telemetry Service Unavailable
            </h3>
            <p className="text-xs text-rose-200/80 max-w-lg mx-auto">{error}</p>
          </div>
          <div>
            <button
              onClick={fetchRenewableData}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs rounded uppercase font-bold transition-all inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Renewable Backend Connection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasData = currentRenewable !== null || history.length > 0;

  // Source mix percentages
  const totalGen = currentRenewable?.totalRenewable || (currentRenewable ? currentRenewable.solarPower + currentRenewable.windPower : 0) || 1;
  const solarPct = currentRenewable ? Math.round((currentRenewable.solarPower / totalGen) * 100) : 0;
  const windPct = currentRenewable ? Math.round((currentRenewable.windPower / totalGen) * 100) : 0;

  // Deterministic penetration calculation: totalRenewable / totalLoad * 100
  const canComputePenetration = currentRenewable != null && currentEnergy != null && currentEnergy.totalLoad > 0;
  const penetrationPercent = canComputePenetration
    ? Math.min(100, Math.round((currentRenewable.totalRenewable / currentEnergy.totalLoad) * 100))
    : null;

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1B2C42]/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide uppercase flex items-center gap-2.5">
            <Leaf className="w-5 h-5 text-emerald-400" />
            Polar Renewable Energy Generation
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time clean power harvesting, solar/wind telemetry & penetration metrics |{' '}
            <span className="text-cyan-300 font-semibold">{station?.name || activeStationId.toUpperCase()}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded bg-[#0A1828] border border-cyan-500/40 text-cyan-300">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>
              {hasData ? `${totalRecords} POSTGRESQL READINGS` : 'NO TELEMETRY RECORDED'}
            </span>
          </span>
          <button
            onClick={() => {
              fetchRenewableData();
              addToast({
                type: 'INFO',
                title: 'Renewable Telemetry Refreshed',
                message: `Loaded latest renewable telemetry for ${station?.name || activeStationId}.`,
              });
            }}
            title="Refresh Renewable Telemetry"
            className="p-1.5 rounded bg-[#101D2E] border border-[#1B2C42] hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!hasData ? (
        /* Empty State */
        <div className="rounded-lg border border-[#1B2C42] bg-[#0E1724]/90 p-8 text-center space-y-4">
          <Database className="w-10 h-10 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              No Renewable Generation Telemetry in PostgreSQL for {station?.name || activeStationId.toUpperCase()}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              The database currently contains zero solar or wind generation observations for this station node in the `renewable_generation` table.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={fetchRenewableData}
              className="px-3.5 py-1.5 bg-[#122032] hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs rounded uppercase font-bold transition-all inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Sensor Stream</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Live Renewable KPI Generation Cards */}
          {currentRenewable && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Current Renewable Generation Feed
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 tracking-wider">
                    POSTGRESQL TELEMETRY
                  </span>
                </div>
                {currentRenewable.timestamp && (
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-500" />
                    <span>Observed: {formatDateLabel(currentRenewable.timestamp)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
                {/* 1. Total Renewable */}
                <div className="p-3 rounded bg-[#0E1724]/90 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.1)]">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                    <span>TOTAL RENEWABLE</span>
                    <Leaf size={14} className="text-emerald-400" />
                  </div>
                  <div className="text-xl font-bold text-emerald-300">
                    {currentRenewable.totalRenewable} <span className="text-xs font-normal text-slate-400">kW</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    Solar + Wind <span className="text-[8px] text-emerald-400/80">(Measured)</span>
                  </div>
                </div>

                {/* 2. Solar PV Output */}
                <div className="p-3 rounded bg-[#0E1724]/90 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.08)]">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                    <span>SOLAR PV ARRAY</span>
                    <Sun size={14} className="text-amber-400" />
                  </div>
                  <div className="text-xl font-bold text-amber-300">
                    {currentRenewable.solarPower} <span className="text-xs font-normal text-slate-400">kW</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    {solarPct}% Mix <span className="text-[8px] text-amber-400/80">(Measured)</span>
                  </div>
                </div>

                {/* 3. Wind Turbine Output */}
                <div className="p-3 rounded bg-[#0E1724]/90 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.08)]">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                    <span>WIND TURBINES</span>
                    <Wind size={14} className="text-cyan-400" />
                  </div>
                  <div className="text-xl font-bold text-cyan-300">
                    {currentRenewable.windPower} <span className="text-xs font-normal text-slate-400">kW</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    {windPct}% Mix <span className="text-[8px] text-cyan-400/80">(Measured)</span>
                  </div>
                </div>

                {/* 4. Renewable Penetration */}
                <div className="p-3 rounded bg-[#0E1724]/90 border border-[#1B2C42]">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                    <span>PENETRATION</span>
                    <Percent size={14} className="text-teal-400" />
                  </div>
                  <div className="text-xl font-bold text-teal-300">
                    {penetrationPercent != null ? `${penetrationPercent}%` : 'N/A'}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    {canComputePenetration
                      ? `vs ${currentEnergy?.totalLoad} kW Load`
                      : 'Load telemetry required'}{' '}
                    <span className="text-[8px] text-teal-400/80">({canComputePenetration ? 'Derived' : 'Unavailable'})</span>
                  </div>
                </div>

                {/* 5. Clean Energy Status */}
                <div className="p-3 rounded bg-[#0E1724]/90 border border-[#1B2C42] col-span-2 sm:col-span-4 lg:col-span-1">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                    <span>MICROGRID STATUS</span>
                    <Zap size={14} className="text-cyan-400" />
                  </div>
                  <div className="text-base font-bold text-slate-200">
                    {currentRenewable.totalRenewable > 0 ? 'ACTIVE HARVEST' : 'STANDBY'}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    {currentRenewable.solarPower > 0 && currentRenewable.windPower > 0
                      ? 'Hybrid Solar+Wind'
                      : currentRenewable.solarPower > 0
                      ? 'Solar Primary'
                      : currentRenewable.windPower > 0
                      ? 'Wind Primary'
                      : 'Inverter Standby'}
                  </div>
                </div>
              </div>

              {/* Source Mix Proportion Bar */}
              <div className="p-3 rounded bg-[#0E1724]/90 border border-[#1B2C42]">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                  <span className="flex items-center gap-1.5 font-bold uppercase text-slate-200">
                    <Layers size={13} className="text-emerald-400" />
                    Renewable Generation Mix Share
                  </span>
                  <span>100% Clean Yield ({currentRenewable.totalRenewable} kW)</span>
                </div>
                <div className="h-3 w-full bg-[#0A121E] rounded-full overflow-hidden flex border border-[#1B2C42]/80">
                  <div style={{ width: `${solarPct}%` }} className="bg-amber-400 transition-all" title={`Solar PV: ${currentRenewable.solarPower} kW (${solarPct}%)`} />
                  <div style={{ width: `${windPct}%` }} className="bg-cyan-400 transition-all" title={`Wind: ${currentRenewable.windPower} kW (${windPct}%)`} />
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Solar PV Array: {currentRenewable.solarPower} kW ({solarPct}%)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Wind Turbines: {currentRenewable.windPower} kW ({windPct}%)</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Historical Renewable Generation Chart */}
          {history.length > 0 && (
            <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1B2C42]/60">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Historical Renewable Yield ({history.length} Data Points)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Chronological clean generation readings retrieved from PostgreSQL `renewable_generation`
                  </p>
                </div>

                {/* Metric Tab Selectors */}
                <div className="flex items-center gap-1.5 p-1 bg-[#0A121E] rounded border border-[#1B2C42] text-xs">
                  <button
                    onClick={() => setActiveTab('total')}
                    className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold transition-all ${
                      activeTab === 'total'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Total Renewable (kW)
                  </button>
                  <button
                    onClick={() => setActiveTab('sources')}
                    className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold transition-all ${
                      activeTab === 'sources'
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Solar vs Wind (Stacked)
                  </button>
                  <button
                    onClick={() => setActiveTab('solar')}
                    className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold transition-all ${
                      activeTab === 'solar'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Solar PV
                  </button>
                  <button
                    onClick={() => setActiveTab('wind')}
                    className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold transition-all ${
                      activeTab === 'wind'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Wind Turbine
                  </button>
                </div>
              </div>

              {/* Chart Visual */}
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {activeTab === 'total' ? (
                    <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="renGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatTimeLabel}
                        stroke="#64748b"
                        fontSize={10}
                      />
                      <YAxis stroke="#64748b" fontSize={10} unit=" kW" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0A121E',
                          borderColor: '#1B2C42',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                        }}
                        labelFormatter={(v) => formatDateLabel(v)}
                      />
                      <Area
                        type="monotone"
                        dataKey="totalRenewable"
                        name="Total Renewable (kW)"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#renGradient)"
                      />
                    </AreaChart>
                  ) : activeTab === 'sources' ? (
                    <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="solarArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="windArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatTimeLabel}
                        stroke="#64748b"
                        fontSize={10}
                      />
                      <YAxis stroke="#64748b" fontSize={10} unit=" kW" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0A121E',
                          borderColor: '#1B2C42',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                        }}
                        labelFormatter={(v) => formatDateLabel(v)}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Area
                        type="monotone"
                        dataKey="solarPower"
                        name="Solar PV (kW)"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        stackId="1"
                        fill="url(#solarArea)"
                      />
                      <Area
                        type="monotone"
                        dataKey="windPower"
                        name="Wind Turbines (kW)"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        stackId="1"
                        fill="url(#windArea)"
                      />
                    </AreaChart>
                  ) : activeTab === 'solar' ? (
                    <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="solarOnly" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatTimeLabel}
                        stroke="#64748b"
                        fontSize={10}
                      />
                      <YAxis stroke="#64748b" fontSize={10} unit=" kW" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0A121E',
                          borderColor: '#1B2C42',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                        }}
                        labelFormatter={(v) => formatDateLabel(v)}
                      />
                      <Area
                        type="monotone"
                        dataKey="solarPower"
                        name="Solar PV Array (kW)"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fill="url(#solarOnly)"
                      />
                    </AreaChart>
                  ) : (
                    <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="windOnly" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatTimeLabel}
                        stroke="#64748b"
                        fontSize={10}
                      />
                      <YAxis stroke="#64748b" fontSize={10} unit=" kW" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0A121E',
                          borderColor: '#1B2C42',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                        }}
                        labelFormatter={(v) => formatDateLabel(v)}
                      />
                      <Area
                        type="monotone"
                        dataKey="windPower"
                        name="Wind Turbine Fleet (kW)"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        fill="url(#windOnly)"
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 3. Tabular Log of Renewable Generation Records from PostgreSQL */}
          {history.length > 0 && (
            <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1B2C42]/50">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase">
                    PostgreSQL Renewable Generation Observations Log
                  </h3>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono tracking-wider">
                    TABLE: renewable_generation
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Displaying latest {history.length} records
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#0A121E] text-slate-400 uppercase text-[10px] border-b border-[#1B2C42]">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Total Renewable (kW)</th>
                      <th className="py-2.5 px-3">Solar PV (kW)</th>
                      <th className="py-2.5 px-3">Wind Power (kW)</th>
                      <th className="py-2.5 px-3">Mix Share</th>
                      <th className="py-2.5 px-3 text-right">Record ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1B2C42]/40 font-mono text-[11px]">
                    {[...history].reverse().map((record) => {
                      const tot = record.totalRenewable || (record.solarPower + record.windPower) || 1;
                      const sPct = Math.round((record.solarPower / tot) * 100);
                      const wPct = Math.round((record.windPower / tot) * 100);
                      return (
                        <tr key={record.id || String(record.timestamp)} className="hover:bg-[#122032]/50 transition-colors">
                          <td className="py-2 px-3 text-cyan-300 font-bold whitespace-nowrap">
                            {formatDateLabel(record.timestamp || record.createdAt)}
                          </td>
                          <td className="py-2 px-3 text-emerald-300 font-bold">{record.totalRenewable} kW</td>
                          <td className="py-2 px-3 text-amber-300">{record.solarPower} kW</td>
                          <td className="py-2 px-3 text-cyan-300">{record.windPower} kW</td>
                          <td className="py-2 px-3 text-slate-400">{sPct}% Solar / {wPct}% Wind</td>
                          <td className="py-2 px-3 text-right text-[9px] text-slate-500 font-mono truncate max-w-[120px]">
                            {record.id ? record.id.substring(0, 8) + '...' : 'PG-NODE'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
