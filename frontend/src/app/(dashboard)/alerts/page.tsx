'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { AlertRecord } from '@/lib/types';
import { AlertCard } from '@/components/alerts/AlertCard';
import { LoadingSkeleton, EmptyState } from '@/components/common/Toast';
import {
  Bell,
  Filter,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  Info,
  RefreshCw,
  Layers,
  Building2,
  AlertOctagon,
  ShieldCheck,
} from 'lucide-react';

export default function AlertsPage() {
  const { activeStationId, station, refreshAlertCount, addToast } = useStation();

  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [stationFilter, setStationFilter] = useState<string>('ACTIVE_STATION');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const targetStation =
        stationFilter === 'ACTIVE_STATION'
          ? activeStationId
          : stationFilter === 'ALL'
          ? undefined
          : stationFilter;

      const data = await apiClient.getAlerts(targetStation);
      setAlerts(data);
    } catch (err: any) {
      console.error('Failed to load alerts from PostgreSQL:', err);
      setError(err.message || 'Unable to retrieve alert records from database');
    } finally {
      setLoading(false);
    }
  }, [activeStationId, stationFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAcknowledge = async (id: string) => {
    try {
      await apiClient.acknowledgeAlert(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'ACKNOWLEDGED', acknowledgedAt: new Date().toISOString() } : a))
      );
      await refreshAlertCount();
      addToast({
        type: 'SUCCESS',
        title: 'Alert Acknowledged',
        message: 'Operator acknowledgment recorded in PostgreSQL database.',
      });
    } catch (err: any) {
      addToast({
        type: 'ERROR',
        title: 'Acknowledgment Failed',
        message: err.message || 'Could not update alert status',
      });
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await apiClient.resolveAlert(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'RESOLVED' } : a))
      );
      await refreshAlertCount();
      addToast({
        type: 'INFO',
        title: 'Alert Resolved',
        message: 'Alert marked as RESOLVED in PostgreSQL database.',
      });
    } catch (err: any) {
      addToast({
        type: 'ERROR',
        title: 'Action Failed',
        message: err.message || 'Could not resolve alert',
      });
    }
  };

  // Filter alerts by severity and status
  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    return true;
  });

  // Calculate real metrics directly from PostgreSQL records
  const totalAlertsCount = alerts.length;
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && a.status === 'ACTIVE').length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING' && a.status === 'ACTIVE').length;
  const infoCount = alerts.filter((a) => a.severity === 'INFO' && a.status === 'ACTIVE').length;
  const activeCount = alerts.filter((a) => a.status === 'ACTIVE').length;
  const acknowledgedCount = alerts.filter((a) => a.status === 'ACKNOWLEDGED').length;
  const resolvedCount = alerts.filter((a) => a.status === 'RESOLVED').length;

  const currentStationDisplay =
    stationFilter === 'ACTIVE_STATION'
      ? station?.name || activeStationId.toUpperCase()
      : stationFilter === 'ALL'
      ? 'ALL STATIONS'
      : stationFilter.toUpperCase();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0A111C] p-4 sm:p-6 rounded-lg border border-[#1B2C42] relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase">
              SCADA ALERTS
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Target: <strong className="text-slate-200">{currentStationDisplay}</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wide uppercase flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-rose-400" />
            Intelligent Alert & Incident Center
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Real-time SCADA anomaly detection, battery reserve warnings & critical load safety alerts.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 font-mono">
          <button
            onClick={() => {
              fetchAlerts();
              refreshAlertCount();
              addToast({
                type: 'INFO',
                title: 'Alerts Refreshed',
                message: 'Synced with PostgreSQL alert records',
              });
            }}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-[#121E2E] hover:bg-[#1A2C42] border border-[#1B2C42] text-slate-300 hover:text-cyan-300 rounded text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Real Counter Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="bg-[#0B1524] border border-[#1B2C42] rounded-lg p-3 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase">TOTAL LOGGED</span>
          <div className="text-xl font-bold text-slate-100">{totalAlertsCount}</div>
        </div>
        <div className="bg-[#0B1524] border border-rose-500/30 rounded-lg p-3 space-y-1">
          <span className="text-[10px] text-rose-400 uppercase font-bold">ACTIVE CRITICAL</span>
          <div className={`text-xl font-bold text-rose-400 ${criticalCount > 0 ? 'animate-pulse' : ''}`}>
            {criticalCount}
          </div>
        </div>
        <div className="bg-[#0B1524] border border-amber-500/30 rounded-lg p-3 space-y-1">
          <span className="text-[10px] text-amber-400 uppercase font-bold">ACTIVE WARNINGS</span>
          <div className="text-xl font-bold text-amber-300">{warningCount}</div>
        </div>
        <div className="bg-[#0B1524] border border-cyan-500/30 rounded-lg p-3 space-y-1">
          <span className="text-[10px] text-cyan-400 uppercase">ACTIVE INFO</span>
          <div className="text-xl font-bold text-cyan-300">{infoCount}</div>
        </div>
        <div className="bg-[#0B1524] border border-emerald-500/30 rounded-lg p-3 space-y-1">
          <span className="text-[10px] text-emerald-400 uppercase">ACKNOWLEDGED</span>
          <div className="text-xl font-bold text-emerald-300">{acknowledgedCount}</div>
        </div>
        <div className="bg-[#0B1524] border border-slate-700/50 rounded-lg p-3 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase">RESOLVED</span>
          <div className="text-xl font-bold text-slate-300">{resolvedCount}</div>
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
            onClick={fetchAlerts}
            className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded text-[11px] transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-4 rounded-lg bg-[#0E1724]/90 border border-[#1B2C42] space-y-3 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Station Selection Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 mr-1 flex items-center gap-1">
              <Building2 size={13} /> Station:
            </span>
            {[
              { id: 'ACTIVE_STATION', label: `Active (${activeStationId.toUpperCase()})` },
              { id: 'ALL', label: 'All Stations' },
              { id: 'maitri', label: 'Maitri' },
              { id: 'bharati', label: 'Bharati' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStationFilter(st.id)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  stationFilter === st.id
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                    : 'text-slate-400 hover:text-slate-200 bg-[#0B1524] border border-[#1B2C42]'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 mr-1 flex items-center gap-1">
              <ShieldCheck size={13} /> Status:
            </span>
            {['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  statusFilter === st
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200 bg-[#0B1524] border border-[#1B2C42]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[#1B2C42]/50">
          <span className="text-slate-400 mr-1 flex items-center gap-1">
            <Filter size={13} /> Severity:
          </span>
          {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-2.5 py-1 rounded transition-colors ${
                severityFilter === s
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 bg-[#0B1524] border border-[#1B2C42]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="space-y-3">
          <LoadingSkeleton className="h-28 w-full" />
          <LoadingSkeleton className="h-28 w-full" />
        </div>
      ) : filteredAlerts.length > 0 ? (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={handleAcknowledge}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[#0B1524] border border-[#1B2C42] rounded-lg p-12 text-center font-mono space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#121E2E] border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">No Alerts Recorded</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No alert records currently exist in PostgreSQL for station{' '}
              <span className="text-cyan-300 font-semibold">{currentStationDisplay}</span> with the selected filter criteria. All telemetry parameters are operating within safe bounds.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
