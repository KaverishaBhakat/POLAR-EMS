'use client';

import React, { useEffect, useState } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { ForecastMetrics, HourlyForecastPoint, WeatherData } from '@/lib/types';
import { LoadForecastChart } from '@/components/charts/LoadForecastChart';
import { RenewableChart } from '@/components/charts/RenewableChart';
import { WeatherTelemetry } from '@/components/forecast/WeatherTelemetry';
import { ForecastDrivers } from '@/components/forecast/ForecastDrivers';
import { LoadingSkeleton } from '@/components/common/Toast';
import { TrendingUp, Cpu, Sparkles } from 'lucide-react';

export default function ForecastPage() {
  const { activeStationId, station, weather } = useStation();

  const [forecastPoints, setForecastPoints] = useState<HourlyForecastPoint[]>([]);
  const [metrics, setMetrics] = useState<ForecastMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const fc = await apiClient.getForecast(activeStationId);
        if (isMounted) {
          setForecastPoints(fc.points);
          setMetrics(fc.metrics);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [activeStationId]);

  if (loading || !metrics || !weather) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-20" />
        <LoadingSkeleton className="h-80" />
        <LoadingSkeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1B2C42]/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wide uppercase flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            AI Energy Forecast
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Predicting station demand and renewable generation for the next 24 hours | {station?.name}
          </p>
        </div>
      </div>

      {/* Weather Telemetry Inputs */}
      <WeatherTelemetry weather={weather} />

      {/* A. Load Demand Forecast Chart with Confidence Intervals */}
      <LoadForecastChart data={forecastPoints} metrics={metrics} />

      {/* B. Renewable Generation Forecast Chart (Solar + Wind) */}
      <RenewableChart data={forecastPoints} />

      {/* C. Forecast Sensitivity Drivers & Correlation Matrix */}
      <ForecastDrivers />
    </div>
  );
}
