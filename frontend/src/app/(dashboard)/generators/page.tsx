'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { GeneratorRecord, GeneratorReadingRecord } from '@/lib/types';
import { LoadingSkeleton } from '@/components/common/Toast';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  Cpu,
  Zap,
  Fuel,
  Clock,
  Gauge,
  Activity,
  Radio,
  RefreshCw,
  AlertTriangle,
  Database,
  Power,
  Play,
  Square,
  Wrench,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function GeneratorsPage() {
  const { activeStationId, station, addToast } = useStation();

  const [generators, setGenerators] = useState<GeneratorRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchGeneratorsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getGenerators(activeStationId);
      setGenerators(data);
    } catch (err: any) {
      console.error(`Failed to fetch generators for ${activeStationId}:`, err);
      setError(err.message || 'Unable to retrieve generator fleet from PostgreSQL backend');
    } finally {
      setLoading(false);
    }
  }, [activeStationId]);

  useEffect(() => {
    fetchGeneratorsData();
  }, [fetchGeneratorsData]);

  const handleStatusChange = async (generatorId: string, generatorName: string, newStatus: string) => {
    setActionLoading(generatorId);
    try {
      await apiClient.updateGeneratorStatus(generatorId, newStatus);
      addToast({
        type: 'SUCCESS',
        title: 'Genset Status Updated',
        message: `${generatorName} set to ${newStatus}.`,
      });
      await fetchGeneratorsData();
    } catch (err: any) {
      addToast({
        type: 'ERROR',
        title: 'Status Update Failed',
        message: err.message || `Failed to switch ${generatorName} to ${newStatus}`,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDateLabel = (ts?: string | Date) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  };

  if (loading) {
    return (
      <div className="space-y-4 font-mono">
        <LoadingSkeleton className="h-20" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1B2C42]/50">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide uppercase flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-cyan-400" />
              Diesel Genset Fleet & SCADA
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Thermal Microgrid Generation | {station?.name || activeStationId.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-rose-500/40 bg-[#160B12] p-8 text-center space-y-4 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto animate-pulse" />
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-rose-300 uppercase tracking-wider">
              PostgreSQL Generator Fleet Service Unavailable
            </h3>
            <p className="text-xs text-rose-200/80 max-w-lg mx-auto">{error}</p>
          </div>
          <div>
            <button
              onClick={fetchGeneratorsData}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs rounded uppercase font-bold transition-all inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Generator Backend Connection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fleet Summary Calculations
  const totalCapacityKW = generators.reduce((acc, g) => acc + (g.capacity || 0), 0);
  const runningUnits = generators.filter((g) => g.status === 'RUNNING');
  const totalRunningOutputKW = runningUnits.reduce((acc, g) => {
    const latestReading = g.readings?.[0];
    return acc + (latestReading?.powerOutput || 0);
  }, 0);
  const avgFuelLevel = generators.length > 0
    ? Math.round(generators.reduce((acc, g) => acc + (g.fuelLevel || 0), 0) / generators.length)
    : 0;
  const totalRuntimeHours = generators.reduce((acc, g) => acc + (g.totalRuntime || 0), 0);

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1B2C42]/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide uppercase flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-cyan-400" />
            Polar Diesel Genset Fleet & SCADA
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Primary thermal power generation, fuel reserves, runtime hours & operational dispatch |{' '}
            <span className="text-cyan-300 font-semibold">{station?.name || activeStationId.toUpperCase()}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded bg-[#0A1828] border border-cyan-500/40 text-cyan-300">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>{generators.length} POSTGRESQL GENSETS</span>
          </span>
          <button
            onClick={() => {
              fetchGeneratorsData();
              addToast({
                type: 'INFO',
                title: 'Genset Telemetry Refreshed',
                message: `Loaded latest genset telemetry for ${station?.name || activeStationId}.`,
              });
            }}
            title="Refresh Generator Telemetry"
            className="p-1.5 rounded bg-[#101D2E] border border-[#1B2C42] hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {generators.length === 0 ? (
        /* Empty State */
        <div className="rounded-lg border border-[#1B2C42] bg-[#0E1724]/90 p-8 text-center space-y-4">
          <Database className="w-10 h-10 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              No Generator Units in PostgreSQL for {station?.name || activeStationId.toUpperCase()}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              The database currently contains zero generator records for this station node in the `generators` table.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={fetchGeneratorsData}
              className="px-3.5 py-1.5 bg-[#122032] hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs rounded uppercase font-bold transition-all inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Fleet</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Fleet Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded bg-[#0E1724]/90 border border-cyan-500/30">
              <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                <span>TOTAL FLEET CAPACITY</span>
                <Zap size={14} className="text-cyan-400" />
              </div>
              <div className="text-xl font-bold text-cyan-300">
                {totalCapacityKW} <span className="text-xs font-normal text-slate-400">kW</span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">{generators.length} Installed Gensets (Nameplate)</div>
            </div>

            <div className="p-3 rounded bg-[#0E1724]/90 border border-blue-500/30">
              <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                <span>ONLINE DISPATCH</span>
                <Activity size={14} className="text-blue-400" />
              </div>
              <div className="text-xl font-bold text-blue-300">
                {totalRunningOutputKW} <span className="text-xs font-normal text-slate-400">kW</span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">{runningUnits.length} of {generators.length} Running</div>
            </div>

            <div className="p-3 rounded bg-[#0E1724]/90 border border-amber-500/30">
              <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                <span>AVERAGE FUEL LEVEL</span>
                <Fuel size={14} className="text-amber-400" />
              </div>
              <div className="text-xl font-bold text-amber-300">
                {avgFuelLevel}%
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">Diesel Day Tanks Storage</div>
            </div>

            <div className="p-3 rounded bg-[#0E1724]/90 border border-[#1B2C42]">
              <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                <span>FLEET TOTAL RUNTIME</span>
                <Clock size={14} className="text-purple-400" />
              </div>
              <div className="text-xl font-bold text-purple-300">
                {Math.round(totalRuntimeHours)} <span className="text-xs font-normal text-slate-400">hrs</span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">Cumulative Operating Hours</div>
            </div>
          </div>

          {/* 2. Individual Generator Fleet Unit Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generators.map((gen) => {
              const latestReading = gen.readings?.[0];
              const isRunning = gen.status === 'RUNNING';
              const powerOut = isRunning ? (latestReading?.powerOutput || 0) : 0;
              const utilization = gen.capacity > 0 ? Math.round((powerOut / gen.capacity) * 100) : 0;
              const isBusy = actionLoading === gen.id;

              return (
                <div
                  key={gen.id}
                  className={`rounded-lg border p-5 transition-all ${
                    isRunning
                      ? 'bg-[#0E1B2C]/95 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.12)]'
                      : 'bg-[#0E1724]/90 border-[#1B2C42]'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3 pb-2.5 border-b border-[#1B2C42]/60">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white uppercase">{gen.name}</h3>
                        <StatusBadge
                          status={gen.status === 'RUNNING' ? 'RUNNING' : gen.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'STANDBY'}
                          label={gen.status}
                          size="sm"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Fuel: {gen.fuelType.toUpperCase()} | Min Stable: {gen.minimumOutput} kW | Efficiency: {gen.efficiency}%
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-mono">CAPACITY</span>
                      <span className="text-base font-bold text-cyan-300">{gen.capacity} kW</span>
                    </div>
                  </div>

                  {/* Telemetry Grid */}
                  <div className="grid grid-cols-3 gap-2 my-3 text-xs">
                    <div className="p-2 rounded bg-[#0A121E] border border-[#1B2C42]">
                      <span className="text-[9px] text-slate-400 block">LIVE OUTPUT</span>
                      <span className={`text-sm font-bold ${isRunning ? 'text-blue-300' : 'text-slate-500'}`}>
                        {powerOut} kW
                      </span>
                      <span className="text-[8px] text-slate-500 block">
                        {isRunning ? `${utilization}% Load` : 'Offline'}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-[#0A121E] border border-[#1B2C42]">
                      <span className="text-[9px] text-slate-400 block">FUEL LEVEL</span>
                      <span className={`text-sm font-bold ${gen.fuelLevel < 30 ? 'text-rose-400' : 'text-amber-300'}`}>
                        {gen.fuelLevel}%
                      </span>
                      <span className="text-[8px] text-slate-500 block">Day Tank</span>
                    </div>

                    <div className="p-2 rounded bg-[#0A121E] border border-[#1B2C42]">
                      <span className="text-[9px] text-slate-400 block">TOTAL RUNTIME</span>
                      <span className="text-sm font-bold text-slate-200">{gen.totalRuntime} hrs</span>
                      <span className="text-[8px] text-slate-500 block">Logged Hours</span>
                    </div>
                  </div>

                  {/* Fuel Tank Level Bar */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Fuel Day-Tank Storage</span>
                      <span className={gen.fuelLevel < 30 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        {gen.fuelLevel}% {gen.fuelLevel < 30 ? '(LOW FUEL ALERT)' : ''}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#0A121E] rounded-full overflow-hidden border border-[#1B2C42]">
                      <div
                        style={{ width: `${gen.fuelLevel}%` }}
                        className={`h-full transition-all ${
                          gen.fuelLevel < 30 ? 'bg-rose-500' : gen.fuelLevel < 60 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Telemetry Observation Info */}
                  {latestReading && (
                    <div className="text-[10px] text-slate-400 flex items-center justify-between py-1 px-2 rounded bg-[#0A121E]/60 border border-[#1B2C42]/40 mb-3">
                      <span>Last Reading: {latestReading.fuelConsumed} L/h @ {latestReading.efficiency}% Eff</span>
                      <span>{formatDateLabel(latestReading.timestamp)}</span>
                    </div>
                  )}

                  {/* Operational Control Dispatch Buttons */}
                  <div className="pt-2 border-t border-[#1B2C42]/50 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">SCADA DISPATCH:</span>

                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={isRunning || isBusy}
                        onClick={() => handleStatusChange(gen.id, gen.name, 'RUNNING')}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                          isRunning
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 cursor-default'
                            : 'bg-[#122032] text-slate-300 hover:bg-blue-500/20 hover:text-blue-300 border border-[#1B2C42]'
                        }`}
                      >
                        <Play size={10} />
                        <span>START</span>
                      </button>

                      <button
                        disabled={gen.status === 'STOPPED' || isBusy}
                        onClick={() => handleStatusChange(gen.id, gen.name, 'STOPPED')}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                          gen.status === 'STOPPED'
                            ? 'bg-slate-700/30 text-slate-400 border border-slate-600/40 cursor-default'
                            : 'bg-[#122032] text-slate-300 hover:bg-rose-500/20 hover:text-rose-300 border border-[#1B2C42]'
                        }`}
                      >
                        <Square size={10} />
                        <span>STOP</span>
                      </button>

                      <button
                        disabled={gen.status === 'MAINTENANCE' || isBusy}
                        onClick={() => handleStatusChange(gen.id, gen.name, 'MAINTENANCE')}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                          gen.status === 'MAINTENANCE'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-default'
                            : 'bg-[#122032] text-slate-300 hover:bg-amber-500/20 hover:text-amber-300 border border-[#1B2C42]'
                        }`}
                      >
                        <Wrench size={10} />
                        <span>MAINT</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3. Tabular Log of Generators from PostgreSQL */}
          <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1B2C42]/50">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase">
                  PostgreSQL Generator Fleet Inventory
                </h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono tracking-wider">
                  TABLE: generators
                </span>
              </div>
              <span className="text-[11px] text-slate-400">{generators.length} Units Registered</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0A121E] text-slate-400 uppercase text-[10px] border-b border-[#1B2C42]">
                  <tr>
                    <th className="py-2.5 px-3">Genset Unit Name</th>
                    <th className="py-2.5 px-3">Capacity</th>
                    <th className="py-2.5 px-3">Min Output</th>
                    <th className="py-2.5 px-3">Nominal Eff</th>
                    <th className="py-2.5 px-3">Fuel Level</th>
                    <th className="py-2.5 px-3">Total Runtime</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Database ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1B2C42]/40 font-mono text-[11px]">
                  {generators.map((gen) => (
                    <tr key={gen.id} className="hover:bg-[#122032]/50 transition-colors">
                      <td className="py-2 px-3 text-white font-bold whitespace-nowrap">{gen.name}</td>
                      <td className="py-2 px-3 text-cyan-300">{gen.capacity} kW</td>
                      <td className="py-2 px-3 text-slate-400">{gen.minimumOutput} kW</td>
                      <td className="py-2 px-3 text-emerald-300">{gen.efficiency}%</td>
                      <td className="py-2 px-3 text-amber-300">{gen.fuelLevel}%</td>
                      <td className="py-2 px-3 text-purple-300">{gen.totalRuntime} hrs</td>
                      <td className="py-2 px-3">
                        <StatusBadge
                          status={gen.status === 'RUNNING' ? 'RUNNING' : gen.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'STANDBY'}
                          label={gen.status}
                          size="sm"
                        />
                      </td>
                      <td className="py-2 px-3 text-right text-[9px] text-slate-500 font-mono truncate max-w-[120px]">
                        {gen.id.substring(0, 8)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
