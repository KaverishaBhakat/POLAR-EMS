'use client';

import React, { useEffect, useState } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { ForecastMetrics, HourlyForecastPoint, WeatherData, WeatherForecastData } from '@/lib/types';
import { LoadForecastChart } from '@/components/charts/LoadForecastChart';
import { RenewableChart } from '@/components/charts/RenewableChart';
import { WeatherForecastChart } from '@/components/charts/WeatherForecastChart';
import { WeatherTelemetry } from '@/components/forecast/WeatherTelemetry';
import { ForecastDrivers } from '@/components/forecast/ForecastDrivers';
import { StationUnavailableState } from '@/components/common/StationUnavailableState';
import { LoadingSkeleton } from '@/components/common/Toast';
import { TrendingUp, Cpu, Sparkles } from 'lucide-react';
import { ProvenanceBadge } from '@/components/common/ProvenanceBadge';
import { PageHeader } from '@/components/ui';

export default function ForecastPage() {
  const { activeStationId, station, weather } = useStation();

  const [forecastPoints, setForecastPoints] = useState<HourlyForecastPoint[]>([]);
  const [metrics, setMetrics] = useState<ForecastMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Weather (Temperature) ML Forecast state
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecastData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const fetchWeatherForecast = async () => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const wf = await apiClient.getWeatherForecast(activeStationId, 24);
      setWeatherForecast(wf);
      if (wf?.status === 'ERROR') {
        setWeatherError(wf.message || 'Error fetching weather forecast');
      }
    } catch (err: any) {
      setWeatherError(err?.message || 'Failed to retrieve weather forecast');
    } finally {
      setWeatherLoading(false);
    }
  };

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
    fetchWeatherForecast();
    return () => {
      isMounted = false;
    };
  }, [activeStationId]);

  const isBharati = activeStationId === 'bharati';

  if (loading || (!isBharati && !metrics)) {
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
      {/* Page Header */}
      <PageHeader
        title="Machine Learning Energy & Weather Forecast"
        subtitle={`24-hour lookahead regression: station demand, ambient temperature, and renewable generation | ${station?.name || (isBharati ? 'Bharati Research Station' : 'Maitri Research Station')}`}
        icon={<TrendingUp className="w-5 h-5 text-accent-bright" />}
        badge={{
          label: isBharati ? "FORECAST SCOPE" : "ML / MODELED",
          variant: isBharati ? "neutral" : "accent"
        }}
        breadcrumbs={[
          { label: "Intelligence", href: "/forecast" },
          { label: "24h Forecast" }
        ]}
      />

      {/* Real Weather Telemetry Observation */}
      <WeatherTelemetry weather={weather} />

      {isBharati ? (
        /* BHARATI FORECAST UNAVAILABLE NOTICE */
        <StationUnavailableState
          title="Bharati-specific forecast unavailable"
          subsystemName="ML regression forecast"
          description="The current machine learning forecasting models (demand & temperature regression) are trained and configured for Maitri Station historical climatology. Historical Bharati observations remain available under Meteorology."
          stationName="Bharati Research Station"
          icon={TrendingUp}
          provenanceType="UNAVAILABLE"
        />
      ) : (
        /* MAITRI ML FORECAST CHARTS */
        <>
          {/* 24-Hour ML Ambient Temperature Forecast */}
          <WeatherForecastChart
            data={weatherForecast}
            loading={weatherLoading}
            error={weatherError}
            onRefresh={fetchWeatherForecast}
            stationName={station?.name || activeStationId.toUpperCase()}
          />

          {/* A. Load Demand Forecast Chart with Confidence Intervals */}
          {metrics && <LoadForecastChart data={forecastPoints} metrics={metrics} />}

          {/* B. Renewable Generation Forecast Chart (Solar + Wind) */}
          <RenewableChart data={forecastPoints} />

          {/* C. Forecast Sensitivity Drivers & Correlation Matrix */}
          <ForecastDrivers />
        </>
      )}
    </div>
  );
}
