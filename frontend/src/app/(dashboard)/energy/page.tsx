'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { EnergyLoadRecord, CriticalLoadRecord } from '@/lib/types';
import { LoadingSkeleton } from '@/components/common/Toast';
import { CriticalLoads } from '@/components/dashboard/CriticalLoads';
import { PageHeader, GlassCard, Button } from '@/components/ui';
import {
  Zap,
  Flame,
  Droplet,
  Radio,
  FlaskConical,
  Snowflake,
  SlidersHorizontal,
  RefreshCw,
  AlertTriangle,
  Database,
  Clock,
  Activity,
  Layers,
  BarChart2,
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
import { ProvenanceBadge } from '@/components/common/ProvenanceBadge';
import { StationUnavailableState } from '@/components/common/StationUnavailableState';

export default function EnergyPage() {
  const { activeStationId, station, addToast } = useStation();

  const [currentEnergy, setCurrentEnergy] = useState<EnergyLoadRecord | null>(null);
  const [history, setHistory] = useState<EnergyLoadRecord[]>([]);
  const [criticalLoads, setCriticalLoads] = useState<CriticalLoadRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'total' | 'subsystems' | 'critical'>('total');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchEnergyData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch live current energy reading from PostgreSQL
      const current = await apiClient.getCurrentEnergy(activeStationId);
      setCurrentEnergy(current);

      // 2. Fetch historical records (up to 50 readings)
      const histData = await apiClient.getEnergyHistory(activeStationId, { limit: 50, page: 1 });
      const sortedHistory: EnergyLoadRecord[] = sortChronological(histData.records || [], (r) => r.timestamp || r.createdAt).map((r) => ({
        ...r,
        totalLoad: sanitizeNumeric(r.totalLoad, 0) ?? 0,
        heatingLoad: sanitizeNumeric(r.heatingLoad, 0) ?? 0,
        waterLoad: sanitizeNumeric(r.waterLoad, 0) ?? 0,
        laboratoryLoad: sanitizeNumeric(r.laboratoryLoad, 0) ?? 0,
        communicationLoad: sanitizeNumeric(r.communicationLoad, 0) ?? 0,
        refrigerationLoad: sanitizeNumeric(r.refrigerationLoad, 0) ?? 0,
        flexibleLoad: sanitizeNumeric(r.flexibleLoad, 0) ?? 0,
      }));
      setHistory(sortedHistory);
      setTotalRecords(histData.meta?.total || sortedHistory.length);

      // 3. Fetch real Critical Loads circuits from PostgreSQL
      const loads = await apiClient.getCriticalLoads(activeStationId);
      setCriticalLoads(loads);
    } catch (err: any) {
      console.error(`Failed to fetch energy telemetry for ${activeStationId}:`, err);
      setError(err.message || 'Unable to retrieve energy telemetry from PostgreSQL backend');
    } finally {
      setLoading(false);
    }
  }, [activeStationId]);

  useEffect(() => {
    fetchEnergyData();
  }, [fetchEnergyData]);

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
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
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
          title="Energy Operations"
          description={`Electrical Load Demand & SCADA Distribution | ${station?.name || activeStationId.toUpperCase()}`}
          breadcrumbs={[
            { label: 'Operations', href: '/dashboard' },
            { label: 'Energy' },
          ]}
          badge={{ label: 'ERROR', variant: 'danger' }}
        />

        <GlassCard className="p-8 text-center space-y-4 border-rose-500/30 bg-rose-950/20">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto animate-pulse" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-rose-300">
              PostgreSQL Energy Telemetry Service Unavailable
            </h3>
            <p className="text-xs text-rose-200/70 max-w-lg mx-auto">{error}</p>
          </div>
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchEnergyData}
              icon={RefreshCw}
            >
              Retry Energy Backend Connection
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  const hasData = currentEnergy !== null || history.length > 0;

  // Subsystem breakdown percentages
  const total = currentEnergy?.totalLoad || 1;
  const heatPct = currentEnergy ? Math.round((currentEnergy.heatingLoad / total) * 100) : 0;
  const waterPct = currentEnergy ? Math.round((currentEnergy.waterLoad / total) * 100) : 0;
  const labPct = currentEnergy ? Math.round((currentEnergy.laboratoryLoad / total) * 100) : 0;
  const commPct = currentEnergy ? Math.round((currentEnergy.communicationLoad / total) * 100) : 0;
  const refPct = currentEnergy ? Math.round((currentEnergy.refrigerationLoad / total) * 100) : 0;
  const flexPct = currentEnergy ? Math.round((currentEnergy.flexibleLoad / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Energy Operations"
        description={`Real-time electrical load balancing, sub-system vectors & SCADA telemetry | ${station?.name || activeStationId.toUpperCase()}`}
        breadcrumbs={[
          { label: 'Operations', href: '/dashboard' },
          { label: 'Energy' },
        ]}
        badge={{
          label: hasData ? `${totalRecords} TELEMETRY READINGS` : 'NO TELEMETRY',
          variant: hasData ? 'default' : 'neutral',
        }}
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() => {
              fetchEnergyData();
              addToast({
                type: 'INFO',
                title: 'Energy Telemetry Refreshed',
                message: `Loaded latest energy load telemetry for ${station?.name || activeStationId}.`,
              });
            }}
          >
            Refresh
          </Button>
        }
      />

      {!hasData ? (
        /* Empty State */
        <StationUnavailableState
          title="Electrical telemetry unavailable"
          subsystemName="electrical load"
          description="No measured Bharati electrical-load dataset is currently available."
          stationName={station?.name || (activeStationId === 'bharati' ? 'Bharati Research Station' : 'Maitri Research Station')}
          icon={Zap}
          provenanceType="UNAVAILABLE"
        />
      ) : (
        <>
          {/* 1. Live Energy KPI Sub-System Cards */}
          {currentEnergy && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Current Bus Load Breakdown
                  </span>
                  <ProvenanceBadge type="SCENARIO" label="SCENARIO / MODEL" size="xs" />
                </div>
                {currentEnergy.timestamp && (
                  <div className="text-[11px] text-foreground-muted flex items-center gap-1.5 font-mono">
                    <Clock size={12} className="text-foreground-muted" />
                    <span>Observed: {formatDateLabel(currentEnergy.timestamp)}</span>
                  </div>
                )}
              </div>

              {/* Data Provenance & Methodology Notice */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/6 text-xs text-foreground-muted flex items-start gap-3">
                <Database size={15} className="text-accent flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-foreground text-xs">
                    Load Telemetry Provenance:
                  </span>
                  <p className="leading-relaxed">
                    Historical measured electrical-load telemetry is not available for this station dataset. Current load profiles are modeled/scenario inputs used for optimization and resilience analysis.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
                {/* 1. Total Load */}
                <GlassCard hover className="p-3.5 border-accent/40 bg-accent/5">
                  <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                    <span>TOTAL LOAD</span>
                    <Zap size={14} className="text-accent" />
                  </div>
                  <div className="text-xl font-bold text-foreground font-mono">
                    {currentEnergy.totalLoad} <span className="text-xs font-normal text-foreground-muted">kW</span>
                  </div>
                  <div className="text-[10px] text-foreground-muted mt-1">Primary Demand</div>
                </GlassCard>

                {/* 2. Heating Load */}
                <GlassCard hover className="p-3.5 border-orange-500/20 bg-orange-500/[0.03]">
                  <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                    <span>HEATING</span>
                    <Flame size={14} className="text-orange-400" />
                  </div>
                  <div className="text-xl font-bold text-orange-300 font-mono">
                    {currentEnergy.heatingLoad} <span className="text-xs font-normal text-foreground-muted">kW</span>
                  </div>
                  <div className="text-[10px] text-foreground-muted mt-1">{heatPct}% of total</div>
                </GlassCard>

                {/* 3. Water / Snowmelt */}
                <GlassCard hover className="p-3.5 border-blue-500/20 bg-blue-500/[0.03]">
                  <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                    <span>WATER/MELT</span>
                    <Droplet size={14} className="text-blue-400" />
                  </div>
                  <div className="text-xl font-bold text-blue-300 font-mono">
                    {currentEnergy.waterLoad} <span className="text-xs font-normal text-foreground-muted">kW</span>
                  </div>
                  <div className="text-[10px] text-foreground-muted mt-1">{waterPct}% of total</div>
                </GlassCard>

                {/* 4. Laboratory Load */}
                <GlassCard hover className="p-3.5 border-emerald-500/20 bg-emerald-500/[0.03]">
                  <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                    <span>LABORATORY</span>
                    <FlaskConical size={14} className="text-emerald-400" />
                  </div>
                  <div className="text-xl font-bold text-emerald-300 font-mono">
                    {currentEnergy.laboratoryLoad} <span className="text-xs font-normal text-foreground-muted">kW</span>
                  </div>
                  <div className="text-[10px] text-foreground-muted mt-1">{labPct}% of total</div>
                </GlassCard>

                {/* 5. Life Support & Communications */}
                <GlassCard hover className="p-3.5 border-purple-500/20 bg-purple-500/[0.03]">
                  <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                    <span>COMMS/SCADA</span>
                    <Radio size={14} className="text-purple-400" />
                  </div>
                  <div className="text-xl font-bold text-purple-300 font-mono">
                    {currentEnergy.communicationLoad} <span className="text-xs font-normal text-foreground-muted">kW</span>
                  </div>
                  <div className="text-[10px] text-foreground-muted mt-1">{commPct}% of total</div>
                </GlassCard>

                {/* 6. Refrigeration */}
                <GlassCard hover className="p-3.5">
                  <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                    <span>REFRIGERATION</span>
                    <Snowflake size={14} className="text-foreground-muted" />
                  </div>
                  <div className="text-xl font-bold text-foreground font-mono">
                    {currentEnergy.refrigerationLoad} <span className="text-xs font-normal text-foreground-muted">kW</span>
                  </div>
                  <div className="text-[10px] text-foreground-muted mt-1">{refPct}% of total</div>
                </GlassCard>

                {/* 7. Flexible Load */}
                <GlassCard hover className="p-3.5 border-amber-500/20 bg-amber-500/[0.03]">
                  <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                    <span>FLEXIBLE LOAD</span>
                    <SlidersHorizontal size={14} className="text-amber-400" />
                  </div>
                  <div className="text-xl font-bold text-amber-300 font-mono">
                    {currentEnergy.flexibleLoad} <span className="text-xs font-normal text-foreground-muted">kW</span>
                  </div>
                  <div className="text-[10px] text-foreground-muted mt-1">{flexPct}% (Sheddable)</div>
                </GlassCard>
              </div>

              {/* Subsystem Distribution Bar */}
              <GlassCard className="p-4">
                <div className="flex items-center justify-between text-xs text-foreground-muted mb-2.5">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Layers size={14} className="text-accent" />
                    Load Vector Share
                  </span>
                  <span className="font-mono text-[11px]">100% Active Demand ({currentEnergy.totalLoad} kW)</span>
                </div>
                <div className="h-2.5 w-full bg-white/[0.04] rounded-full overflow-hidden flex border border-white/5">
                  <div style={{ width: `${heatPct}%` }} className="bg-orange-500 transition-all" title={`Heating: ${currentEnergy.heatingLoad} kW (${heatPct}%)`} />
                  <div style={{ width: `${waterPct}%` }} className="bg-blue-500 transition-all" title={`Water/Snowmelt: ${currentEnergy.waterLoad} kW (${waterPct}%)`} />
                  <div style={{ width: `${labPct}%` }} className="bg-emerald-500 transition-all" title={`Lab: ${currentEnergy.laboratoryLoad} kW (${labPct}%)`} />
                  <div style={{ width: `${commPct}%` }} className="bg-purple-500 transition-all" title={`Comms: ${currentEnergy.communicationLoad} kW (${commPct}%)`} />
                  <div style={{ width: `${refPct}%` }} className="bg-slate-400 transition-all" title={`Refrigeration: ${currentEnergy.refrigerationLoad} kW (${refPct}%)`} />
                  <div style={{ width: `${flexPct}%` }} className="bg-amber-400 transition-all" title={`Flexible: ${currentEnergy.flexibleLoad} kW (${flexPct}%)`} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-[11px] text-foreground-muted font-mono">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /> Heating ({heatPct}%)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Water ({waterPct}%)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Lab ({labPct}%)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> Comms ({commPct}%)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> Refrig ({refPct}%)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Flexible ({flexPct}%)</span>
                </div>
              </GlassCard>
            </div>
          )}

          {/* 2. Historical Energy Load Chart */}
          {history.length > 0 && (
            <GlassCard className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/6">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                      <Activity className="w-4 h-4 text-accent" />
                      Historical Load Profile ({history.length} Data Points)
                    </h3>
                    <ProvenanceBadge type="SCENARIO" label="SCENARIO / MODEL" size="xs" />
                  </div>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    Chronological microgrid demand readings retrieved from PostgreSQL `energy_loads`
                  </p>
                </div>

                {/* Tab Selectors */}
                <div className="flex items-center gap-1 p-1 bg-white/[0.04] rounded-lg border border-white/6 text-xs">
                  <button
                    onClick={() => setActiveTab('total')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      activeTab === 'total'
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    Total Demand
                  </button>
                  <button
                    onClick={() => setActiveTab('subsystems')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      activeTab === 'subsystems'
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    Subsystems
                  </button>
                  <button
                    onClick={() => setActiveTab('critical')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      activeTab === 'critical'
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    Critical vs Flexible
                  </button>
                </div>
              </div>

              {/* Telemetry Sufficiency Status */}
              <ChartTelemetryStatus
                inspection={inspectTelemetryData(history, (r) => r.timestamp || r.createdAt)}
                domainName="electrical load"
                className="mb-3"
              />

              <div className="h-72 w-full min-h-[280px]">
                {!isMounted ? (
                  <div className="w-full h-full bg-white/[0.02] rounded-xl animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {activeTab === 'total' ? (
                      <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="loadGradient" x1="0" y1="0" x2="0" y2="1">
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
                          dataKey="totalLoad"
                          name="Total Load (kW)"
                          stroke="#5E6AD2"
                          strokeWidth={2}
                          fill="url(#loadGradient)"
                          dot={{ r: 3, fill: '#5E6AD2' }}
                          activeDot={{ r: 5, fill: '#6872D9' }}
                        />
                      </AreaChart>
                    ) : activeTab === 'subsystems' ? (
                      <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                        <Line type="monotone" dataKey="heatingLoad" name="Heating" stroke="#f97316" strokeWidth={1.5} dot={{ r: 2.5 }} />
                        <Line type="monotone" dataKey="waterLoad" name="Water/Melt" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 2.5 }} />
                        <Line type="monotone" dataKey="laboratoryLoad" name="Laboratory" stroke="#10b981" strokeWidth={1.5} dot={{ r: 2.5 }} />
                        <Line type="monotone" dataKey="communicationLoad" name="Comms/SCADA" stroke="#a855f7" strokeWidth={1.5} dot={{ r: 2.5 }} />
                        <Line type="monotone" dataKey="refrigerationLoad" name="Refrig" stroke="#94a3b8" strokeWidth={1.5} dot={{ r: 2.5 }} />
                      </LineChart>
                    ) : (
                      <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                        <Line type="monotone" dataKey="totalLoad" name="Total Station Load" stroke="#5E6AD2" strokeWidth={2} dot={{ r: 3, fill: '#5E6AD2' }} />
                        <Line type="monotone" dataKey="flexibleLoad" name="Flexible (Sheddable)" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 2.5 }} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            </GlassCard>
          )}

          {/* 3. Real Critical Loads Priority & Sheddability Circuit Grid from PostgreSQL */}
          <CriticalLoads loads={criticalLoads} />

          {/* 4. Tabular Log of Energy Load Records from PostgreSQL */}
          {history.length > 0 && (
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/6">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    PostgreSQL Energy Load Observations Log
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent-bright font-mono">
                    TABLE: energy_loads
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
                      <th className="py-2.5 px-3">Total (kW)</th>
                      <th className="py-2.5 px-3">Heating (kW)</th>
                      <th className="py-2.5 px-3">Water (kW)</th>
                      <th className="py-2.5 px-3">Lab (kW)</th>
                      <th className="py-2.5 px-3">Comms (kW)</th>
                      <th className="py-2.5 px-3">Refrig (kW)</th>
                      <th className="py-2.5 px-3">Flexible (kW)</th>
                      <th className="py-2.5 px-3 text-right">Record ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/4 font-mono text-xs">
                    {[...history].reverse().map((record) => (
                      <tr key={record.id || String(record.timestamp)} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-2 px-3 text-accent-bright font-semibold whitespace-nowrap">
                          {formatDateLabel(record.timestamp || record.createdAt)}
                        </td>
                        <td className="py-2 px-3 text-foreground font-semibold">{record.totalLoad} kW</td>
                        <td className="py-2 px-3 text-orange-300">{record.heatingLoad}</td>
                        <td className="py-2 px-3 text-blue-300">{record.waterLoad}</td>
                        <td className="py-2 px-3 text-emerald-300">{record.laboratoryLoad}</td>
                        <td className="py-2 px-3 text-purple-300">{record.communicationLoad}</td>
                        <td className="py-2 px-3 text-foreground-muted">{record.refrigerationLoad}</td>
                        <td className="py-2 px-3 text-amber-300">{record.flexibleLoad}</td>
                        <td className="py-2 px-3 text-right text-[10px] text-foreground-muted font-mono truncate max-w-[120px]">
                          {record.id ? record.id.substring(0, 8) + '...' : 'PG-NODE'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}
