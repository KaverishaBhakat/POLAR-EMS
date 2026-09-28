'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { BatteryRecord, BatteryReadingRecord } from '@/lib/types';
import { LoadingSkeleton } from '@/components/common/Toast';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageHeader, GlassCard, Button } from '@/components/ui';
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
  TrendingUp,
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
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { inspectTelemetryData, sanitizeNumeric, sortChronological } from '@/lib/utils/chartData';
import { ChartTelemetryStatus } from '@/components/charts/ChartTelemetryStatus';

export default function BatteryPage() {
  const { activeStationId, station, addToast } = useStation();

  const [batteries, setBatteries] = useState<BatteryRecord[]>([]);
  const [selectedBatteryId, setSelectedBatteryId] = useState<string | null>(null);
  const [readings, setReadings] = useState<BatteryReadingRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [readingsLoading, setReadingsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      .getBatteryReadings(selectedBatteryId, { limit: 50 })
      .then((res) => {
        if (isMounted) {
          const sorted: BatteryReadingRecord[] = sortChronological(res.records || [], (r) => r.timestamp || r.createdAt).map((r) => ({
            ...r,
            soc: sanitizeNumeric(r.soc, 0) ?? 0,
            chargePower: sanitizeNumeric(r.chargePower, 0) ?? 0,
            dischargePower: sanitizeNumeric(r.dischargePower, 0) ?? 0,
          }));
          setReadings(sorted);
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
    if (soc < 30) return { text: 'text-rose-400', bg: 'bg-rose-500', border: 'border-rose-500/30' };
    if (soc < 50) return { text: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500/30' };
    if (soc < 80) return { text: 'text-accent-bright', bg: 'bg-accent', border: 'border-accent/30' };
    return { text: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30' };
  };

  const socColor = getSocColor(effectiveSOC);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-20 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <LoadingSkeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Battery Storage (BESS)"
          description={`BESS Telemetry | ${station?.name || activeStationId.toUpperCase()}`}
          breadcrumbs={[
            { label: 'Operations', href: '/dashboard' },
            { label: 'Battery' },
          ]}
          badge={{ label: 'ERROR', variant: 'danger' }}
        />

        <GlassCard className="p-8 text-center space-y-4 border-rose-500/30 bg-rose-950/20">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto animate-pulse" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-rose-300">
              PostgreSQL Battery Telemetry Service Unavailable
            </h3>
            <p className="text-xs text-rose-200/70 max-w-lg mx-auto">{error}</p>
          </div>
          <div>
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={fetchBatteryData}
            >
              Retry Battery Connection
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Battery Energy Storage System (BESS)"
        description={`Lithium iron phosphate (LiFePO4) storage container telemetry, State of Charge (SOC), and dispatch envelopes | ${station?.name || activeStationId.toUpperCase()}`}
        breadcrumbs={[
          { label: 'Operations', href: '/dashboard' },
          { label: 'Battery' },
        ]}
        badge={{
          label: `${batteries.length} BESS CONTAINERS`,
          variant: batteries.length > 0 ? 'default' : 'neutral',
        }}
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() => {
              fetchBatteryData();
              addToast({
                title: 'BESS Telemetry Refreshed',
                message: 'Synced with PostgreSQL database',
                type: 'INFO',
              });
            }}
          >
            Refresh
          </Button>
        }
      />

      {/* Empty State */}
      {batteries.length === 0 ? (
        <GlassCard className="p-10 text-center space-y-4">
          <Database className="w-10 h-10 text-foreground-muted mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">No BESS Containers Configured</h3>
            <p className="text-xs text-foreground-muted max-w-md mx-auto">
              No battery storage records were found in PostgreSQL for station{' '}
              <span className="text-accent font-semibold">{activeStationId.toUpperCase()}</span>.
            </p>
          </div>
        </GlassCard>
      ) : (
        <>
          {/* Fleet Summary Top KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Fleet Capacity */}
            <GlassCard hover className="p-4 space-y-2">
              <div className="flex items-center justify-between text-foreground-muted text-xs font-mono uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-accent" />
                  TOTAL BESS CAPACITY
                </span>
                <span className="text-[10px] text-accent-bright">DB RECORD</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-foreground">{totalCapacityKWh}</span>
                <span className="text-xs font-mono text-foreground-muted">kWh</span>
              </div>
              <div className="text-[11px] font-mono text-foreground-muted flex items-center justify-between pt-1 border-t border-white/6">
                <span>Total Stored:</span>
                <span className="text-accent-bright font-semibold">{totalStoredKWh} kWh</span>
              </div>
            </GlassCard>

            {/* KPI 2: Average SOC */}
            <GlassCard hover className="p-4 space-y-2">
              <div className="flex items-center justify-between text-foreground-muted text-xs font-mono uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                  FLEET AVERAGE SOC
                </span>
                <span className="text-[10px] text-emerald-400">TELEMETRY</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold font-mono ${socColor.text}`}>{avgSOC}%</span>
              </div>
              <div className="w-full bg-white/[0.04] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full ${socColor.bg} transition-all duration-500 rounded-full`}
                  style={{ width: `${Math.min(100, Math.max(0, avgSOC))}%` }}
                />
              </div>
            </GlassCard>

            {/* KPI 3: Power Flow */}
            <GlassCard hover className="p-4 space-y-2">
              <div className="flex items-center justify-between text-foreground-muted text-xs font-mono uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  LIVE POWER FLOW
                </span>
                <span className="text-[10px] text-amber-400">INVERTER</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-foreground">
                  {Math.abs(netFlowKW)}
                </span>
                <span className="text-xs font-mono text-foreground-muted">kW</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                    netFlowKW > 0
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : netFlowKW < 0
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      : 'bg-white/5 text-foreground-muted border border-white/10'
                  }`}
                >
                  {netFlowKW > 0 ? 'CHARGING' : netFlowKW < 0 ? 'DISCHARGING' : 'IDLE'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-foreground-muted flex items-center justify-between pt-1 border-t border-white/6">
                <span>Charge / Discharge:</span>
                <span className="text-foreground">
                  +{chargeKW} / -{dischargeKW} kW
                </span>
              </div>
            </GlassCard>

            {/* KPI 4: Active BESS Units */}
            <GlassCard hover className="p-4 space-y-2">
              <div className="flex items-center justify-between text-foreground-muted text-xs font-mono uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                  BESS CONTAINERS
                </span>
                <span className="text-[10px] text-foreground-muted">ONLINE</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-accent-bright">{activeBESSCount}</span>
                <span className="text-xs font-mono text-foreground-muted">/ {batteries.length} Units</span>
              </div>
              <div className="text-[11px] font-mono text-foreground-muted flex items-center justify-between pt-1 border-t border-white/6">
                <span>Chemistry:</span>
                <span className="text-foreground font-semibold">LiFePO4 (Sub-Zero Spec)</span>
              </div>
            </GlassCard>
          </div>

          {/* Main Grid: BESS Containers List + Detailed Telemetry / Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: BESS Containers Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-accent" />
                  BESS CONTAINERS ({batteries.length})
                </h3>
              </div>

              <div className="space-y-2.5">
                {batteries.map((bat) => {
                  const isSelected = bat.id === selectedBatteryId;
                  const bSOC = bat.readings?.[0]?.soc ?? bat.currentSOC ?? 0;
                  const bColor = getSocColor(bSOC);

                  return (
                    <GlassCard
                      key={bat.id}
                      hover
                      onClick={() => setSelectedBatteryId(bat.id)}
                      className={`cursor-pointer p-4 transition-all duration-200 ${
                        isSelected
                          ? 'border-accent/50 bg-accent/[0.06]'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-foreground text-xs">{bat.name}</span>
                        <StatusBadge
                          status={bat.status === 'ONLINE' || bat.status === 'CHARGING' || bat.status === 'DISCHARGING' ? 'RUNNING' : bat.status}
                          size="sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 my-2 text-[11px] text-foreground-muted font-mono">
                        <div>
                          <span>Rated:</span>{' '}
                          <strong className="text-foreground">{bat.capacity} kWh</strong>
                        </div>
                        <div>
                          <span>Max Inverter:</span>{' '}
                          <strong className="text-foreground">{bat.maxChargePower} kW</strong>
                        </div>
                      </div>

                      {/* Mini SOC Bar */}
                      <div className="space-y-1 mt-2 pt-2 border-t border-white/6 font-mono">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-foreground-muted">State of Charge (SOC)</span>
                          <span className={`font-bold ${bColor.text}`}>{bSOC}%</span>
                        </div>
                        <div className="w-full bg-white/[0.04] rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${bColor.bg} transition-all duration-500 rounded-full`}
                            style={{ width: `${Math.min(100, Math.max(0, bSOC))}%` }}
                          />
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </div>

            {/* Right 2 cols: Selected BESS Deep Dive & Protection Envelopes */}
            {selectedBattery && (
              <div className="lg:col-span-2 space-y-6">
                {/* Visualizer Card */}
                <GlassCard className="p-5 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/6 gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <BatteryCharging className="w-5 h-5 text-accent" />
                        {selectedBattery.name}
                      </h2>
                      <p className="text-xs text-foreground-muted font-mono mt-0.5">
                        ID: <span className="text-foreground">{selectedBattery.id}</span>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/[0.02] p-4 rounded-xl border border-white/5 font-mono">
                    {/* SOC Big Gauge */}
                    <div className="text-center md:border-r border-white/6 pr-0 md:pr-4 space-y-2 flex flex-col justify-center items-center">
                      <span className="text-[10px] text-foreground-muted uppercase tracking-wider">STATE OF CHARGE (SOC)</span>
                      <div className={`text-4xl sm:text-5xl font-extrabold ${socColor.text}`}>
                        {effectiveSOC}%
                      </div>
                      <div className="text-[10px] text-foreground-muted">
                        {Math.round(((effectiveSOC / 100) * selectedBattery.capacity) * 10) / 10} / {selectedBattery.capacity} kWh
                      </div>
                      <div className="w-full max-w-[180px] bg-white/[0.04] rounded-full h-2 overflow-hidden border border-white/5">
                        <div
                          className={`h-full ${socColor.bg} transition-all duration-500 rounded-full`}
                          style={{ width: `${Math.min(100, Math.max(0, effectiveSOC))}%` }}
                        />
                      </div>
                    </div>

                    {/* Stored Energy & Inverter Throughput */}
                    <div className="space-y-3 flex flex-col justify-center px-0 md:px-2 md:border-r border-white/6">
                      <div>
                        <span className="text-[10px] text-foreground-muted block uppercase">USABLE ENERGY ENVELOPE</span>
                        <div className="text-base font-bold text-foreground flex items-baseline gap-1">
                          {usableCapacityKWh} <span className="text-xs text-foreground-muted font-normal">kWh</span>
                        </div>
                        <span className="text-[10px] text-accent-bright">
                          {selectedBattery.minimumSOC}% min &rarr; {selectedBattery.maximumSOC}% max
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-foreground-muted block uppercase">MAX DISCHARGE LIMIT</span>
                        <div className="text-base font-bold text-foreground flex items-baseline gap-1">
                          {selectedBattery.maxDischargePower} <span className="text-xs text-foreground-muted font-normal">kW</span>
                        </div>
                      </div>
                    </div>

                    {/* Inverter Flow State */}
                    <div className="space-y-3 flex flex-col justify-center">
                      <div>
                        <span className="text-[10px] text-foreground-muted block uppercase">MAX CHARGE LIMIT</span>
                        <div className="text-base font-bold text-foreground flex items-baseline gap-1">
                          {selectedBattery.maxChargePower} <span className="text-xs text-foreground-muted font-normal">kW</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-foreground-muted block uppercase">OPERATIONAL STATE</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {netFlowKW > 0 ? (
                            <>
                              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                              <span className="text-xs font-semibold text-emerald-300">Charging (+{chargeKW} kW)</span>
                            </>
                          ) : netFlowKW < 0 ? (
                            <>
                              <ArrowDownRight className="w-4 h-4 text-amber-400" />
                              <span className="text-xs font-semibold text-amber-300">Discharging (-{dischargeKW} kW)</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 text-foreground-muted" />
                              <span className="text-xs font-semibold text-foreground-muted">Standby / Float (0 kW)</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operational & Mathematical Dispatch Constraints */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-accent" />
                        SCADA DISPATCH CONSTRAINTS & BATTERY LIMITS
                      </span>
                      <span className="text-[10px] text-foreground-muted font-mono">PostgreSQL Schema Properties</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] text-foreground-muted block">Minimum SOC Limit</span>
                        <span className="text-sm font-bold text-rose-400">{selectedBattery.minimumSOC}%</span>
                        <span className="text-[9px] text-foreground-muted block mt-0.5">Deep Discharge Lock</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] text-foreground-muted block">Maximum SOC Limit</span>
                        <span className="text-sm font-bold text-emerald-400">{selectedBattery.maximumSOC}%</span>
                        <span className="text-[9px] text-foreground-muted block mt-0.5">Overcharge Cutoff</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] text-foreground-muted block">Max Charge Inverter</span>
                        <span className="text-sm font-bold text-accent-bright">{selectedBattery.maxChargePower} kW</span>
                        <span className="text-[9px] text-foreground-muted block mt-0.5">C-Rate Safe Envelope</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] text-foreground-muted block">Max Discharge Inverter</span>
                        <span className="text-sm font-bold text-amber-300">{selectedBattery.maxDischargePower} kW</span>
                        <span className="text-[9px] text-foreground-muted block mt-0.5">Peak Dispatch Limit</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* BESS State of Charge & Power Flow Chart */}
                {readings.length > 0 && (
                  <GlassCard className="p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-white/6">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-accent" />
                          BESS SOC Trajectory &amp; Power Flow
                        </h3>
                        <p className="text-xs text-foreground-muted mt-0.5">
                          Chronological telemetry readings for {selectedBattery.name} from PostgreSQL
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent-bright border border-accent/20 font-mono">
                        {readings.length} READINGS
                      </span>
                    </div>

                    {/* Telemetry Sufficiency Status */}
                    <ChartTelemetryStatus
                      inspection={inspectTelemetryData(readings, (r) => r.timestamp || r.createdAt)}
                      domainName="battery BESS"
                    />

                    <div className="h-64 w-full min-h-[260px]">
                      {!isMounted ? (
                        <div className="w-full h-full bg-white/[0.02] rounded-xl animate-pulse" />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={readings.map((r) => ({
                              time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
                              soc: r.soc,
                              chargePower: r.chargePower || 0,
                              dischargePower: r.dischargePower || 0,
                              netFlow: (r.chargePower || 0) - (r.dischargePower || 0),
                            }))}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="bessSocGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#5E6AD2" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#5E6AD2" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="time" stroke="#8A8F98" fontSize={10} />
                            <YAxis domain={[0, 100]} stroke="#8A8F98" fontSize={10} unit="%" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#0a0a0c',
                                borderColor: 'rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                              }}
                            />
                            <ReferenceLine
                              y={selectedBattery.minimumSOC || 20}
                              stroke="#ef4444"
                              strokeDasharray="3 3"
                              label={{ value: 'Min SOC', fill: '#ef4444', fontSize: 9, position: 'insideBottomRight' }}
                            />
                            <ReferenceLine
                              y={selectedBattery.maximumSOC || 95}
                              stroke="#10b981"
                              strokeDasharray="3 3"
                              label={{ value: 'Max SOC', fill: '#10b981', fontSize: 9, position: 'insideTopRight' }}
                            />
                            <Area
                              type="monotone"
                              dataKey="soc"
                              name="Battery SOC (%)"
                              stroke="#5E6AD2"
                              strokeWidth={2}
                              fill="url(#bessSocGrad)"
                              dot={{ r: 3, fill: '#5E6AD2' }}
                              activeDot={{ r: 5, fill: '#6872D9' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </GlassCard>
                )}

                {/* Telemetry Reading History Table */}
                <GlassCard className="p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/6">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4 text-accent" />
                      TELEMETRY READINGS LOG ({readings.length})
                    </h3>
                    <span className="text-xs text-foreground-muted font-mono">PostgreSQL: battery_readings</span>
                  </div>

                  {readingsLoading && <LoadingSkeleton className="h-28 w-full" />}

                  {!readingsLoading && readings.length === 0 && (
                    <div className="py-8 text-center border border-dashed border-white/10 rounded-xl text-foreground-muted text-xs">
                      No historical telemetry readings found for this BESS container in PostgreSQL.
                    </div>
                  )}

                  {!readingsLoading && readings.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/6 text-[10px] text-foreground-muted uppercase font-mono bg-white/[0.02]">
                            <th className="p-2.5 font-semibold">Timestamp (UTC)</th>
                            <th className="p-2.5 font-semibold">State of Charge (SOC)</th>
                            <th className="p-2.5 font-semibold">Charge Power</th>
                            <th className="p-2.5 font-semibold">Discharge Power</th>
                            <th className="p-2.5 font-semibold">Net Flow</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/4 font-mono text-xs">
                          {readings.map((r) => {
                            const net = (r.chargePower || 0) - (r.dischargePower || 0);
                            const rColor = getSocColor(r.soc);
                            return (
                              <tr key={r.id} className="hover:bg-white/[0.03] transition-colors">
                                <td className="p-2.5 text-foreground-muted font-mono">
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
                                  <span className={`px-2 py-0.5 rounded-full border ${rColor.border} bg-white/5 ${rColor.text}`}>
                                    {r.soc}%
                                  </span>
                                </td>
                                <td className="p-2.5 text-foreground">{r.chargePower || 0} kW</td>
                                <td className="p-2.5 text-foreground">{r.dischargePower || 0} kW</td>
                                <td className="p-2.5 font-semibold">
                                  {net > 0 ? (
                                    <span className="text-emerald-400">+{net} kW (Charge)</span>
                                  ) : net < 0 ? (
                                    <span className="text-amber-400">{net} kW (Discharge)</span>
                                  ) : (
                                    <span className="text-foreground-muted">0 kW (Idle)</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </GlassCard>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
