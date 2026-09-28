'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { GeneratorRecord, GeneratorReadingRecord } from '@/lib/types';
import { LoadingSkeleton } from '@/components/common/Toast';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageHeader, GlassCard, Button } from '@/components/ui';
import { StationUnavailableState } from '@/components/common/StationUnavailableState';
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
      <div className="space-y-6">
        <LoadingSkeleton className="h-20 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Diesel Generators"
          description={`Thermal Microgrid Generation | ${station?.name || activeStationId.toUpperCase()}`}
          breadcrumbs={[
            { label: 'Operations', href: '/dashboard' },
            { label: 'Generators' },
          ]}
          badge={{ label: 'ERROR', variant: 'danger' }}
        />

        <GlassCard className="p-8 text-center space-y-4 border-rose-500/30 bg-rose-950/20">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto animate-pulse" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-rose-300">
              PostgreSQL Generator Fleet Service Unavailable
            </h3>
            <p className="text-xs text-rose-200/70 max-w-lg mx-auto">{error}</p>
          </div>
          <div>
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={fetchGeneratorsData}
            >
              Retry Generator Backend Connection
            </Button>
          </div>
        </GlassCard>
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
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Diesel Generators & Fleet SCADA"
        description={`Primary thermal power generation, fuel reserves, runtime hours & operational dispatch | ${station?.name || activeStationId.toUpperCase()}`}
        breadcrumbs={[
          { label: 'Operations', href: '/dashboard' },
          { label: 'Generators' },
        ]}
        badge={{
          label: `${generators.length} REGISTERED GENSETS`,
          variant: generators.length > 0 ? 'default' : 'neutral',
        }}
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() => {
              fetchGeneratorsData();
              addToast({
                type: 'INFO',
                title: 'Genset Telemetry Refreshed',
                message: `Loaded latest genset telemetry for ${station?.name || activeStationId}.`,
              });
            }}
          >
            Refresh
          </Button>
        }
      />

      {generators.length === 0 ? (
        /* Empty State */
        <StationUnavailableState
          title="Generator telemetry unavailable"
          subsystemName="generator fleet"
          description="No measured Bharati generator telemetry is currently available."
          stationName={station?.name || (activeStationId === 'bharati' ? 'Bharati Research Station' : 'Maitri Research Station')}
          icon={Fuel}
          provenanceType="UNAVAILABLE"
        />
      ) : (
        <>
          {/* 1. Fleet Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <GlassCard hover className="p-3.5 border-accent/30 bg-accent/5">
              <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                <span>TOTAL FLEET CAPACITY</span>
                <Zap size={14} className="text-accent" />
              </div>
              <div className="text-xl font-bold text-foreground font-mono">
                {totalCapacityKW} <span className="text-xs font-normal text-foreground-muted">kW</span>
              </div>
              <div className="text-[10px] text-foreground-muted mt-1">{generators.length} Installed Gensets (Nameplate)</div>
            </GlassCard>

            <GlassCard hover className="p-3.5 border-blue-500/20 bg-blue-500/[0.03]">
              <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                <span>ONLINE DISPATCH</span>
                <Activity size={14} className="text-blue-400" />
              </div>
              <div className="text-xl font-bold text-blue-300 font-mono">
                {totalRunningOutputKW} <span className="text-xs font-normal text-foreground-muted">kW</span>
              </div>
              <div className="text-[10px] text-foreground-muted mt-1">{runningUnits.length} of {generators.length} Running</div>
            </GlassCard>

            <GlassCard hover className="p-3.5 border-amber-500/20 bg-amber-500/[0.03]">
              <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                <span>AVERAGE FUEL LEVEL</span>
                <Fuel size={14} className="text-amber-400" />
              </div>
              <div className="text-xl font-bold text-amber-300 font-mono">
                {avgFuelLevel}%
              </div>
              <div className="text-[10px] text-foreground-muted mt-1">Diesel Day Tanks Storage</div>
            </GlassCard>

            <GlassCard hover className="p-3.5 border-purple-500/20 bg-purple-500/[0.03]">
              <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                <span>FLEET TOTAL RUNTIME</span>
                <Clock size={14} className="text-purple-400" />
              </div>
              <div className="text-xl font-bold text-purple-300 font-mono">
                {Math.round(totalRuntimeHours)} <span className="text-xs font-normal text-foreground-muted">hrs</span>
              </div>
              <div className="text-[10px] text-foreground-muted mt-1">Cumulative Operating Hours</div>
            </GlassCard>
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
                <GlassCard
                  key={gen.id}
                  className={`p-5 transition-all ${
                    isRunning ? 'border-accent/40 bg-accent/[0.04]' : ''
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-white/6">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{gen.name}</h3>
                        <StatusBadge
                          status={gen.status === 'RUNNING' ? 'RUNNING' : gen.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'STANDBY'}
                          label={gen.status}
                          size="sm"
                        />
                      </div>
                      <p className="text-xs text-foreground-muted mt-0.5">
                        Fuel: {gen.fuelType.toUpperCase()} | Min Stable: {gen.minimumOutput} kW | Efficiency: {gen.efficiency}%
                      </p>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-[10px] text-foreground-muted block uppercase">CAPACITY</span>
                      <span className="text-sm font-bold text-accent-bright">{gen.capacity} kW</span>
                    </div>
                  </div>

                  {/* Telemetry Grid */}
                  <div className="grid grid-cols-3 gap-2 my-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 font-mono">
                      <span className="text-[10px] text-foreground-muted block">LIVE OUTPUT</span>
                      <span className={`text-sm font-bold ${isRunning ? 'text-accent-bright' : 'text-foreground-muted'}`}>
                        {powerOut} kW
                      </span>
                      <span className="text-[10px] text-foreground-muted block">
                        {isRunning ? `${utilization}% Load` : 'Offline'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 font-mono">
                      <span className="text-[10px] text-foreground-muted block">FUEL LEVEL</span>
                      <span className={`text-sm font-bold ${gen.fuelLevel < 30 ? 'text-rose-400' : 'text-amber-300'}`}>
                        {gen.fuelLevel}%
                      </span>
                      <span className="text-[10px] text-foreground-muted block">Day Tank</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 font-mono">
                      <span className="text-[10px] text-foreground-muted block">TOTAL RUNTIME</span>
                      <span className="text-sm font-bold text-foreground">{gen.totalRuntime} hrs</span>
                      <span className="text-[10px] text-foreground-muted block">Logged Hours</span>
                    </div>
                  </div>

                  {/* Fuel Tank Level Bar */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center justify-between text-xs text-foreground-muted">
                      <span>Fuel Day-Tank Storage</span>
                      <span className={gen.fuelLevel < 30 ? 'text-rose-400 font-semibold' : 'text-foreground font-mono'}>
                        {gen.fuelLevel}% {gen.fuelLevel < 30 ? '(LOW FUEL ALERT)' : ''}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-white/[0.04] rounded-full overflow-hidden border border-white/5">
                      <div
                        style={{ width: `${gen.fuelLevel}%` }}
                        className={`h-full transition-all rounded-full ${
                          gen.fuelLevel < 30 ? 'bg-rose-500' : gen.fuelLevel < 60 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Telemetry Observation Info */}
                  {latestReading && (
                    <div className="text-[11px] text-foreground-muted flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/[0.02] border border-white/5 mb-3 font-mono">
                      <span>Last Reading: {latestReading.fuelConsumed} L/h @ {latestReading.efficiency}% Eff</span>
                      <span>{formatDateLabel(latestReading.timestamp)}</span>
                    </div>
                  )}

                  {/* Operational Control Dispatch Buttons */}
                  <div className="pt-2.5 border-t border-white/6 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[10px] text-foreground-muted font-semibold uppercase font-mono">SCADA DISPATCH:</span>

                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={isRunning || isBusy}
                        onClick={() => handleStatusChange(gen.id, gen.name, 'RUNNING')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium uppercase transition-all flex items-center gap-1 ${
                          isRunning
                            ? 'bg-accent/20 text-accent-bright border border-accent/40 cursor-default'
                            : 'bg-white/5 text-foreground-muted hover:bg-accent/20 hover:text-accent-bright border border-white/10'
                        }`}
                      >
                        <Play size={10} />
                        <span>START</span>
                      </button>

                      <button
                        disabled={gen.status === 'STOPPED' || isBusy}
                        onClick={() => handleStatusChange(gen.id, gen.name, 'STOPPED')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium uppercase transition-all flex items-center gap-1 ${
                          gen.status === 'STOPPED'
                            ? 'bg-white/5 text-foreground-muted border border-white/10 cursor-default'
                            : 'bg-white/5 text-foreground-muted hover:bg-rose-500/20 hover:text-rose-300 border border-white/10'
                        }`}
                      >
                        <Square size={10} />
                        <span>STOP</span>
                      </button>

                      <button
                        disabled={gen.status === 'MAINTENANCE' || isBusy}
                        onClick={() => handleStatusChange(gen.id, gen.name, 'MAINTENANCE')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium uppercase transition-all flex items-center gap-1 ${
                          gen.status === 'MAINTENANCE'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-default'
                            : 'bg-white/5 text-foreground-muted hover:bg-amber-500/20 hover:text-amber-300 border border-white/10'
                        }`}
                      >
                        <Wrench size={10} />
                        <span>MAINT</span>
                      </button>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>

          {/* 3. Tabular Log of Generators from PostgreSQL */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/6">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  PostgreSQL Generator Fleet Inventory
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent-bright font-mono">
                  TABLE: generators
                </span>
              </div>
              <span className="text-xs text-foreground-muted font-mono">{generators.length} Units Registered</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground-muted">
                <thead className="bg-white/[0.03] text-foreground-muted uppercase text-[10px] border-b border-white/6 font-mono">
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
                <tbody className="divide-y divide-white/4 font-mono text-xs">
                  {generators.map((gen) => (
                    <tr key={gen.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-2 px-3 text-foreground font-semibold whitespace-nowrap">{gen.name}</td>
                      <td className="py-2 px-3 text-accent-bright">{gen.capacity} kW</td>
                      <td className="py-2 px-3 text-foreground-muted">{gen.minimumOutput} kW</td>
                      <td className="py-2 px-3 text-emerald-400">{gen.efficiency}%</td>
                      <td className="py-2 px-3 text-amber-300">{gen.fuelLevel}%</td>
                      <td className="py-2 px-3 text-purple-300">{gen.totalRuntime} hrs</td>
                      <td className="py-2 px-3">
                        <StatusBadge
                          status={gen.status === 'RUNNING' ? 'RUNNING' : gen.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'STANDBY'}
                          label={gen.status}
                          size="sm"
                        />
                      </td>
                      <td className="py-2 px-3 text-right text-[10px] text-foreground-muted font-mono truncate max-w-[120px]">
                        {gen.id.substring(0, 8)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
