'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { AlertRecord } from '@/lib/types';
import { AlertCard } from '@/components/alerts/AlertCard';
import { LoadingSkeleton } from '@/components/common/Toast';
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
import { PageHeader, GlassCard, Button } from '@/components/ui';

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
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Intelligent Alert & Incident Center"
        subtitle="Real-time SCADA anomaly detection, battery reserve warnings & critical load safety alerts."
        icon={<Bell className="w-5 h-5 text-rose-400" />}
        badge={{
          label: criticalCount > 0 ? `${criticalCount} CRITICAL` : "SCADA ALERTS",
          variant: criticalCount > 0 ? "error" : "default"
        }}
        breadcrumbs={[
          { label: "Operations", href: "/alerts" },
          { label: "Alert Center" }
        ]}
        actions={
          <Button
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
            variant="ghost"
            size="sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-accent-bright' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* Real Counter Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <GlassCard className="p-3 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase">TOTAL LOGGED</span>
          <div className="text-xl font-bold text-slate-100">{totalAlertsCount}</div>
        </GlassCard>
        <GlassCard className="p-3 space-y-1 border-rose-500/30">
          <span className="text-[10px] text-rose-400 uppercase font-bold">ACTIVE CRITICAL</span>
          <div className={`text-xl font-bold text-rose-400 ${criticalCount > 0 ? 'animate-pulse' : ''}`}>
            {criticalCount}
          </div>
        </GlassCard>
        <GlassCard className="p-3 space-y-1 border-amber-500/30">
          <span className="text-[10px] text-amber-400 uppercase font-bold">ACTIVE WARNINGS</span>
          <div className="text-xl font-bold text-amber-300">{warningCount}</div>
        </GlassCard>
        <GlassCard className="p-3 space-y-1 border-cyan-500/30">
          <span className="text-[10px] text-cyan-400 uppercase">ACTIVE INFO</span>
          <div className="text-xl font-bold text-cyan-300">{infoCount}</div>
        </GlassCard>
        <GlassCard className="p-3 space-y-1 border-emerald-500/30">
          <span className="text-[10px] text-emerald-400 uppercase">ACKNOWLEDGED</span>
          <div className="text-xl font-bold text-emerald-300">{acknowledgedCount}</div>
        </GlassCard>
        <GlassCard className="p-3 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase">RESOLVED</span>
          <div className="text-xl font-bold text-slate-300">{resolvedCount}</div>
        </GlassCard>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between gap-3 text-rose-300 font-mono text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            onClick={fetchAlerts}
            variant="ghost"
            size="sm"
          >
            Retry Connection
          </Button>
        </div>
      )}

      {/* Filters Bar */}
      <GlassCard className="p-4 space-y-3 font-mono text-xs">
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
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  stationFilter === st.id
                    ? 'bg-accent/20 text-accent-bright font-semibold border border-accent/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 bg-white/[0.02] border border-white/6'
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
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === st
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200 bg-white/[0.02] border border-white/6'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-white/6">
          <span className="text-slate-400 mr-1 flex items-center gap-1">
            <Filter size={13} /> Severity:
          </span>
          {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                severityFilter === s
                  ? 'bg-accent/20 text-accent-bright font-semibold border border-accent/40'
                  : 'text-slate-400 hover:text-slate-200 bg-white/[0.02] border border-white/6'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </GlassCard>

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
        <GlassCard className="p-12 text-center font-mono space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">No Alerts Recorded</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              No alert records currently exist in PostgreSQL for station{' '}
              <span className="text-accent-bright font-semibold">{currentStationDisplay}</span> with the selected filter criteria. All telemetry parameters are operating within safe bounds.
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
