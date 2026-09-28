'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { Station } from '@/lib/types';
import { AntarcticaMap } from '@/components/stations/AntarcticaMap';
import { StationCard } from '@/components/stations/StationCard';
import { LoadingSkeleton } from '@/components/common/Toast';
import { MapPin, AlertTriangle, RefreshCw, Database, Radio } from 'lucide-react';
import { PageHeader, GlassCard, Button } from '@/components/ui';

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [summaries, setSummaries] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStationsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch live stations from PostgreSQL via Express GET /api/stations
      const stationList = await apiClient.getStations();

      // Sort so Maitri is first, Bharati second (matching fleet layout)
      const sorted = [...stationList].sort((a, b) => {
        if (a.code?.toUpperCase() === 'MAITRI') return -1;
        if (b.code?.toUpperCase() === 'MAITRI') return 1;
        return a.name.localeCompare(b.name);
      });

      setStations(sorted);

      // 2. Fetch live summaries for all stations in parallel
      const summaryMap: Record<string, any> = {};
      await Promise.allSettled(
        sorted.map(async (st) => {
          try {
            const identifier = st.id || st.code || '';
            const sum = await apiClient.getStationSummary(identifier);
            const key = (st.code || st.id).toLowerCase();
            summaryMap[key] = sum;
            summaryMap[st.id] = sum;
          } catch (sumErr) {
            console.warn(`Summary fetch bypassed for ${st.name}:`, sumErr);
          }
        })
      );
      setSummaries(summaryMap);
    } catch (err: any) {
      console.error('Failed to load stations from PostgreSQL backend:', err);
      setError(err.message || 'Unable to connect to Express backend stations API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStationsData();
  }, [fetchStationsData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-20" />
        <LoadingSkeleton className="h-96" />
        <LoadingSkeleton className="h-44" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Antarctic Research Stations Fleet"
          subtitle="Indian Antarctic Programme (NCPOR / MoES) operational station nodes"
          icon={<MapPin className="w-5 h-5 text-accent-bright" />}
          breadcrumbs={[
            { label: "Operations", href: "/stations" },
            { label: "Stations Fleet" }
          ]}
        />

        <GlassCard className="border-rose-500/30 p-8 font-mono text-center space-y-4 max-w-xl mx-auto">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto animate-pulse" />
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-rose-300 uppercase tracking-wider">
              PostgreSQL Telemetry Service Unavailable
            </h3>
            <p className="text-xs text-rose-200/80 max-w-lg mx-auto">{error}</p>
          </div>
          <div>
            <Button
              onClick={fetchStationsData}
              variant="secondary"
              size="sm"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              <span>Retry Backend Connection</span>
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (stations.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Antarctic Research Stations Fleet"
          subtitle="Indian Antarctic Programme (NCPOR / MoES) operational station nodes"
          icon={<MapPin className="w-5 h-5 text-accent-bright" />}
          breadcrumbs={[
            { label: "Operations", href: "/stations" },
            { label: "Stations Fleet" }
          ]}
        />

        <GlassCard className="p-8 font-mono text-center space-y-3 max-w-xl mx-auto">
          <Database className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Zero Operational Station Nodes in PostgreSQL
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            The database currently has no records in the `stations` table. Seed the database or register Maitri/Bharati in PostgreSQL.
          </p>
          <Button
            onClick={fetchStationsData}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Refresh Fleet</span>
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Antarctic Research Stations Fleet"
        subtitle="Indian Antarctic Programme (NCPOR / MoES) operational station nodes"
        icon={<MapPin className="w-5 h-5 text-accent-bright" />}
        badge={{
          label: `${stations.length} NODES ONLINE`,
          variant: "success"
        }}
        breadcrumbs={[
          { label: "Operations", href: "/stations" },
          { label: "Stations Fleet" }
        ]}
        actions={
          <Button
            onClick={fetchStationsData}
            variant="ghost"
            size="sm"
            title="Refresh Stations Telemetry"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* 1. Antarctica Polar Spatial Radar Map */}
      <AntarcticaMap stations={stations} summaries={summaries} />

      {/* 2. Detailed Station Specs Cards */}
      <div className="space-y-4">
        {stations.map((st) => {
          const key = (st.code || st.id).toLowerCase();
          const summary = summaries[key] || summaries[st.id];
          return (
            <StationCard
              key={st.id}
              station={st}
              summary={summary}
            />
          );
        })}
      </div>
    </div>
  );
}
