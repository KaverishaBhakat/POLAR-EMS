'use client';

import React, { useEffect, useState } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { EnergyData, Station, StationId, WeatherData } from '@/lib/types';
import { AntarcticaMap } from '@/components/stations/AntarcticaMap';
import { StationCard } from '@/components/stations/StationCard';
import { LoadingSkeleton } from '@/components/common/Toast';
import { MapPin, Building2, Compass } from 'lucide-react';

export default function StationsPage() {
  const [stations, setStations] = useState<Record<StationId, Station> | null>(null);
  const [weathers, setWeathers] = useState<Record<StationId, WeatherData> | null>(null);
  const [energies, setEnergies] = useState<Record<StationId, EnergyData> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const st = await apiClient.getStations();
        const wMaitri = await apiClient.getWeatherData('maitri');
        const wBharati = await apiClient.getWeatherData('bharati');
        const eMaitri = await apiClient.getEnergyData('maitri');
        const eBharati = await apiClient.getEnergyData('bharati');

        if (isMounted) {
          setStations(st);
          setWeathers({ maitri: wMaitri, bharati: wBharati });
          setEnergies({ maitri: eMaitri, bharati: eBharati });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading || !stations || !weathers || !energies) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-20" />
        <LoadingSkeleton className="h-96" />
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
      </div>

      {/* 1. Antarctica Polar Spatial Radar Map */}
      <AntarcticaMap />

      {/* 2. Detailed Station Specs Cards */}
      <div className="space-y-4">
        <StationCard
          station={stations.maitri}
          weather={weathers.maitri}
          energy={energies.maitri}
        />

        <StationCard
          station={stations.bharati}
          weather={weathers.bharati}
          energy={energies.bharati}
        />
      </div>
    </div>
  );
}
