'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { WeatherData } from '@/lib/types';
import { LoadingSkeleton } from '@/components/common/Toast';
import { PageHeader, GlassCard, Button } from '@/components/ui';
import {
  CloudSun,
  Thermometer,
  Wind,
  Droplets,
  Gauge,
  Sun,
  Compass,
  RefreshCw,
  AlertTriangle,
  Database,
  Radio,
  Clock,
  Info,
  ShieldAlert,
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
  CartesianGrid,
} from 'recharts';
import { inspectTelemetryData, sortChronological } from '@/lib/utils/chartData';
import { ChartTelemetryStatus } from '@/components/charts/ChartTelemetryStatus';
import { ProvenanceBadge } from '@/components/common/ProvenanceBadge';

export default function WeatherPage() {
  const { activeStationId, station, addToast } = useStation();

  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [history, setHistory] = useState<WeatherData[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'temperature' | 'wind' | 'humidity' | 'pressure' | 'solar'>('temperature');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('2016');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchWeatherData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch live current weather from PostgreSQL for real-time KPI observation
      const current = await apiClient.getCurrentWeather(activeStationId);
      setCurrentWeather(current);

      // 2. Fetch historical records across full date envelope (1985 to 2025, limit 1000)
      const rangeRecords = await apiClient.getWeatherRange(activeStationId, {
        start: '1985-01-01T00:00:00.000Z',
        end: '2025-12-31T23:59:59.999Z',
        limit: 1000,
      });

      // 3. Sort ascending by timestamp for chronological chart plotting, preserving NULL values
      const sortedHistory: WeatherData[] = sortChronological(
        rangeRecords || [],
        (r) => r.timestamp || r.createdAt
      ).map((r) => ({
        ...r,
        temperature: typeof r.temperature === 'number' ? r.temperature : 0,
        apparentTemperature: typeof r.apparentTemperature === 'number' ? r.apparentTemperature : undefined,
        windSpeed: typeof r.windSpeed === 'number' ? r.windSpeed : 0,
        solarRadiation: typeof r.solarRadiation === 'number' ? r.solarRadiation : null,
        pressure: typeof r.pressure === 'number' ? r.pressure : 0,
        humidity: typeof r.humidity === 'number' ? r.humidity : null,
        windDirection: r.windDirection || null,
      }));

      setHistory(sortedHistory);
      setTotalRecords(sortedHistory.length);
    } catch (err: any) {
      console.error(`Failed to fetch weather telemetry for ${activeStationId}:`, err);
      setError(err.message || 'Unable to retrieve meteorological telemetry from PostgreSQL backend');
    } finally {
      setLoading(false);
    }
  }, [activeStationId]);

  useEffect(() => {
    fetchWeatherData();
  }, [fetchWeatherData]);

  // Segment historical observations into distinct observation campaigns
  const campaigns = useMemo(() => {
    if (!history || history.length === 0) return [];

    const groups: { [key: string]: WeatherData[] } = {};
    history.forEach((r) => {
      const d = new Date(r.timestamp || r.createdAt || Date.now());
      const yr = d.getUTCFullYear();
      const key = String(yr);
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    return Object.keys(groups)
      .sort((a, b) => Number(a) - Number(b))
      .map((yrKey) => {
        const recs = groups[yrKey];
        const yr = Number(yrKey);
        const start = new Date(recs[0].timestamp || recs[0].createdAt || Date.now());
        const end = new Date(recs[recs.length - 1].timestamp || recs[recs.length - 1].createdAt || Date.now());

        const startMonth = start.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
        const endMonth = end.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
        const startDay = start.getUTCDate();
        const endDay = end.getUTCDate();

        let dateRangeFormatted = '';
        if (startMonth === endMonth) {
          dateRangeFormatted = `${startMonth} ${startDay}–${endDay}, ${yr}`;
        } else {
          dateRangeFormatted = `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${yr}`;
        }

        let label = `${yr} Campaign`;
        let shortLabel = `${yr} Expedition`;
        if (yr === 1985) {
          label = '4th Antarctic Expedition · 1985';
          shortLabel = '4th Expedition (1985)';
        } else if (yr === 2016) {
          label = '36th Antarctic Expedition · 2016';
          shortLabel = '36th Expedition (2016)';
        } else {
          label = `${yr} Observation Period`;
          shortLabel = `${yr} Period`;
        }

        return {
          id: yrKey,
          label,
          shortLabel,
          year: yr,
          count: recs.length,
          startDate: start,
          endDate: end,
          records: recs,
          dateRangeFormatted,
        };
      });
  }, [history]);

  // Ensure default campaign is set (defaults to 2016 if present, otherwise largest/latest)
  useEffect(() => {
    if (campaigns.length > 0) {
      const exists = campaigns.some((c) => c.id === selectedCampaignId);
      if (!exists) {
        const has2016 = campaigns.some((c) => c.id === '2016');
        if (has2016) {
          setSelectedCampaignId('2016');
        } else {
          const largest = [...campaigns].sort((a, b) => b.count - a.count)[0];
          setSelectedCampaignId(largest?.id || campaigns[campaigns.length - 1].id);
        }
      }
    }
  }, [campaigns, selectedCampaignId]);

  const activeCampaign = useMemo(() => {
    return campaigns.find((c) => c.id === selectedCampaignId) || campaigns[campaigns.length - 1] || null;
  }, [campaigns, selectedCampaignId]);

  const activeCampaignData = useMemo(() => {
    return activeCampaign ? activeCampaign.records : [];
  }, [activeCampaign]);

  // Date-aware X-axis tick formatter for selected campaign (shows Month Day)
  const formatTimeLabel = (ts?: string | Date) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      timeZone: 'UTC',
    });
  };

  // Full timestamp formatter for tooltips & table (UTC precise)
  const formatDateLabel = (ts?: string | Date) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    });
  };

  // Check if active campaign dataset contains any non-null solar radiation measurements
  const hasSolarData = useMemo(() => {
    return activeCampaignData.some((r) => r.solarRadiation !== null && r.solarRadiation !== undefined);
  }, [activeCampaignData]);

  // Check if active campaign dataset contains any non-null relative humidity measurements
  const hasHumidityData = useMemo(() => {
    return activeCampaignData.some((r) => r.humidity !== null && r.humidity !== undefined);
  }, [activeCampaignData]);

  // Derive date range label from active records
  const dateRangeLabel = useMemo(() => {
    if (history.length === 0) return '';
    const firstYear = new Date(history[0].timestamp || history[0].createdAt || Date.now()).getUTCFullYear();
    const lastYear = new Date(history[history.length - 1].timestamp || history[history.length - 1].createdAt || Date.now()).getUTCFullYear();
    return firstYear === lastYear ? `${firstYear}` : `${firstYear}–${lastYear}`;
  }, [history]);

  const isBharati = activeStationId === 'bharati';

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-20 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <LoadingSkeleton className="h-96 rounded-2xl" />
        <LoadingSkeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Meteorology & Weather"
          description={`Automated Weather Station (AWS) | ${station?.name || activeStationId.toUpperCase()}`}
          breadcrumbs={[
            { label: 'Operations', href: '/dashboard' },
            { label: 'Weather' },
          ]}
          badge={{ label: 'ERROR', variant: 'danger' }}
        />

        <GlassCard className="p-8 text-center space-y-4 border-rose-500/30 bg-rose-950/20">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto animate-pulse" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-rose-300">
              PostgreSQL Weather Telemetry Service Unavailable
            </h3>
            <p className="text-xs text-rose-200/70 max-w-lg mx-auto">{error}</p>
          </div>
          <div>
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={fetchWeatherData}
            >
              Retry Weather Backend Connection
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  const hasData = currentWeather !== null || history.length > 0;

  return (
    <div className="space-y-6">
      {/* Title & Station Context Header */}
      <PageHeader
        title="Meteorology & Atmospheric Telemetry"
        description={`Real observational AWS surface telemetry & historical meteorological time-series | ${station?.name || activeStationId.toUpperCase()}`}
        breadcrumbs={[
          { label: 'Operations', href: '/dashboard' },
          { label: 'Weather' },
        ]}
        badge={{
          label: hasData ? `${totalRecords} HISTORICAL OBSERVATIONS (${dateRangeLabel || 'REAL'})` : 'NO TELEMETRY',
          variant: hasData ? 'default' : 'neutral',
        }}
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() => {
              fetchWeatherData();
              addToast({
                type: 'INFO',
                title: 'Weather Telemetry Refreshed',
                message: `Loaded historical meteorological sensors for ${station?.name || activeStationId}.`,
              });
            }}
          >
            Refresh
          </Button>
        }
      />

      {!hasData ? (
        /* Empty Database State */
        <GlassCard className="p-10 text-center space-y-4">
          <Database className="w-10 h-10 text-foreground-muted mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              No Weather Telemetry in PostgreSQL for {station?.name || activeStationId.toUpperCase()}
            </h3>
            <p className="text-xs text-foreground-muted max-w-md mx-auto">
              The database currently contains zero meteorological observations for this station node in the `weather_data` table.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={fetchWeatherData}
            >
              Refresh Sensor Stream
            </Button>
          </div>
        </GlassCard>
      ) : (
        <>
          {/* 1. Live Weather Current Observation Cards */}
          {currentWeather && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Latest AWS Surface Observation ({isBharati ? 'Bharati Station' : 'Maitri Station'})
                  </span>
                  <ProvenanceBadge type="REAL_MEASURED" size="xs" />
                </div>
                {currentWeather.timestamp && (
                  <div className="text-[11px] text-foreground-muted flex items-center gap-1.5 font-mono">
                    <Clock size={12} className="text-foreground-muted" />
                    <span>Observed: {formatDateLabel(currentWeather.timestamp)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* 1. Temperature */}
                <GlassCard hover className="p-3.5 border-accent/30 bg-accent/5">
                  <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                    <span>TEMPERATURE</span>
                    <Thermometer size={14} className="text-accent" />
                  </div>
                  <div className="text-xl font-bold text-foreground font-mono">
                    {currentWeather.temperature != null ? `${currentWeather.temperature.toFixed(1)}°C` : 'N/A'}
                  </div>
                  <div className="text-[10px] text-foreground-muted mt-1">
                    Chill: {currentWeather.apparentTemperature != null ? `${currentWeather.apparentTemperature.toFixed(1)}°C` : 'N/A'}{' '}
                    <span className="text-[9px] text-accent-bright font-semibold">(Derived)</span>
                  </div>
                </GlassCard>

                {/* 2. Wind Speed */}
                <GlassCard hover className="p-3.5 border-blue-500/20 bg-blue-500/[0.03]">
                  <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                    <span>WIND SPEED</span>
                    <Wind size={14} className="text-blue-400" />
                  </div>
                  <div className="text-xl font-bold text-blue-300 font-mono">
                    {currentWeather.windSpeed != null ? `${currentWeather.windSpeed.toFixed(1)} m/s` : 'N/A'}
                  </div>
                  <div className="text-[10px] text-foreground-muted mt-1">
                    Gust: {currentWeather.windGust != null ? `${currentWeather.windGust.toFixed(1)} m/s` : 'N/A'}{' '}
                    <span className="text-[9px] text-blue-400 font-semibold">(Derived)</span>
                  </div>
                </GlassCard>

                {/* 3. Wind Direction */}
                <GlassCard hover className="p-3.5">
                  <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                    <span>DIRECTION</span>
                    <Compass size={14} className="text-foreground-muted" />
                  </div>
                  <div className="text-base font-bold text-foreground font-mono">
                    {currentWeather.windDirection || 'N/A'}
                  </div>
                  <div className="text-[10px] text-foreground-muted mt-1">
                    {currentWeather.windSpeed && currentWeather.windSpeed > 15 ? 'Katabatic Flow' : 'Steady Vector'}
                  </div>
                </GlassCard>

                {/* 4. Atmospheric Pressure */}
                <GlassCard hover className="p-3.5 border-purple-500/20 bg-purple-500/[0.03]">
                  <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                    <span>PRESSURE</span>
                    <Gauge size={14} className="text-purple-400" />
                  </div>
                  <div className="text-xl font-bold text-purple-300 font-mono">
                    {currentWeather.pressure != null ? `${currentWeather.pressure.toFixed(1)}` : 'N/A'}
                  </div>
                  <div className="text-[10px] text-foreground-muted mt-1">hPa (Surface Barometer)</div>
                </GlassCard>

                {/* 5. Relative Humidity */}
                <GlassCard hover className="p-3.5">
                  <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                    <span>HUMIDITY</span>
                    <Droplets size={14} className="text-accent-bright" />
                  </div>
                  <div className="text-xl font-bold text-foreground font-mono">
                    {currentWeather.humidity != null ? `${currentWeather.humidity.toFixed(1)}%` : 'N/A'}
                  </div>
                  <div className="text-[10px] text-foreground-muted mt-1">
                    {currentWeather.humidity && currentWeather.humidity > 80 ? 'High Moisture' : 'Polar Air Mass'}
                  </div>
                </GlassCard>

                {/* 6. Solar Radiation */}
                <GlassCard hover className="p-3.5 border-amber-500/20 bg-amber-500/[0.03]">
                  <div className="flex items-center justify-between text-foreground-muted text-[10px] mb-1 font-mono uppercase tracking-wider">
                    <span>SOLAR GHI</span>
                    <Sun size={14} className="text-amber-400" />
                  </div>
                  <div className="text-xl font-bold text-amber-300 font-mono">
                    {currentWeather.solarRadiation != null ? `${currentWeather.solarRadiation}` : 'N/A'}
                  </div>
                  <div className="text-[10px] text-foreground-muted mt-1">
                    {currentWeather.solarRadiation != null ? 'W/m² Irradiance' : 'No Pyranometer Channel'}
                  </div>
                </GlassCard>
              </div>
            </div>
          )}

          {/* 2. Meteorological Sensor Trends Chart (Campaign-Aware Segmented View) */}
          {history.length > 0 && (
            <GlassCard className="p-5">
              <div className="flex flex-col gap-4 mb-4 pb-4 border-b border-white/6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                        <CloudSun className="w-4 h-4 text-accent" />
                        Historical Weather Observations
                      </h3>
                      <ProvenanceBadge type="REAL_MEASURED" size="xs" />
                      {activeCampaign && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent-bright font-mono font-medium">
                          {activeCampaign.count} Data Points · {activeCampaign.dateRangeFormatted}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      {campaigns.length} historical observation campaign{campaigns.length !== 1 ? 's' : ''} · {totalRecords} total observations ({dateRangeLabel})
                    </p>
                  </div>

                  {/* Metric Tab Selectors */}
                  <div className="flex items-center gap-1 p-1 bg-white/[0.04] rounded-lg border border-white/6 text-xs flex-wrap">
                    <button
                      onClick={() => setActiveTab('temperature')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        activeTab === 'temperature'
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      Temperature
                    </button>
                    <button
                      onClick={() => setActiveTab('wind')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        activeTab === 'wind'
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      Wind Speed
                    </button>
                    <button
                      onClick={() => setActiveTab('humidity')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        activeTab === 'humidity'
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      Humidity
                    </button>
                    <button
                      onClick={() => setActiveTab('pressure')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        activeTab === 'pressure'
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      Pressure
                    </button>
                    <button
                      onClick={() => setActiveTab('solar')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        activeTab === 'solar'
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      Solar
                    </button>
                  </div>
                </div>

                {/* Campaign Selector Pill Buttons */}
                {campaigns.length > 1 && (
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-white/4">
                    <span className="text-[11px] uppercase tracking-wider text-foreground-muted font-mono font-semibold flex items-center gap-1.5 mr-1">
                      <Clock className="w-3.5 h-3.5 text-accent" />
                      Observation Campaign:
                    </span>
                    {campaigns.map((camp) => {
                      const isSelected = selectedCampaignId === camp.id;
                      return (
                        <button
                          key={camp.id}
                          onClick={() => setSelectedCampaignId(camp.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-2 ${
                            isSelected
                              ? 'bg-accent/20 border border-accent text-accent-bright shadow-sm font-semibold'
                              : 'bg-white/[0.03] border border-white/6 text-foreground-muted hover:text-foreground hover:bg-white/[0.06]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-accent-bright animate-pulse' : 'bg-foreground-muted/40'
                            }`}
                          />
                          <span>{camp.label}</span>
                          <span className="text-[10px] opacity-75 font-normal">
                            ({camp.count} pts · {camp.dateRangeFormatted})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Telemetry Sufficiency Status for Active Campaign */}
              <ChartTelemetryStatus
                inspection={inspectTelemetryData(activeCampaignData, (r) => r.timestamp || r.createdAt)}
                domainName="meteorological"
                className="mb-3"
              />

              {/* Chart Visual */}
              <div className="h-72 w-full min-h-[280px]">
                {!isMounted ? (
                  <div className="w-full h-full bg-white/[0.02] rounded-xl animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {activeTab === 'temperature' ? (
                      <AreaChart data={activeCampaignData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#5E6AD2" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#5E6AD2" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={formatTimeLabel}
                          stroke="#8A8F98"
                          fontSize={10}
                          minTickGap={35}
                        />
                        <YAxis stroke="#8A8F98" fontSize={10} unit="°C" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0a0a0c',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                          }}
                          labelFormatter={(v) => formatDateLabel(v)}
                        />
                        <Area
                          type="monotone"
                          dataKey="temperature"
                          name="Ambient Temp (°C)"
                          stroke="#5E6AD2"
                          strokeWidth={2}
                          fill="url(#tempGradient)"
                          dot={{ r: 2, fill: '#5E6AD2' }}
                          activeDot={{ r: 5, fill: '#6872D9' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="apparentTemperature"
                          name="Wind Chill (°C, Derived)"
                          stroke="#38bdf8"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          dot={false}
                          connectNulls={false}
                        />
                      </AreaChart>
                    ) : activeTab === 'wind' ? (
                      <AreaChart data={activeCampaignData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="windGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={formatTimeLabel}
                          stroke="#8A8F98"
                          fontSize={10}
                          minTickGap={35}
                        />
                        <YAxis stroke="#8A8F98" fontSize={10} unit="m/s" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0a0a0c',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                          }}
                          labelFormatter={(v) => formatDateLabel(v)}
                        />
                        <Area
                          type="monotone"
                          dataKey="windSpeed"
                          name="Wind Velocity (m/s)"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#windGradient)"
                          dot={{ r: 2, fill: '#3b82f6' }}
                          activeDot={{ r: 5, fill: '#60a5fa' }}
                        />
                      </AreaChart>
                    ) : activeTab === 'humidity' ? (
                      hasHumidityData ? (
                        <AreaChart data={activeCampaignData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="humidGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                          <XAxis
                            dataKey="timestamp"
                            tickFormatter={formatTimeLabel}
                            stroke="#8A8F98"
                            fontSize={10}
                            minTickGap={35}
                          />
                          <YAxis stroke="#8A8F98" fontSize={10} unit="%" domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0a0a0c',
                              borderColor: 'rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                              fontFamily: 'monospace',
                              fontSize: '11px',
                              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            }}
                            labelFormatter={(v) => formatDateLabel(v)}
                          />
                          <Area
                            type="monotone"
                            dataKey="humidity"
                            name="Relative Humidity (%)"
                            stroke="#06b6d4"
                            strokeWidth={2}
                            fill="url(#humidGradient)"
                            dot={{ r: 2, fill: '#06b6d4' }}
                            activeDot={{ r: 5, fill: '#22d3ee' }}
                            connectNulls={false}
                          />
                        </AreaChart>
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center bg-white/[0.02] rounded-xl border border-white/5 text-center p-6 space-y-2.5">
                          <div className="p-3 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                            <Droplets className="w-6 h-6" />
                          </div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">
                              Relative humidity sensor channel unavailable
                            </h4>
                            <ProvenanceBadge type="UNAVAILABLE" size="xs" />
                          </div>
                          <p className="text-xs text-foreground-muted max-w-md">
                            The {activeCampaign?.label || '1985 expedition'} archival dataset did not log relative humidity sensor channels (values recorded as missing/NULL in IMD records). Values are preserved without synthetic estimation.
                          </p>
                        </div>
                      )
                    ) : activeTab === 'solar' ? (
                      hasSolarData ? (
                        <AreaChart data={activeCampaignData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                          <XAxis
                            dataKey="timestamp"
                            tickFormatter={formatTimeLabel}
                            stroke="#8A8F98"
                            fontSize={10}
                            minTickGap={35}
                          />
                          <YAxis stroke="#8A8F98" fontSize={10} unit="W/m²" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0a0a0c',
                              borderColor: 'rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                              fontFamily: 'monospace',
                              fontSize: '11px',
                              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            }}
                            labelFormatter={(v) => formatDateLabel(v)}
                          />
                          <Area
                            type="monotone"
                            dataKey="solarRadiation"
                            name="Solar Irradiance (W/m²)"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            fill="url(#solarGradient)"
                            dot={{ r: 2, fill: '#f59e0b' }}
                            activeDot={{ r: 5, fill: '#fbbf24' }}
                          />
                        </AreaChart>
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center bg-white/[0.02] rounded-xl border border-white/5 text-center p-6 space-y-2.5">
                          <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <Sun className="w-6 h-6" />
                          </div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">
                              Solar radiation unavailable
                            </h4>
                            <ProvenanceBadge type="UNAVAILABLE" size="xs" />
                          </div>
                          <p className="text-xs text-foreground-muted max-w-md">
                            {isBharati
                              ? 'Unavailable — no measured Bharati pyranometer data in the uploaded dataset. Values are preserved as NULL without synthetic estimation.'
                              : `The historical IMD ${activeCampaign?.shortLabel || 'Maitri'} dataset does not contain solar radiation sensor instrumentation. Values are preserved as NULL in the database without synthetic estimation.`}
                          </p>
                        </div>
                      )
                    ) : (
                      <LineChart data={activeCampaignData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={formatTimeLabel}
                          stroke="#8A8F98"
                          fontSize={10}
                          minTickGap={35}
                        />
                        <YAxis stroke="#8A8F98" fontSize={10} unit="hPa" domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0a0a0c',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                          }}
                          labelFormatter={(v) => formatDateLabel(v)}
                        />
                        <Line
                          type="monotone"
                          dataKey="pressure"
                          name="Atmospheric Pressure (hPa)"
                          stroke="#c084fc"
                          strokeWidth={2}
                          dot={{ r: 2, fill: '#c084fc' }}
                          activeDot={{ r: 5, fill: '#d8b4fe' }}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            </GlassCard>
          )}

          {/* 3. Tabular Log of Historical Weather Records from PostgreSQL */}
          {history.length > 0 && (
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/6">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    PostgreSQL Weather Observations Log
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent-bright font-mono">
                    TABLE: weather_data
                  </span>
                </div>
                <span className="text-xs text-foreground-muted font-mono">
                  Displaying {activeCampaignData.length} observations ({activeCampaign?.label || dateRangeLabel})
                </span>
              </div>

              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs text-foreground-muted">
                  <thead className="bg-white/[0.03] text-foreground-muted uppercase text-[10px] border-b border-white/6 font-mono sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Temp (°C)</th>
                      <th className="py-2.5 px-3">Wind (m/s)</th>
                      <th className="py-2.5 px-3">Dir</th>
                      <th className="py-2.5 px-3">Pressure (hPa)</th>
                      <th className="py-2.5 px-3">Humidity (%)</th>
                      <th className="py-2.5 px-3">Solar (W/m²)</th>
                      <th className="py-2.5 px-3 text-right">Provenance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/4 font-mono text-xs">
                    {[...activeCampaignData].reverse().map((record) => (
                      <tr key={record.id || String(record.timestamp)} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-2 px-3 text-accent-bright font-semibold whitespace-nowrap">
                          {formatDateLabel(record.timestamp || record.createdAt)}
                        </td>
                        <td className="py-2 px-3 text-foreground font-semibold">
                          {record.temperature != null ? `${record.temperature}°C` : <span className="text-foreground-muted italic">N/A</span>}
                        </td>
                        <td className="py-2 px-3 text-blue-300">
                          {record.windSpeed != null ? `${record.windSpeed} m/s` : <span className="text-foreground-muted italic">N/A</span>}
                        </td>
                        <td className="py-2 px-3 text-foreground-muted">
                          {record.windDirection || <span className="text-foreground-muted italic">N/A</span>}
                        </td>
                        <td className="py-2 px-3 text-purple-300">
                          {record.pressure != null ? `${record.pressure} hPa` : <span className="text-foreground-muted italic">N/A</span>}
                        </td>
                        <td className="py-2 px-3 text-foreground">
                          {record.humidity != null ? `${record.humidity}%` : <span className="text-rose-400 italic">NULL (Sensor)</span>}
                        </td>
                        <td className="py-2 px-3 text-amber-300">
                          {record.solarRadiation != null ? `${record.solarRadiation}` : <span className="text-foreground-muted italic">NULL</span>}
                        </td>
                        <td className="py-2 px-3 text-right text-[10px] font-mono">
                          <ProvenanceBadge type="REAL_MEASURED" size="xs" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}
