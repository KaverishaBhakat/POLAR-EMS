'use client';

import React, { useEffect, useState } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { AlertSeverity, StationId, SystemAlert } from '@/lib/types';
import { AlertCard } from '@/components/alerts/AlertCard';
import { LoadingSkeleton, EmptyState } from '@/components/common/Toast';
import { Bell, Filter, CheckCircle2, ShieldAlert, AlertTriangle, Info, BrainCircuit } from 'lucide-react';

export default function AlertsPage() {
  const { activeStationId, refreshAlertCount, addToast } = useStation();

  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [stationFilter, setStationFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getAlerts();
      setAlerts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleAcknowledge = async (id: string) => {
    await apiClient.acknowledgeAlert(id);
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
    await refreshAlertCount();
    addToast({
      type: 'SUCCESS',
      title: 'Alert Acknowledged',
      message: 'Operator acknowledgment recorded in telemetry log.',
    });
  };

  const handleDismiss = async (id: string) => {
    await apiClient.dismissAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    await refreshAlertCount();
    addToast({
      type: 'INFO',
      title: 'Alert Dismissed',
      message: 'Alert removed from active control dashboard view.',
    });
  };

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (stationFilter !== 'ALL' && a.stationId !== stationFilter) return false;
    return true;
  });

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && !a.acknowledged).length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING' && !a.acknowledged).length;
  const aiInsightCount = alerts.filter((a) => a.severity === 'AI_INSIGHT').length;

  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1B2C42]/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wide uppercase flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-rose-400" />
            Intelligent Alert & Incident Center
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time SCADA anomaly detection, battery reserve warnings & AI dispatch notifications
          </p>
        </div>

        {/* Quick Summary Pill Strip */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {criticalCount > 0 && (
            <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse">
              {criticalCount} CRITICAL
            </span>
          )}
          <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
            {warningCount} WARNINGS
          </span>
          <span className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            {aiInsightCount} AI INSIGHTS
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3.5 rounded-lg bg-[#0E1724]/90 border border-[#1B2C42] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        {/* Severity Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-400 mr-1 flex items-center gap-1">
            <Filter size={13} /> Severity:
          </span>
          {['ALL', 'CRITICAL', 'WARNING', 'INFO', 'AI_INSIGHT'].map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-2.5 py-1 rounded transition-colors ${
                severityFilter === s
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Station Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 mr-1">Station:</span>
          {['ALL', 'maitri', 'bharati'].map((st) => (
            <button
              key={st}
              onClick={() => setStationFilter(st)}
              className={`px-2.5 py-1 rounded uppercase transition-colors ${
                stationFilter === st
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="space-y-3">
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
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
        <EmptyState
          title="No Active Alerts"
          description="All telemetry parameters within normal operational bounds."
        />
      )}
    </div>
  );
}
