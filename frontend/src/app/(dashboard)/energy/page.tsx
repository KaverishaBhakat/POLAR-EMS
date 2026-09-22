'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { EnergyLoadRecord } from '@/lib/types';
import { LoadingSkeleton } from '@/components/common/Toast';
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

export default function EnergyPage() {
  const { activeStationId, station, addToast } = useStation();

  const [currentEnergy, setCurrentEnergy] = useState<EnergyLoadRecord | null>(null);
  const [history, setHistory] = useState<EnergyLoadRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'total' | 'subsystems' | 'critical'>('total');

  const fetchEnergyData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch live current energy reading from PostgreSQL
      const current = await apiClient.getCurrentEnergy(activeStationId);
      setCurrentEnergy(current);

      // 2. Fetch historical records (up to 50 readings)
      const histData = await apiClient.getEnergyHistory(activeStationId, { limit: 50, page: 1 });
      const sortedHistory = [...(histData.records || [])].sort((a, b) => {
        const tA = new Date(a.timestamp || a.createdAt || 0).getTime();
        const tB = new Date(b.timestamp || b.createdAt || 0).getTime();
        return tA - tB;
      });
      setHistory(sortedHistory);
      setTotalRecords(histData.meta?.total || sortedHistory.length);
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
      <div className="space-y-4 font-mono">
        <LoadingSkeleton className="h-20" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
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
              <Zap className="w-5 h-5 text-cyan-400" />
              Polar Microgrid Energy Operations
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Electrical Load Demand & SCADA Distribution | {station?.name || activeStationId.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-rose-500/40 bg-[#160B12] p-8 text-center space-y-4 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto animate-pulse" />
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-rose-300 uppercase tracking-wider">
              PostgreSQL Energy Telemetry Service Unavailable
            </h3>
            <p className="text-xs text-rose-200/80 max-w-lg mx-auto">{error}</p>
          </div>
          <div>
            <button
              onClick={fetchEnergyData}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs rounded uppercase font-bold transition-all inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Energy Backend Connection</span>
            </button>
          </div>
        </div>
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
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1B2C42]/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide uppercase flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-cyan-400" />
            Polar Microgrid Energy Operations
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time electrical load balancing, sub-system consumption vectors & SCADA telemetry |{' '}
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
              fetchEnergyData();
              addToast({
                type: 'INFO',
                title: 'Energy Telemetry Refreshed',
                message: `Loaded latest energy load telemetry for ${station?.name || activeStationId}.`,
              });
            }}
            title="Refresh Energy Telemetry"
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
              No Energy Load Telemetry in PostgreSQL for {station?.name || activeStationId.toUpperCase()}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              The database currently contains zero energy demand observations for this station node in the `energy_loads` table.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={fetchEnergyData}
              className="px-3.5 py-1.5 bg-[#122032] hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs rounded uppercase font-bold transition-all inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Sensor Stream</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Live Energy KPI Sub-System Cards */}
          {currentEnergy && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Current SCADA Bus Load Breakdown
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 tracking-wider">
                    POSTGRESQL TELEMETRY
                  </span>
                </div>
                {currentEnergy.timestamp && (
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-500" />
                    <span>Observed: {formatDateLabel(currentEnergy.timestamp)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
                {/* 1. Total Load */}
                <div className="p-3 rounded bg-[#0E1724]/90 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.1)]">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                    <span>TOTAL LOAD</span>
                    <Zap size={14} className="text-cyan-400" />
                  </div>
                  <div className="text-xl font-bold text-cyan-300">
                    {currentEnergy.totalLoad} <span className="text-xs font-normal text-slate-400">kW</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Primary Demand</div>
                </div>

                {/* 2. Heating Load */}
                <div className="p-3 rounded bg-[#0E1724]/90 border border-orange-500/30">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                    <span>HEATING</span>
                    <Flame size={14} className="text-orange-400" />
                  </div>
                  <div className="text-xl font-bold text-orange-300">
                    {currentEnergy.heatingLoad} <span className="text-xs font-normal text-slate-400">kW</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{heatPct}% of total</div>
                </div>

                {/* 3. Water / Snowmelt */}
                <div className="p-3 rounded bg-[#0E1724]/90 border border-blue-500/30">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                    <span>WATER/MELT</span>
                    <Droplet size={14} className="text-blue-400" />
                  </div>
                  <div className="text-xl font-bold text-blue-300">
                    {currentEnergy.waterLoad} <span className="text-xs font-normal text-slate-400">kW</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{waterPct}% of total</div>
                </div>

                {/* 4. Laboratory Load */}
                <div className="p-3 rounded bg-[#0E1724]/90 border border-emerald-500/30">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                    <span>LABORATORY</span>
                    <FlaskConical size={14} className="text-emerald-400" />
                  </div>
                  <div className="text-xl font-bold text-emerald-300">
                    {currentEnergy.laboratoryLoad} <span className="text-xs font-normal text-slate-400">kW</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{labPct}% of total</div>
                </div>

                {/* 5. Life Support & Communications */}
                <div className="p-3 rounded bg-[#0E1724]/90 border border-purple-500/30">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                    <span>COMMS/SCADA</span>
                    <Radio size={14} className="text-purple-400" />
                  </div>
                  <div className="text-xl font-bold text-purple-300">
                    {currentEnergy.communicationLoad} <span className="text-xs font-normal text-slate-400">kW</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{commPct}% of total</div>
                </div>

                {/* 6. Refrigeration */}
                <div className="p-3 rounded bg-[#0E1724]/90 border border-[#1B2C42]">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                    <span>REFRIGERATION</span>
                    <Snowflake size={14} className="text-slate-300" />
                  </div>
                  <div className="text-xl font-bold text-slate-200">
                    {currentEnergy.refrigerationLoad} <span className="text-xs font-normal text-slate-400">kW</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{refPct}% of total</div>
                </div>

                {/* 7. Flexible Load */}
                <div className="p-3 rounded bg-[#0E1724]/90 border border-amber-500/30">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                    <span>FLEXIBLE LOAD</span>
                    <SlidersHorizontal size={14} className="text-amber-400" />
                  </div>
                  <div className="text-xl font-bold text-amber-300">
                    {currentEnergy.flexibleLoad} <span className="text-xs font-normal text-slate-400">kW</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{flexPct}% (Sheddable)</div>
                </div>
              </div>

              {/* Subsystem Distribution Bar */}
              <div className="p-3 rounded bg-[#0E1724]/90 border border-[#1B2C42]">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                  <span className="flex items-center gap-1.5 font-bold uppercase text-slate-200">
                    <Layers size={13} className="text-cyan-400" />
                    Load Vector Share
                  </span>
                  <span>100% Active Demand ({currentEnergy.totalLoad} kW)</span>
                </div>
                <div className="h-3 w-full bg-[#0A121E] rounded-full overflow-hidden flex border border-[#1B2C42]/80">
                  <div style={{ width: `${heatPct}%` }} className="bg-orange-500 transition-all" title={`Heating: ${currentEnergy.heatingLoad} kW (${heatPct}%)`} />
                  <div style={{ width: `${waterPct}%` }} className="bg-blue-500 transition-all" title={`Water/Snowmelt: ${currentEnergy.waterLoad} kW (${waterPct}%)`} />
                  <div style={{ width: `${labPct}%` }} className="bg-emerald-500 transition-all" title={`Lab: ${currentEnergy.laboratoryLoad} kW (${labPct}%)`} />
                  <div style={{ width: `${commPct}%` }} className="bg-purple-500 transition-all" title={`Comms: ${currentEnergy.communicationLoad} kW (${commPct}%)`} />
                  <div style={{ width: `${refPct}%` }} className="bg-slate-400 transition-all" title={`Refrigeration: ${currentEnergy.refrigerationLoad} kW (${refPct}%)`} />
                  <div style={{ width: `${flexPct}%` }} className="bg-amber-400 transition-all" title={`Flexible: ${currentEnergy.flexibleLoad} kW (${flexPct}%)`} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Heating ({heatPct}%)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Water ({waterPct}%)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Lab ({labPct}%)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Comms ({commPct}%)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> Refrig ({refPct}%)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Flexible ({flexPct}%)</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Historical Energy Load Chart */}
          {history.length > 0 && (
            <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1B2C42]/60">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Historical Load Profile ({history.length} Data Points)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Chronological microgrid demand readings retrieved from PostgreSQL `energy_loads`
                  </p>
                </div>

                {/* Tab Selectors */}
                <div className="flex items-center gap-1.5 p-1 bg-[#0A121E] rounded border border-[#1B2C42] text-xs">
                  <button
                    onClick={() => setActiveTab('total')}
                    className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold transition-all ${
                      activeTab === 'total'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Total Demand (kW)
                  </button>
                  <button
                    onClick={() => setActiveTab('subsystems')}
                    className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold transition-all ${
                      activeTab === 'subsystems'
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Subsystems Breakdown
                  </button>
                  <button
                    onClick={() => setActiveTab('critical')}
                    className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold transition-all ${
                      activeTab === 'critical'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Critical vs Flexible
                  </button>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {activeTab === 'total' ? (
                    <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="loadGradient" x1="0" y1="0" x2="0" y2="1">
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
                        dataKey="totalLoad"
                        name="Total Load (kW)"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        fill="url(#loadGradient)"
                      />
                    </AreaChart>
                  ) : activeTab === 'subsystems' ? (
                    <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      <Line type="monotone" dataKey="heatingLoad" name="Heating" stroke="#f97316" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="waterLoad" name="Water/Melt" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="laboratoryLoad" name="Laboratory" stroke="#10b981" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="communicationLoad" name="Comms/SCADA" stroke="#a855f7" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="refrigerationLoad" name="Refrig" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  ) : (
                    <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      <Line type="monotone" dataKey="totalLoad" name="Total Station Load" stroke="#06b6d4" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="flexibleLoad" name="Flexible (Sheddable)" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 3. Tabular Log of Energy Load Records from PostgreSQL */}
          {history.length > 0 && (
            <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1B2C42]/50">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase">
                    PostgreSQL Energy Load Observations Log
                  </h3>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono tracking-wider">
                    TABLE: energy_loads
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
                  <tbody className="divide-y divide-[#1B2C42]/40 font-mono text-[11px]">
                    {[...history].reverse().map((record) => (
                      <tr key={record.id || String(record.timestamp)} className="hover:bg-[#122032]/50 transition-colors">
                        <td className="py-2 px-3 text-cyan-300 font-bold whitespace-nowrap">
                          {formatDateLabel(record.timestamp || record.createdAt)}
                        </td>
                        <td className="py-2 px-3 text-white font-bold">{record.totalLoad} kW</td>
                        <td className="py-2 px-3 text-orange-300">{record.heatingLoad}</td>
                        <td className="py-2 px-3 text-blue-300">{record.waterLoad}</td>
                        <td className="py-2 px-3 text-emerald-300">{record.laboratoryLoad}</td>
                        <td className="py-2 px-3 text-purple-300">{record.communicationLoad}</td>
                        <td className="py-2 px-3 text-slate-300">{record.refrigerationLoad}</td>
                        <td className="py-2 px-3 text-amber-300">{record.flexibleLoad}</td>
                        <td className="py-2 px-3 text-right text-[9px] text-slate-500 font-mono truncate max-w-[120px]">
                          {record.id ? record.id.substring(0, 8) + '...' : 'PG-NODE'}
                        </td>
                      </tr>
                    ))}
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
