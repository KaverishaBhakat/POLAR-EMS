'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { WeatherData } from '@/lib/types';
import { LoadingSkeleton } from '@/components/common/Toast';
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

export default function WeatherPage() {
  const { activeStationId, station, addToast } = useStation();

  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [history, setHistory] = useState<WeatherData[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'temperature' | 'wind' | 'solar' | 'pressure'>('temperature');

  const fetchWeatherData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch live current weather from PostgreSQL
      const current = await apiClient.getCurrentWeather(activeStationId);
      setCurrentWeather(current);

      // 2. Fetch historical records (up to 50 readings)
      const histData = await apiClient.getWeatherHistory(activeStationId, { limit: 50, page: 1 });
      // Sort ascending by timestamp for chronological chart plotting
      const sortedHistory = [...(histData.records || [])].sort((a, b) => {
        const tA = new Date(a.timestamp || a.createdAt || 0).getTime();
        const tB = new Date(b.timestamp || b.createdAt || 0).getTime();
        return tA - tB;
      });
      setHistory(sortedHistory);
      setTotalRecords(histData.meta?.total || sortedHistory.length);
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

  // Format chart timestamp
  const formatTimeLabel = (ts?: string | Date) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDateLabel = (ts?: string | Date) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-20" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-28" />
          ))}
        </div>
        <LoadingSkeleton className="h-96" />
        <LoadingSkeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1B2C42]/50">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wide uppercase flex items-center gap-2.5">
              <CloudSun className="w-5 h-5 text-cyan-400" />
              Polar Meteorology & Weather Telemetry
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Automated Weather Station (AWS) | {station?.name || activeStationId.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-rose-500/40 bg-[#160B12] p-8 font-mono text-center space-y-4 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto animate-pulse" />
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-rose-300 uppercase tracking-wider">
              PostgreSQL Weather Telemetry Service Unavailable
            </h3>
            <p className="text-xs text-rose-200/80 max-w-lg mx-auto">{error}</p>
          </div>
          <div>
            <button
              onClick={fetchWeatherData}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs rounded uppercase font-bold transition-all inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Weather Backend Connection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasData = currentWeather !== null || history.length > 0;

  return (
    <div className="space-y-6 font-mono">
      {/* Title & Station Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1B2C42]/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide uppercase flex items-center gap-2.5">
            <CloudSun className="w-5 h-5 text-cyan-400" />
            Polar Meteorology & Weather Telemetry
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time automated weather station sensors, atmospheric pressure & solar irradiance |{' '}
            <span className="text-cyan-300 font-semibold">{station?.name || activeStationId.toUpperCase()}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded bg-[#0A1828] border border-cyan-500/40 text-cyan-300">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>
              {hasData ? `${totalRecords} POSTGRESQL READINGS` : 'NO TELEMETRY RECORDED'}
            </span>
          </span>
          <button
            onClick={() => {
              fetchWeatherData();
              addToast({
                type: 'INFO',
                title: 'Weather Telemetry Refreshed',
                message: `Loaded latest meteorological sensors for ${station?.name || activeStationId}.`,
              });
            }}
            title="Refresh Weather Telemetry"
            className="p-1.5 rounded bg-[#101D2E] border border-[#1B2C42] hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!hasData ? (
        /* Empty Database State */
        <div className="rounded-lg border border-[#1B2C42] bg-[#0E1724]/90 p-8 text-center space-y-4">
          <Database className="w-10 h-10 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              No Weather Telemetry in PostgreSQL for {station?.name || activeStationId.toUpperCase()}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              The database currently contains zero meteorological observations for this station node in the `weather_data` table.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={fetchWeatherData}
              className="px-3.5 py-1.5 bg-[#122032] hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs rounded uppercase font-bold transition-all inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Sensor Stream</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Live Weather Current Observation Cards */}
          {currentWeather && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Latest AWS Surface Observation
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 tracking-wider">
                    POSTGRESQL TELEMETRY
                  </span>
                </div>
                {currentWeather.timestamp && (
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-500" />
                    <span>Observed: {formatDateLabel(currentWeather.timestamp)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* 1. Temperature */}
                <div className="p-3 rounded bg-[#0E1724]/90 border border-cyan-500/30">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                    <span>TEMPERATURE</span>
                    <Thermometer size={14} className="text-cyan-400" />
                  </div>
                  <div className="text-xl font-bold text-cyan-300">
                    {currentWeather.temperature != null ? `${currentWeather.temperature}°C` : 'N/A'}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    Chill: {currentWeather.apparentTemperature != null ? `${currentWeather.apparentTemperature}°C` : 'N/A'}{' '}
                    <span className="text-[8px] text-cyan-400/80">(Derived)</span>
                  </div>
                </div>

                {/* 2. Wind Speed */}
                <div className="p-3 rounded bg-[#0E1724]/90 border border-blue-500/30">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                    <span>WIND SPEED</span>
                    <Wind size={14} className="text-blue-400" />
                  </div>
                  <div className="text-xl font-bold text-blue-300">
                    {currentWeather.windSpeed != null ? `${currentWeather.windSpeed} m/s` : 'N/A'}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    Gust: {currentWeather.windGust != null ? `${currentWeather.windGust} m/s` : 'N/A'}{' '}
                    <span className="text-[8px] text-blue-400/80">(Derived)</span>
                  </div>
                </div>

                {/* 3. Wind Direction */}
                <div className="p-3 rounded bg-[#0E1724]/90 border border-[#1B2C42]">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                    <span>DIRECTION</span>
                    <Compass size={14} className="text-slate-400" />
                  </div>
                  <div className="text-base font-bold text-slate-200">
                    {currentWeather.windDirection || 'N/A'}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    {currentWeather.windSpeed > 15 ? 'Katabatic Flow' : 'Steady Vector'}
                  </div>
                </div>

                {/* 4. Atmospheric Pressure */}
                <div className="p-3 rounded bg-[#0E1724]/90 border border-[#1B2C42]">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                    <span>PRESSURE</span>
                    <Gauge size={14} className="text-purple-400" />
                  </div>
                  <div className="text-xl font-bold text-purple-300">
                    {currentWeather.pressure != null ? `${currentWeather.pressure}` : 'N/A'}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">hPa (Surface)</div>
                </div>

                {/* 5. Solar Radiation */}
                <div className="p-3 rounded bg-[#0E1724]/90 border border-amber-500/30">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                    <span>SOLAR GHI</span>
                    <Sun size={14} className="text-amber-400" />
                  </div>
                  <div className="text-xl font-bold text-amber-300">
                    {currentWeather.solarRadiation != null ? `${currentWeather.solarRadiation}` : 'N/A'}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">W/m² Irradiance</div>
                </div>

                {/* 6. Relative Humidity */}
                <div className="p-3 rounded bg-[#0E1724]/90 border border-[#1B2C42]">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                    <span>HUMIDITY</span>
                    <Droplets size={14} className="text-cyan-400" />
                  </div>
                  <div className="text-xl font-bold text-slate-200">
                    {currentWeather.humidity != null ? `${currentWeather.humidity}%` : 'N/A'}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    {currentWeather.humidity > 80 ? 'High Moisture' : 'Dry Polar Air'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Meteorological Sensor Trends Chart */}
          {history.length > 0 && (
            <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1B2C42]/60">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase flex items-center gap-2">
                    <CloudSun className="w-4 h-4 text-cyan-400" />
                    Historical Weather Observations ({history.length} Data Points)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Chronological meteorological sensor feed retrieved from PostgreSQL `weather_data`
                  </p>
                </div>

                {/* Metric Tab Selectors */}
                <div className="flex items-center gap-1.5 p-1 bg-[#0A121E] rounded border border-[#1B2C42] text-xs">
                  <button
                    onClick={() => setActiveTab('temperature')}
                    className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold transition-all ${
                      activeTab === 'temperature'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Temperature (°C)
                  </button>
                  <button
                    onClick={() => setActiveTab('wind')}
                    className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold transition-all ${
                      activeTab === 'wind'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Wind (m/s)
                  </button>
                  <button
                    onClick={() => setActiveTab('solar')}
                    className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold transition-all ${
                      activeTab === 'solar'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Solar (W/m²)
                  </button>
                  <button
                    onClick={() => setActiveTab('pressure')}
                    className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold transition-all ${
                      activeTab === 'pressure'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Pressure (hPa)
                  </button>
                </div>
              </div>

              {/* Chart Visual */}
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {activeTab === 'temperature' ? (
                    <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatTimeLabel}
                        stroke="#64748b"
                        fontSize={10}
                      />
                      <YAxis stroke="#64748b" fontSize={10} unit="°C" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0A121E',
                          borderColor: '#1B2C42',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                        }}
                        labelFormatter={(v) => formatDateLabel(v)}
                      />
                      <Area
                        type="monotone"
                        dataKey="temperature"
                        name="Ambient Temp (°C)"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        fill="url(#tempGradient)"
                      />
                      <Line
                        type="monotone"
                        dataKey="apparentTemperature"
                        name="Wind Chill (°C, Derived)"
                        stroke="#38bdf8"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </AreaChart>
                  ) : activeTab === 'wind' ? (
                    <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="windGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatTimeLabel}
                        stroke="#64748b"
                        fontSize={10}
                      />
                      <YAxis stroke="#64748b" fontSize={10} unit="m/s" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0A121E',
                          borderColor: '#1B2C42',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '11px',
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
                      />
                    </AreaChart>
                  ) : activeTab === 'solar' ? (
                    <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatTimeLabel}
                        stroke="#64748b"
                        fontSize={10}
                      />
                      <YAxis stroke="#64748b" fontSize={10} unit="W/m²" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0A121E',
                          borderColor: '#1B2C42',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '11px',
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
                      />
                    </AreaChart>
                  ) : (
                    <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1B2C42" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatTimeLabel}
                        stroke="#64748b"
                        fontSize={10}
                      />
                      <YAxis stroke="#64748b" fontSize={10} unit="hPa" domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0A121E',
                          borderColor: '#1B2C42',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                        }}
                        labelFormatter={(v) => formatDateLabel(v)}
                      />
                      <Line
                        type="monotone"
                        dataKey="pressure"
                        name="Atmospheric Pressure (hPa)"
                        stroke="#c084fc"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 3. Tabular Log of Historical Weather Records from PostgreSQL */}
          {history.length > 0 && (
            <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1B2C42]/50">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase">
                    PostgreSQL Weather Observations Log
                  </h3>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono tracking-wider">
                    TABLE: weather_data
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Displaying latest {history.length} records
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#0A121E] text-slate-400 uppercase text-[10px] border-b border-[#1B2C42]">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Temp (°C)</th>
                      <th className="py-2.5 px-3">Wind (m/s)</th>
                      <th className="py-2.5 px-3">Dir</th>
                      <th className="py-2.5 px-3">Pressure</th>
                      <th className="py-2.5 px-3">Solar (W/m²)</th>
                      <th className="py-2.5 px-3">Humidity</th>
                      <th className="py-2.5 px-3 text-right">Record ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1B2C42]/40 font-mono text-[11px]">
                    {[...history].reverse().map((record) => (
                      <tr key={record.id || String(record.timestamp)} className="hover:bg-[#122032]/50 transition-colors">
                        <td className="py-2 px-3 text-cyan-300 font-bold whitespace-nowrap">
                          {formatDateLabel(record.timestamp || record.createdAt)}
                        </td>
                        <td className="py-2 px-3 text-slate-200">{record.temperature}°C</td>
                        <td className="py-2 px-3 text-blue-300">{record.windSpeed} m/s</td>
                        <td className="py-2 px-3 text-slate-400">{record.windDirection || 'N/A'}</td>
                        <td className="py-2 px-3 text-purple-300">{record.pressure} hPa</td>
                        <td className="py-2 px-3 text-amber-300">{record.solarRadiation}</td>
                        <td className="py-2 px-3 text-slate-300">{record.humidity}%</td>
                        <td className="py-2 px-3 text-right text-[9px] text-slate-500 font-mono truncate max-w-[120px]">
                          {record.id ? record.id.substring(0, 8) + '...' : 'PG-NODE'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
