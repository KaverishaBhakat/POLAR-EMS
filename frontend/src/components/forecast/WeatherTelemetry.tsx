'use client';

import React from 'react';
import { WeatherData } from '@/lib/types';
import {
  Thermometer,
  Wind,
  Droplets,
  Compass,
  Sun,
  Eye,
  AlertTriangle,
  Gauge,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface WeatherTelemetryProps {
  weather: WeatherData | null;
}

export const WeatherTelemetry: React.FC<WeatherTelemetryProps> = ({ weather }) => {
  if (!weather) {
    return (
      <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5 font-mono">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            Antarctic Weather Telemetry & Forecast Inputs
          </h3>
          <StatusBadge status="STANDBY" label="NO LIVE SENSORS" size="sm" />
        </div>
        <p className="text-xs text-slate-400">
          No live meteorological telemetry is recorded in PostgreSQL for this station node yet. Ingest AWS observations via Data Ingestion Hub.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-[#1B2C42]/50">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            Antarctic Weather Telemetry & Forecast Inputs
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Real-time automated weather station (AWS) sensor feed & microclimate parameters
          </p>
        </div>
        <StatusBadge
          status={weather.blizzardRisk === 'LOW' ? 'OPERATIONAL' : 'WARNING'}
          label={`BLIZZARD RISK: ${weather.blizzardRisk}`}
          size="sm"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Temperature */}
        <div className="p-3 rounded bg-[#0A121E] border border-cyan-500/20 font-mono">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span>TEMPERATURE</span>
            <Thermometer size={14} className="text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-300">{weather.temperature}°C</div>
          <div className="text-[9px] text-slate-400 mt-0.5">
            Chill: {weather.apparentTemperature}°C
          </div>
        </div>

        {/* Wind Speed */}
        <div className="p-3 rounded bg-[#0A121E] border border-blue-500/20 font-mono">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span>WIND SPEED</span>
            <Wind size={14} className="text-blue-400" />
          </div>
          <div className="text-xl font-bold text-blue-300">{weather.windSpeed} m/s</div>
          <div className="text-[9px] text-slate-400 mt-0.5">Gust: {weather.windGust} m/s</div>
        </div>

        {/* Wind Direction */}
        <div className="p-3 rounded bg-[#0A121E] border border-[#1B2C42] font-mono">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span>DIRECTION</span>
            <Compass size={14} className="text-slate-400" />
          </div>
          <div className="text-base font-bold text-slate-200">{weather.windDirection}</div>
          <div className="text-[9px] text-slate-400 mt-0.5">Katabatic flow</div>
        </div>

        {/* Atmospheric Pressure */}
        <div className="p-3 rounded bg-[#0A121E] border border-[#1B2C42] font-mono">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span>PRESSURE</span>
            <Gauge size={14} className="text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-300">{weather.pressure}</div>
          <div className="text-[9px] text-slate-400 mt-0.5">hPa (Stable)</div>
        </div>

        {/* Solar Radiation */}
        <div className="p-3 rounded bg-[#0A121E] border border-amber-500/20 font-mono">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span>SOLAR IRRADIANCE</span>
            <Sun size={14} className="text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-300">{weather.solarRadiation}</div>
          <div className="text-[9px] text-slate-400 mt-0.5">W/m² Global</div>
        </div>

        {/* Humidity */}
        <div className="p-3 rounded bg-[#0A121E] border border-[#1B2C42] font-mono">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span>HUMIDITY</span>
            <Droplets size={14} className="text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-slate-200">{weather.humidity}%</div>
          <div className="text-[9px] text-slate-400 mt-0.5">Vis: {weather.visibility}</div>
        </div>
      </div>
    </div>
  );
};
