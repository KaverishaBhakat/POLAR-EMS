'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { Station } from '@/lib/types';
import { AntarcticaMap } from '@/components/stations/AntarcticaMap';
import { StationCard } from '@/components/stations/StationCard';
import { LoadingSkeleton } from '@/components/common/Toast';
import { MapPin, AlertTriangle, RefreshCw, Database, Radio } from 'lucide-react';

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1B2C42]/50">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wide uppercase flex items-center gap-2.5">
              <MapPin className="w-5 h-5 text-cyan-400" />
              Antarctic Research Stations Fleet
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Indian Antarctic Programme (NCPOR / MoES) operational station nodes
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-rose-500/40 bg-[#160B12] p-8 font-mono text-center space-y-4 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto animate-pulse" />
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-rose-300 uppercase tracking-wider">
              PostgreSQL Telemetry Service Unavailable
            </h3>
            <p className="text-xs text-rose-200/80 max-w-lg mx-auto">{error}</p>
          </div>
          <div>
            <button
              onClick={fetchStationsData}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs rounded uppercase font-bold transition-all inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Backend Connection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1B2C42]/50">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wide uppercase flex items-center gap-2.5">
              <MapPin className="w-5 h-5 text-cyan-400" />
              Antarctic Research Stations Fleet
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Indian Antarctic Programme (NCPOR / MoES) operational station nodes
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-[#1B2C42] bg-[#0E1724]/90 p-8 font-mono text-center space-y-3">
          <Database className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Zero Operational Station Nodes in PostgreSQL
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            The database currently has no records in the `stations` table. Seed the database or register Maitri/Bharati in PostgreSQL.
          </p>
          <button
            onClick={fetchStationsData}
            className="px-3.5 py-1.5 bg-[#122032] hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs rounded uppercase font-bold transition-all inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Fleet</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1B2C42]/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wide uppercase flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-cyan-400" />
            Antarctic Research Stations Fleet
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Indian Antarctic Programme (NCPOR / MoES) operational station nodes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded bg-[#0A1828] border border-cyan-500/40 text-cyan-300">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>{stations.length} POSTGRESQL NODES CONNECTED</span>
          </span>
          <button
            onClick={fetchStationsData}
            title="Refresh Stations Telemetry"
            className="p-1.5 rounded bg-[#101D2E] border border-[#1B2C42] hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

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
