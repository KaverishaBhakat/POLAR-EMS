'use client';

import React from 'react';
import { Station, StationId, WeatherData, EnergyData } from '@/lib/types';
import { StatusBadge } from '../common/StatusBadge';
import { Building2, MapPin, Users, Sun, Wind, BatteryCharging, Cpu, ArrowRight, Zap, Thermometer } from 'lucide-react';
import { useStation } from '@/lib/context/StationContext';
import { useRouter } from 'next/navigation';

interface StationCardProps {
  station: Station;
  weather?: WeatherData | null;
  energy?: EnergyData | null;
  summary?: any;
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  weather,
  energy,
  summary,
}) => {
  const { activeStationId, setActiveStationId, addToast } = useStation();
  const router = useRouter();

  const stationKey = (station.code ? station.code.toLowerCase() : station.id) as StationId;
  const isActive = activeStationId === stationKey || activeStationId === station.id;

  const handleEnterControl = () => {
    setActiveStationId(stationKey);
    addToast({
      type: 'INFO',
      title: 'Active Station Switched',
      message: `Now monitoring ${station.name}.`,
    });
    router.push('/dashboard');
  };

  // Derive coordinates from PostgreSQL latitude/longitude or existing coordinates object
  const latStr =
    station.latitude != null
      ? `${Math.abs(station.latitude).toFixed(2)}°${station.latitude < 0 ? 'S' : 'N'}`
      : station.coordinates?.lat || 'N/A';
  const lngStr =
    station.longitude != null
      ? `${Math.abs(station.longitude).toFixed(2)}°${station.longitude < 0 ? 'W' : 'E'}`
      : station.coordinates?.lng || 'N/A';

  // Live Demand / Load
  const hasLiveEnergy = summary?.latestEnergy?.totalLoad != null;
  const demandDisplay = hasLiveEnergy
    ? `${summary.latestEnergy.totalLoad} kW`
    : energy?.currentLoadKW != null
    ? `${energy.currentLoadKW} kW`
    : 'Awaiting SCADA Ingestion';

  // Live Renewables
  const hasLiveRenewable = summary?.latestRenewable?.totalRenewable != null;
  const renewableDisplay = hasLiveRenewable
    ? `${summary.latestRenewable.totalRenewable} kW`
    : energy?.totalRenewableKW != null
    ? `${energy.totalRenewableKW} kW`
    : '0 kW';

  // Battery BESS (From PostgreSQL Battery table)
  const dbBattery = summary?.batteries?.[0];
  const batteryDisplay = dbBattery
    ? `${dbBattery.currentSOC}% (${Math.round((dbBattery.currentSOC / 100) * dbBattery.capacity)} kWh)`
    : energy?.batterySocPercent != null
    ? `${energy.batterySocPercent}% (${energy.batteryCurrentKWh} kWh)`
    : 'BESS Offline';

  // Weather Telemetry (From PostgreSQL WeatherData table)
  const dbWeather = summary?.latestWeather;
  const weatherDisplay = dbWeather
    ? `${dbWeather.temperature}°C | ${dbWeather.windSpeed} m/s`
    : weather?.temperature != null
    ? `${weather.temperature}°C | ${weather.windSpeed} m/s`
    : 'Awaiting Telemetry';

  // Generator Fleet (From PostgreSQL Generator table)
  const dbGenerators = summary?.generators;
  const genCount = dbGenerators ? dbGenerators.length : station.generatorCount || 4;
  const genCap = dbGenerators
    ? dbGenerators.reduce((sum: number, g: any) => sum + (g.capacity || 0), 0)
    : station.generatorCapacityKVA || 320;

  // Battery Capacity
  const batteryCap = dbBattery ? dbBattery.capacity : station.batteryCapacityKWh || 350;

  // Solar & Wind Specs
  const solarSpec = station.installedSolarKW || (stationKey === 'maitri' ? 100 : 150);
  const windSpec = station.installedWindKW || (stationKey === 'maitri' ? 80 : 120);
  const personnelSpec = station.currentPersonnel || (stationKey === 'maitri' ? 38 : 44);

  return (
    <div
      className={`rounded-lg border p-5 font-mono transition-all duration-300 ${
        isActive
          ? 'bg-[#0E1B2C]/95 border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30'
          : 'bg-[#0E1724]/90 border-[#1B2C42] hover:border-cyan-500/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3.5 pb-2.5 border-b border-[#1B2C42]/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-white uppercase">{station.name}</h3>
            <StatusBadge status={station.status} size="sm" />
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono tracking-wider">
              POSTGRESQL NODE
            </span>
          </div>
          {station.hindiName && (
            <p className="text-[11px] text-cyan-400 mt-0.5">{station.hindiName}</p>
          )}
          <p className="text-[10px] text-slate-400 mt-0.5">{station.location}</p>
          {station.description && (
            <p className="text-[10px] text-slate-500 mt-1 max-w-2xl line-clamp-1">
              {station.description}
            </p>
          )}
        </div>

        <button
          onClick={handleEnterControl}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase transition-all ${
            isActive
              ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]'
              : 'bg-[#122032] text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30'
          }`}
        >
          <span>{isActive ? 'ACTIVE STATION' : 'ENTER CONTROL'}</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Main Specs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 text-xs">
        <div className="p-2.5 rounded bg-[#0A121E] border border-[#1B2C42]">
          <span className="text-[10px] text-slate-400 block">CURRENT DEMAND</span>
          <span className="text-base font-bold text-emerald-400">{demandDisplay}</span>
        </div>

        <div className="p-2.5 rounded bg-[#0A121E] border border-[#1B2C42]">
          <span className="text-[10px] text-slate-400 block">RENEWABLES</span>
          <span className="text-base font-bold text-cyan-300">{renewableDisplay}</span>
        </div>

        <div className="p-2.5 rounded bg-[#0A121E] border border-[#1B2C42]">
          <span className="text-[10px] text-slate-400 block">BATTERY BESS</span>
          <span className="text-base font-bold text-slate-100">{batteryDisplay}</span>
        </div>

        <div className="p-2.5 rounded bg-[#0A121E] border border-[#1B2C42]">
          <span className="text-[10px] text-slate-400 block">WEATHER</span>
          <span className="text-base font-bold text-blue-300">{weatherDisplay}</span>
        </div>
      </div>

      {/* Infrastructure Details */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-300 pt-2 border-t border-[#1B2C42]/50">
        <div>
          <span className="text-slate-400">Coordinates:</span> {latStr}, {lngStr}
        </div>
        <div>
          <span className="text-slate-400">Solar PV Array:</span> {solarSpec} kW <span className="text-[9px] text-slate-500 font-mono">(Spec)</span>
        </div>
        <div>
          <span className="text-slate-400">Wind Turbine Fleet:</span> {windSpec} kW <span className="text-[9px] text-slate-500 font-mono">(Spec)</span>
        </div>
        <div>
          <span className="text-slate-400">Battery Capacity:</span> {batteryCap} kWh <span className="text-[9px] text-cyan-400/80 font-mono">(DB BESS)</span>
        </div>
        <div>
          <span className="text-slate-400">Generators:</span> {genCount} Units ({genCap} kW) <span className="text-[9px] text-cyan-400/80 font-mono">(DB Gensets)</span>
        </div>
        <div>
          <span className="text-slate-400">Station Personnel:</span> {personnelSpec} Scientists / Engineers <span className="text-[9px] text-slate-500 font-mono">(Ref)</span>
        </div>
      </div>
    </div>
  );
};
