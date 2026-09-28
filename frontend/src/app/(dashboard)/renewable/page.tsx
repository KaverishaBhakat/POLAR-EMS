'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { RenewableRecord, EnergyLoadRecord } from '@/lib/types';
import { LoadingSkeleton } from '@/components/common/Toast';
import { PageHeader, GlassCard, Button } from '@/components/ui';
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
import { inspectTelemetryData, sanitizeNumeric, sortChronological } from '@/lib/utils/chartData';
import { ChartTelemetryStatus } from '@/components/charts/ChartTelemetryStatus';
import { HistoricalSolarChart } from '@/components/solar/HistoricalSolarChart';
import { ProvenanceBadge } from '@/components/common/ProvenanceBadge';

export default function RenewablePage() {
  const { activeStationId, station, addToast } = useStation();

  const [currentRenewable, setCurrentRenewable] = useState<RenewableRecord | null>(null);
  const [currentEnergy, setCurrentEnergy] = useState<EnergyLoadRecord | null>(null);
  const [history, setHistory] = useState<RenewableRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'total' | 'sources' | 'solar' | 'wind'>('total');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      const sortedHistory: RenewableRecord[] = sortChronological(histData.records || [], (r) => r.timestamp || r.createdAt).map((r) => ({
        ...r,
        totalRenewable: sanitizeNumeric(r.totalRenewable, 0) ?? 0,
        solarPower: sanitizeNumeric(r.solarPower, 0) ?? 0,
        windPower: sanitizeNumeric(r.windPower, 0) ?? 0,
      }));
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
      <div className="space-y-6">
        <LoadingSkeleton className="h-20 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <LoadingSkeleton className="h-96 rounded-2xl" />
        <LoadingSkeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Renewable Energy"
          description={`Solar PV & Wind Turbine Telemetry | ${station?.name || activeStationId.toUpperCase()}`}
          breadcrumbs={[
            { label: 'Operations', href: '/dashboard' },
            { label: 'Renewables' },
          ]}
          badge={{ label: 'ERROR', variant: 'danger' }}
        />

        <GlassCard className="p-8 text-center space-y-4 border-rose-500/30 bg-rose-950/20">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto animate-pulse" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-rose-300">
              PostgreSQL Renewable Telemetry Service Unavailable
            </h3>
            <p className="text-xs text-rose-200/70 max-w-lg mx-auto">{error}</p>
          </div>
          <div>
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={fetchRenewableData}
            >
              Retry Renewable Backend Connection
            </Button>
          </div>
        </GlassCard>
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
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Renewable Energy Generation"
        description={`Real-time clean power harvesting, solar/wind telemetry & penetration metrics | ${station?.name || activeStationId.toUpperCase()}`}
        breadcrumbs={[
          { label: 'Operations', href: '/dashboard' },
          { label: 'Renewables' },
        ]}
        badge={{
          label: hasData ? `${totalRecords} MEASURED READINGS` : 'NO TELEMETRY',
          variant: hasData ? 'success' : 'neutral',
        }}
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() => {
              fetchRenewableData();
              addToast({
                type: 'INFO',
                title: 'Renewable Telemetry Refreshed',
                message: `Loaded latest renewable telemetry for ${station?.name || activeStationId}.`,
              });
            }}
          >
            Refresh
          </Button>
        }
      />

      {!hasData ? (
        /* Empty State */
        <GlassCard className="p-10 text-center space-y-4">
          <Database className="w-10 h-10 text-foreground-muted mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              No Renewable Generation Telemetry in PostgreSQL for {station?.name || activeStationId.toUpperCase()}
            </h3>
            <p className="text-xs text-foreground-muted max-w-md mx-auto">
              The database currently contains zero solar or wind generation observations for this station node in the `renewable_generation` table.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={fetchRenewableData}
            >
              Refresh Sensor Stream
            </Button>
          </div>
        </GlassCard>
      ) : (
        <>
          {/* 1. Live Renewable KPI Generation Cards */}
          {currentRenewable && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Current Renewable Generation Feed
                  </span>
                  <ProvenanceBadge type="REAL_MEASURED" size="xs" />
                </div>
                {currentRenewable.timestamp && (
                  <div className="text-[11px] text-foreground-muted flex items-center gap-1.5 font-mono">
                    <Clock size={12} className="text-foreground-muted" />
                    <span>Observed: {formatDateLabel(currentRenewable.timestamp)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
                {/* 1. Total Renewable */}
                <GlassCard hover className="p-3.5 border-emerald-500/30 bg-emerald-500/5">
                  <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                    <span>TOTAL RENEWABLE</span>
                    <Leaf size={14} className="text-emerald-400" />
                  </div>
                  <div className="text-xl font-bold text-emerald-300 font-mono">
                    {currentRenewable.totalRenewable} <span className="text-xs font-normal text-foreground-muted">kW</span>
                  </div>
                  <div className="text-[10px] text-foreground-muted mt-1">
                    Solar + Wind <span className="text-[9px] text-emerald-400 font-semibold">(Measured)</span>
                  </div>
                </GlassCard>

                {/* 2. Solar PV Output */}
                <GlassCard hover className="p-3.5 border-amber-500/20 bg-amber-500/[0.03]">
                  <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                    <span>SOLAR PV ARRAY</span>
                    <Sun size={14} className="text-amber-400" />
                  </div>
                  <div className="text-xl font-bold text-amber-300 font-mono">
                    {currentRenewable.solarPower} <span className="text-xs font-normal text-foreground-muted">kW</span>
                  </div>
                  <div className="text-[10px] text-foreground-muted mt-1">
                    {solarPct}% Mix <span className="text-[9px] text-amber-400 font-semibold">(Measured)</span>
                  </div>
                </GlassCard>

                {/* 3. Wind Turbine Output */}
                <GlassCard hover className="p-3.5 border-blue-500/20 bg-blue-500/[0.03]">
                  <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                    <span>WIND TURBINES</span>
                    <Wind size={14} className="text-blue-400" />
                  </div>
                  <div className="text-xl font-bold text-blue-300 font-mono">
                    {currentRenewable.windPower} <span className="text-xs font-normal text-foreground-muted">kW</span>
                  </div>
                  <div className="text-[10px] text-foreground-muted mt-1">
                    {windPct}% Mix <span className="text-[9px] text-blue-400 font-semibold">(Measured)</span>
                  </div>
                </GlassCard>

                {/* 4. Renewable Penetration */}
                <GlassCard hover className="p-3.5 border-accent/30 bg-accent/5">
                  <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                    <span>PENETRATION</span>
                    <Percent size={14} className="text-accent-bright" />
                  </div>
                  <div className="text-xl font-bold text-accent-bright font-mono">
                    {penetrationPercent != null ? `${penetrationPercent}%` : 'N/A'}
                  </div>
                  <div className="text-[10px] text-foreground-muted mt-1">
                    {canComputePenetration
                      ? `vs ${currentEnergy?.totalLoad} kW Load`
                      : 'Load telemetry required'}{' '}
                    <span className="text-[9px] text-accent-bright font-semibold">({canComputePenetration ? 'Derived' : 'Unavailable'})</span>
                  </div>
                </GlassCard>

                {/* 5. Clean Energy Status */}
                <GlassCard hover className="p-3.5 col-span-2 sm:col-span-4 lg:col-span-1">
                  <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                    <span>MICROGRID STATUS</span>
                    <Zap size={14} className="text-accent" />
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {currentRenewable.totalRenewable > 0 ? 'ACTIVE HARVEST' : 'STANDBY'}
                  </div>
                  <div className="text-[10px] text-foreground-muted mt-1">
                    {currentRenewable.solarPower > 0 && currentRenewable.windPower > 0
                      ? 'Hybrid Solar+Wind'
                      : currentRenewable.solarPower > 0
                      ? 'Solar Primary'
                      : currentRenewable.windPower > 0
                      ? 'Wind Primary'
                      : 'Inverter Standby'}
                  </div>
                </GlassCard>
              </div>

              {/* Source Mix Proportion Bar */}
              <GlassCard className="p-4">
                <div className="flex items-center justify-between text-xs text-foreground-muted mb-2.5">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Layers size={14} className="text-emerald-400" />
                    Renewable Generation Mix Share
                  </span>
                  <span className="font-mono text-[11px]">100% Clean Yield ({currentRenewable.totalRenewable} kW)</span>
                </div>
                <div className="h-2.5 w-full bg-white/[0.04] rounded-full overflow-hidden flex border border-white/5">
                  <div style={{ width: `${solarPct}%` }} className="bg-amber-400 transition-all" title={`Solar PV: ${currentRenewable.solarPower} kW (${solarPct}%)`} />
                  <div style={{ width: `${windPct}%` }} className="bg-accent-bright transition-all" title={`Wind: ${currentRenewable.windPower} kW (${windPct}%)`} />
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 text-[11px] text-foreground-muted font-mono">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Solar PV Array: {currentRenewable.solarPower} kW ({solarPct}%)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent-bright" /> Wind Turbines: {currentRenewable.windPower} kW ({windPct}%)</span>
                </div>
              </GlassCard>
            </div>
          )}

          {/* 2. Historical Renewable Generation Chart */}
          {history.length > 0 && (
            <GlassCard className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/6">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      Historical Renewable Yield ({history.length} Data Points)
                    </h3>
                    <ProvenanceBadge type="REAL_MEASURED" size="xs" />
                  </div>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    Chronological clean generation readings retrieved from PostgreSQL `renewable_generation`
                  </p>
                </div>

                {/* Metric Tab Selectors */}
                <div className="flex items-center gap-1 p-1 bg-white/[0.04] rounded-lg border border-white/6 text-xs">
                  <button
                    onClick={() => setActiveTab('total')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      activeTab === 'total'
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    Total Renewable
                  </button>
                  <button
                    onClick={() => setActiveTab('sources')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      activeTab === 'sources'
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    Solar vs Wind
                  </button>
                  <button
                    onClick={() => setActiveTab('solar')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      activeTab === 'solar'
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    Solar PV
                  </button>
                  <button
                    onClick={() => setActiveTab('wind')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      activeTab === 'wind'
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    Wind Turbine
                  </button>
                </div>
              </div>

              {/* Telemetry Sufficiency Status */}
              <ChartTelemetryStatus
                inspection={inspectTelemetryData(history, (r) => r.timestamp || r.createdAt)}
                domainName="renewable generation"
                className="mb-3"
              />

              {/* Chart Visual */}
              <div className="h-72 w-full min-h-[280px]">
                {!isMounted ? (
                  <div className="w-full h-full bg-white/[0.02] rounded-xl animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {activeTab === 'total' ? (
                      <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="renGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={formatTimeLabel}
                          stroke="#8A8F98"
                          fontSize={10}
                        />
                        <YAxis stroke="#8A8F98" fontSize={10} unit=" kW" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0a0a0c',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
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
                          dot={{ r: 3, fill: '#10b981' }}
                          activeDot={{ r: 5, fill: '#34d399' }}
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
                            <stop offset="5%" stopColor="#5E6AD2" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#5E6AD2" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={formatTimeLabel}
                          stroke="#8A8F98"
                          fontSize={10}
                        />
                        <YAxis stroke="#8A8F98" fontSize={10} unit=" kW" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0a0a0c',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                          }}
                          labelFormatter={(v) => formatDateLabel(v)}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Area
                          type="monotone"
                          dataKey="solarPower"
                          name="Solar PV (kW)"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          stackId="1"
                          fill="url(#solarArea)"
                          dot={{ r: 3, fill: '#f59e0b' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="windPower"
                          name="Wind Turbines (kW)"
                          stroke="#5E6AD2"
                          strokeWidth={2}
                          stackId="1"
                          fill="url(#windArea)"
                          dot={{ r: 3, fill: '#5E6AD2' }}
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
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={formatTimeLabel}
                          stroke="#8A8F98"
                          fontSize={10}
                        />
                        <YAxis stroke="#8A8F98" fontSize={10} unit=" kW" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0a0a0c',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
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
                          dot={{ r: 3, fill: '#f59e0b' }}
                          activeDot={{ r: 5, fill: '#fbbf24' }}
                        />
                      </AreaChart>
                    ) : (
                      <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="windOnly" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#5E6AD2" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#5E6AD2" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={formatTimeLabel}
                          stroke="#8A8F98"
                          fontSize={10}
                        />
                        <YAxis stroke="#8A8F98" fontSize={10} unit=" kW" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0a0a0c',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                          }}
                          labelFormatter={(v) => formatDateLabel(v)}
                        />
                        <Area
                          type="monotone"
                          dataKey="windPower"
                          name="Wind Turbines (kW)"
                          stroke="#5E6AD2"
                          strokeWidth={2}
                          fill="url(#windOnly)"
                          dot={{ r: 3, fill: '#5E6AD2' }}
                          activeDot={{ r: 5, fill: '#6872D9' }}
                        />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            </GlassCard>
          )}

          {/* 3. Tabular Log of Renewable Generation Records from PostgreSQL */}
          {history.length > 0 && (
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/6">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    PostgreSQL Renewable Generation Observations Log
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                    TABLE: renewable_generation
                  </span>
                </div>
                <span className="text-xs text-foreground-muted font-mono">
                  Displaying latest {history.length} records
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground-muted">
                  <thead className="bg-white/[0.03] text-foreground-muted uppercase text-[10px] border-b border-white/6 font-mono">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Total Renewable (kW)</th>
                      <th className="py-2.5 px-3">Solar PV (kW)</th>
                      <th className="py-2.5 px-3">Wind Power (kW)</th>
                      <th className="py-2.5 px-3">Mix Share</th>
                      <th className="py-2.5 px-3 text-right">Record ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/4 font-mono text-xs">
                    {[...history].reverse().map((record) => {
                      const tot = record.totalRenewable || (record.solarPower + record.windPower) || 1;
                      const sPct = Math.round((record.solarPower / tot) * 100);
                      const wPct = Math.round((record.windPower / tot) * 100);
                      return (
                        <tr key={record.id || String(record.timestamp)} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-2 px-3 text-accent-bright font-semibold whitespace-nowrap">
                            {formatDateLabel(record.timestamp || record.createdAt)}
                          </td>
                          <td className="py-2 px-3 text-emerald-400 font-semibold">{record.totalRenewable} kW</td>
                          <td className="py-2 px-3 text-amber-300">{record.solarPower} kW</td>
                          <td className="py-2 px-3 text-accent-bright">{record.windPower} kW</td>
                          <td className="py-2 px-3 text-foreground-muted">{sPct}% Solar / {wPct}% Wind</td>
                          <td className="py-2 px-3 text-right text-[10px] text-foreground-muted font-mono truncate max-w-[120px]">
                            {record.id ? record.id.substring(0, 8) + '...' : 'PG-NODE'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </>
      )}

      {/* 4. Modeled Historical Solar Climatology Time Series */}
      <div className="pt-2">
        <HistoricalSolarChart
          stationId={activeStationId}
          stationName={station?.name}
        />
      </div>
    </div>
  );
}

