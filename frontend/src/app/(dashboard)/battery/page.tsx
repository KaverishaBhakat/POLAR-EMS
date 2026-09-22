'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { BatteryRecord, BatteryReadingRecord } from '@/lib/types';
import { LoadingSkeleton } from '@/components/common/Toast';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  BatteryCharging,
  Zap,
  ShieldCheck,
  Activity,
  Radio,
  RefreshCw,
  AlertTriangle,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  Clock,
  CheckCircle2,
  Gauge,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function BatteryPage() {
  const { activeStationId, station, addToast } = useStation();

  const [batteries, setBatteries] = useState<BatteryRecord[]>([]);
  const [selectedBatteryId, setSelectedBatteryId] = useState<string | null>(null);
  const [readings, setReadings] = useState<BatteryReadingRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [readingsLoading, setReadingsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBatteryData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getBatteries(activeStationId);
      setBatteries(data);
      if (data.length > 0) {
        setSelectedBatteryId((prev) => (prev && data.some((b) => b.id === prev) ? prev : data[0].id));
      } else {
        setSelectedBatteryId(null);
        setReadings([]);
      }
    } catch (err: any) {
      console.error(`Failed to fetch battery data for ${activeStationId}:`, err);
      setError(err.message || 'Unable to retrieve BESS containers from PostgreSQL backend');
    } finally {
      setLoading(false);
    }
  }, [activeStationId]);

  useEffect(() => {
    fetchBatteryData();
  }, [fetchBatteryData]);

  // Fetch readings when selected battery changes
  useEffect(() => {
    if (!selectedBatteryId) {
      setReadings([]);
      return;
    }

    let isMounted = true;
    setReadingsLoading(true);

    apiClient
      .getBatteryReadings(selectedBatteryId, { limit: 20 })
      .then((res) => {
        if (isMounted) {
          setReadings(res.records);
        }
      })
      .catch((err) => {
        console.error(`Failed to fetch readings for battery ${selectedBatteryId}:`, err);
      })
      .finally(() => {
        if (isMounted) {
          setReadingsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedBatteryId]);

  const selectedBattery = batteries.find((b) => b.id === selectedBatteryId) || batteries[0];

  // Derived metrics from actual database fields
  const totalCapacityKWh = batteries.reduce((acc, b) => acc + (b.capacity || 0), 0);
  const avgSOC =
    batteries.length > 0
      ? Math.round((batteries.reduce((acc, b) => acc + (b.currentSOC || 0), 0) / batteries.length) * 10) / 10
      : 0;
  const totalStoredKWh =
    batteries.length > 0
      ? Math.round(batteries.reduce((acc, b) => acc + ((b.currentSOC || 0) / 100) * (b.capacity || 0), 0))
      : 0;
  const activeBESSCount = batteries.filter((b) => b.status === 'ONLINE' || b.status === 'CHARGING' || b.status === 'DISCHARGING').length;

  // Selected battery specific metrics
  const latestReading = selectedBattery?.readings?.[0] || readings[0];
  const effectiveSOC = latestReading?.soc ?? selectedBattery?.currentSOC ?? 0;
  const chargeKW = latestReading?.chargePower ?? 0;
  const dischargeKW = latestReading?.dischargePower ?? 0;
  const netFlowKW = chargeKW > 0 ? chargeKW : dischargeKW > 0 ? -dischargeKW : 0;
  const usableCapacityKWh = selectedBattery
    ? Math.round((((selectedBattery.maximumSOC || 95) - (selectedBattery.minimumSOC || 20)) / 100) * selectedBattery.capacity)
    : 0;

  // Determine dynamic SOC color
  const getSocColor = (soc: number) => {
    if (soc < 30) return { text: 'text-rose-400', bg: 'bg-rose-500', border: 'border-rose-500/30', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.3)]' };
    if (soc < 50) return { text: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500/30', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]' };
    if (soc < 80) return { text: 'text-cyan-400', bg: 'bg-cyan-500', border: 'border-cyan-500/30', glow: 'shadow-[0_0_15px_rgba(6,182,212,0.3)]' };
    return { text: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]' };
  };

  const socColor = getSocColor(effectiveSOC);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0A111C] p-4 sm:p-6 rounded-lg border border-[#1B2C42] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase">
              BESS STORAGE
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Station: <strong className="text-slate-200">{station?.name || activeStationId.toUpperCase()}</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-slate-100 tracking-tight flex items-center gap-2.5">
            <BatteryCharging className="w-6 h-6 text-cyan-400" />
            Battery Energy Storage System (BESS)
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Lithium iron phosphate (LiFePO4) storage container telemetry, State of Charge (SOC), and dispatch constraints.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <button
            onClick={() => {
              fetchBatteryData();
              addToast({
                title: 'BESS Telemetry Refreshed',
                message: 'Synced with PostgreSQL database',
                type: 'INFO',
              });
            }}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-[#121E2E] hover:bg-[#1A2C42] border border-[#1B2C42] text-slate-300 hover:text-cyan-300 rounded font-mono text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center justify-between gap-3 text-rose-300 font-mono text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchBatteryData}
            className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded text-[11px] transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && <LoadingSkeleton className="h-48 w-full" />}

      {/* Empty State */}
      {!loading && !error && batteries.length === 0 && (
        <div className="bg-[#0B1524] border border-[#1B2C42] rounded-lg p-12 text-center font-mono space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#121E2E] border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
            <Database className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">No BESS Containers Configured</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No battery storage records were found in PostgreSQL for station{' '}
              <span className="text-cyan-300 font-semibold">{activeStationId.toUpperCase()}</span>.
            </p>
          </div>
        </div>
      )}

      {/* Fleet Summary Top KPI Grid */}
      {!loading && batteries.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Fleet Capacity */}
            <div className="bg-[#0B1524] border border-[#1B2C42] rounded-lg p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 font-mono text-xs">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  TOTAL BESS CAPACITY
                </span>
                <span className="text-[10px] text-cyan-400/80 uppercase">DB RECORD</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-100">{totalCapacityKWh}</span>
                <span className="text-xs font-mono text-slate-400">kWh</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-[#1B2C42]/50">
                <span>Total Stored:</span>
                <span className="text-cyan-300 font-bold">{totalStoredKWh} kWh</span>
              </div>
            </div>

            {/* KPI 2: Average SOC */}
            <div className="bg-[#0B1524] border border-[#1B2C42] rounded-lg p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 font-mono text-xs">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                  FLEET AVERAGE SOC
                </span>
                <span className="text-[10px] text-emerald-400 uppercase">TELEMETRY</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold font-mono ${socColor.text}`}>{avgSOC}%</span>
              </div>
              <div className="w-full bg-[#121E2E] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full ${socColor.bg} transition-all duration-500`}
                  style={{ width: `${Math.min(100, Math.max(0, avgSOC))}%` }}
                />
              </div>
            </div>

            {/* KPI 3: Power Flow */}
            <div className="bg-[#0B1524] border border-[#1B2C42] rounded-lg p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 font-mono text-xs">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  LIVE POWER FLOW
                </span>
                <span className="text-[10px] text-amber-400 uppercase">INVERTER</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-100">
                  {Math.abs(netFlowKW)}
                </span>
                <span className="text-xs font-mono text-slate-400">kW</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    netFlowKW > 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : netFlowKW < 0
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-700/50 text-slate-300 border border-slate-600/40'
                  }`}
                >
                  {netFlowKW > 0 ? 'CHARGING' : netFlowKW < 0 ? 'DISCHARGING' : 'IDLE'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-[#1B2C42]/50">
                <span>Charge / Discharge:</span>
                <span className="text-slate-200">
                  +{chargeKW} / -{dischargeKW} kW
                </span>
              </div>
            </div>

            {/* KPI 4: Active BESS Units */}
            <div className="bg-[#0B1524] border border-[#1B2C42] rounded-lg p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 font-mono text-xs">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  BESS CONTAINERS
                </span>
                <span className="text-[10px] text-slate-400 uppercase">ONLINE</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-cyan-400">{activeBESSCount}</span>
                <span className="text-xs font-mono text-slate-400">/ {batteries.length} Units</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-[#1B2C42]/50">
                <span>Chemistry:</span>
                <span className="text-slate-200 font-semibold">LiFePO4 (Sub-Zero Spec)</span>
              </div>
            </div>
          </div>

          {/* Main Grid: BESS Containers List + Detailed Telemetry / Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: BESS Containers Selector */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold font-mono text-slate-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  BESS CONTAINERS ({batteries.length})
                </h3>
              </div>

              <div className="space-y-3">
                {batteries.map((bat) => {
                  const isSelected = bat.id === selectedBatteryId;
                  const bSOC = bat.readings?.[0]?.soc ?? bat.currentSOC ?? 0;
                  const bColor = getSocColor(bSOC);

                  return (
                    <div
                      key={bat.id}
                      onClick={() => setSelectedBatteryId(bat.id)}
                      className={`cursor-pointer p-4 rounded-lg border transition-all duration-200 font-mono text-xs ${
                        isSelected
                          ? 'bg-[#121F30] border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                          : 'bg-[#0B1524] border-[#1B2C42] hover:bg-[#0F1B2B] hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-100">{bat.name}</span>
                        <StatusBadge
                          status={bat.status === 'ONLINE' || bat.status === 'CHARGING' || bat.status === 'DISCHARGING' ? 'RUNNING' : bat.status}
                          size="sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 my-2 text-[11px] text-slate-400">
                        <div>
                          <span>Rated Cap:</span>{' '}
                          <strong className="text-slate-200">{bat.capacity} kWh</strong>
                        </div>
                        <div>
                          <span>Inverter Max:</span>{' '}
                          <strong className="text-slate-200">{bat.maxChargePower} kW</strong>
                        </div>
                      </div>

                      {/* Mini SOC Bar */}
                      <div className="space-y-1 mt-2 pt-2 border-t border-[#1B2C42]/50">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">State of Charge (SOC)</span>
                          <span className={`font-bold ${bColor.text}`}>{bSOC}%</span>
                        </div>
                        <div className="w-full bg-[#16273B] rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${bColor.bg} transition-all duration-500`}
                            style={{ width: `${Math.min(100, Math.max(0, bSOC))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 2 cols: Selected BESS Deep Dive & Protection Envelopes */}
            {selectedBattery && (
              <div className="lg:col-span-2 space-y-6">
                {/* Visualizer Card */}
                <div className="bg-[#0B1524] border border-[#1B2C42] rounded-lg p-5 font-mono space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1B2C42] gap-2">
                    <div>
                      <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <BatteryCharging className="w-5 h-5 text-cyan-400" />
                        {selectedBattery.name}
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        ID: <span className="text-slate-300">{selectedBattery.id}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        status={
                          selectedBattery.status === 'ONLINE' || selectedBattery.status === 'CHARGING' || selectedBattery.status === 'DISCHARGING'
                            ? 'RUNNING'
                            : selectedBattery.status
                        }
                        size="md"
                      />
                    </div>
                  </div>

                  {/* Primary SOC Gauge & Big Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#070D16] p-4 rounded-lg border border-[#1B2C42]/70">
                    {/* SOC Big Gauge */}
                    <div className="text-center md:border-r border-[#1B2C42]/60 pr-0 md:pr-4 space-y-2 flex flex-col justify-center items-center">
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider">STATE OF CHARGE (SOC)</span>
                      <div className={`text-4xl sm:text-5xl font-extrabold ${socColor.text} ${socColor.glow}`}>
                        {effectiveSOC}%
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {Math.round(((effectiveSOC / 100) * selectedBattery.capacity) * 10) / 10} / {selectedBattery.capacity} kWh
                      </div>
                      <div className="w-full max-w-[180px] bg-[#121E2E] rounded-full h-2.5 overflow-hidden border border-[#1B2C42]">
                        <div
                          className={`h-full ${socColor.bg} transition-all duration-500`}
                          style={{ width: `${Math.min(100, Math.max(0, effectiveSOC))}%` }}
                        />
                      </div>
                    </div>

                    {/* Stored Energy & Inverter Throughput */}
                    <div className="space-y-3 flex flex-col justify-center px-0 md:px-2 md:border-r border-[#1B2C42]/60">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">USABLE ENERGY ENVELOPE</span>
                        <div className="text-lg font-bold text-slate-100 flex items-baseline gap-1">
                          {usableCapacityKWh} <span className="text-xs text-slate-400 font-normal">kWh</span>
                        </div>
                        <span className="text-[10px] text-cyan-400/80">
                          {selectedBattery.minimumSOC}% min &rarr; {selectedBattery.maximumSOC}% max
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">MAX DISCHARGE LIMIT</span>
                        <div className="text-lg font-bold text-slate-100 flex items-baseline gap-1">
                          {selectedBattery.maxDischargePower} <span className="text-xs text-slate-400 font-normal">kW</span>
                        </div>
                      </div>
                    </div>

                    {/* Inverter Flow State */}
                    <div className="space-y-3 flex flex-col justify-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">MAX CHARGE LIMIT</span>
                        <div className="text-lg font-bold text-slate-100 flex items-baseline gap-1">
                          {selectedBattery.maxChargePower} <span className="text-xs text-slate-400 font-normal">kW</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">OPERATIONAL STATE</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {netFlowKW > 0 ? (
                            <>
                              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                              <span className="text-xs font-bold text-emerald-300">Charging (+{chargeKW} kW)</span>
                            </>
                          ) : netFlowKW < 0 ? (
                            <>
                              <ArrowDownRight className="w-4 h-4 text-amber-400" />
                              <span className="text-xs font-bold text-amber-300">Discharging (-{dischargeKW} kW)</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 text-slate-400" />
                              <span className="text-xs font-bold text-slate-300">Standby / Float (0 kW)</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operational & Mathematical Dispatch Constraints (Clean DB Fields for Optimization) */}
                  <div className="bg-[#0A111C] p-4 rounded-lg border border-[#1B2C42] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                        SCADA DISPATCH CONSTRAINTS & BATTERY LIMITS
                      </span>
                      <span className="text-[10px] text-slate-400">PostgreSQL Schema Properties</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 rounded bg-[#121E2E]/60 border border-[#1B2C42]">
                        <span className="text-[10px] text-slate-400 block">Minimum SOC Limit</span>
                        <span className="text-sm font-bold text-rose-400">{selectedBattery.minimumSOC}%</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Deep Discharge Lock</span>
                      </div>
                      <div className="p-2.5 rounded bg-[#121E2E]/60 border border-[#1B2C42]">
                        <span className="text-[10px] text-slate-400 block">Maximum SOC Limit</span>
                        <span className="text-sm font-bold text-emerald-400">{selectedBattery.maximumSOC}%</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Overcharge Cutoff</span>
                      </div>
                      <div className="p-2.5 rounded bg-[#121E2E]/60 border border-[#1B2C42]">
                        <span className="text-[10px] text-slate-400 block">Max Charge Inverter</span>
                        <span className="text-sm font-bold text-cyan-300">{selectedBattery.maxChargePower} kW</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">C-Rate Safe Envelope</span>
                      </div>
                      <div className="p-2.5 rounded bg-[#121E2E]/60 border border-[#1B2C42]">
                        <span className="text-[10px] text-slate-400 block">Max Discharge Inverter</span>
                        <span className="text-sm font-bold text-amber-300">{selectedBattery.maxDischargePower} kW</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Peak Dispatch Limit</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Telemetry Reading History Table */}
                <div className="bg-[#0B1524] border border-[#1B2C42] rounded-lg p-5 font-mono space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      TELEMETRY READINGS LOG ({readings.length})
                    </h3>
                    <span className="text-[10px] text-slate-400">PostgreSQL: battery_readings</span>
                  </div>

                  {readingsLoading && <LoadingSkeleton className="h-28 w-full" />}

                  {!readingsLoading && readings.length === 0 && (
                    <div className="py-8 text-center border border-dashed border-[#1B2C42] rounded-lg text-slate-400 text-xs">
                      No historical telemetry readings found for this BESS container in PostgreSQL.
                    </div>
                  )}

                  {!readingsLoading && readings.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#1B2C42] text-[11px] text-slate-400 bg-[#070D16]">
                            <th className="p-2.5 font-semibold">Timestamp (UTC)</th>
                            <th className="p-2.5 font-semibold">State of Charge (SOC)</th>
                            <th className="p-2.5 font-semibold">Charge Power</th>
                            <th className="p-2.5 font-semibold">Discharge Power</th>
                            <th className="p-2.5 font-semibold">Net Flow</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1B2C42]/50">
                          {readings.map((r) => {
                            const net = (r.chargePower || 0) - (r.dischargePower || 0);
                            const rColor = getSocColor(r.soc);
                            return (
                              <tr key={r.id} className="hover:bg-[#121E2E]/40 transition-colors">
                                <td className="p-2.5 text-slate-300 font-mono">
                                  {new Date(r.timestamp).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: false,
                                  })}
                                </td>
                                <td className="p-2.5 font-bold">
                                  <span className={`px-1.5 py-0.5 rounded ${rColor.border} bg-[#0A111C] ${rColor.text}`}>
                                    {r.soc}%
                                  </span>
                                </td>
                                <td className="p-2.5 text-slate-200">{r.chargePower || 0} kW</td>
                                <td className="p-2.5 text-slate-200">{r.dischargePower || 0} kW</td>
                                <td className="p-2.5 font-semibold">
                                  {net > 0 ? (
                                    <span className="text-emerald-400">+{net} kW (Charge)</span>
                                  ) : net < 0 ? (
                                    <span className="text-amber-400">{net} kW (Discharge)</span>
                                  ) : (
                                    <span className="text-slate-400">0 kW (Idle)</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
