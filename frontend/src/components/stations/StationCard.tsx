'use client';

import React from 'react';
import { Station, WeatherData, EnergyData } from '@/lib/types';
import { StatusBadge } from '../common/StatusBadge';
import { Building2, MapPin, Users, Sun, Wind, BatteryCharging, Cpu, ArrowRight, Zap, Thermometer } from 'lucide-react';
import { useStation } from '@/lib/context/StationContext';
import { useRouter } from 'next/navigation';

interface StationCardProps {
  station: Station;
  weather: WeatherData;
  energy: EnergyData;
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  weather,
  energy,
}) => {
  const { activeStationId, setActiveStationId, addToast } = useStation();
  const router = useRouter();
  const isActive = activeStationId === station.id;

  const handleEnterControl = () => {
    setActiveStationId(station.id);
    addToast({
      type: 'INFO',
      title: 'Active Station Switched',
      message: `Now monitoring ${station.name}.`,
    });
    router.push('/dashboard');
  };

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
          </div>
          <p className="text-[11px] text-cyan-400 mt-0.5">{station.hindiName}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{station.location}</p>
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
          <span className="text-base font-bold text-emerald-400">{energy.currentLoadKW} kW</span>
        </div>

        <div className="p-2.5 rounded bg-[#0A121E] border border-[#1B2C42]">
          <span className="text-[10px] text-slate-400 block">RENEWABLES</span>
          <span className="text-base font-bold text-cyan-300">{energy.totalRenewableKW} kW</span>
        </div>

        <div className="p-2.5 rounded bg-[#0A121E] border border-[#1B2C42]">
          <span className="text-[10px] text-slate-400 block">BATTERY BESS</span>
          <span className="text-base font-bold text-slate-100">{energy.batterySocPercent}% ({energy.batteryCurrentKWh} kWh)</span>
        </div>

        <div className="p-2.5 rounded bg-[#0A121E] border border-[#1B2C42]">
          <span className="text-[10px] text-slate-400 block">WEATHER</span>
          <span className="text-base font-bold text-blue-300">{weather.temperature}°C | {weather.windSpeed} m/s</span>
        </div>
      </div>

      {/* Infrastructure Details */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-300 pt-2 border-t border-[#1B2C42]/50">
        <div>
          <span className="text-slate-400">Coordinates:</span> {station.coordinates.lat}, {station.coordinates.lng}
        </div>
        <div>
          <span className="text-slate-400">Solar PV Array:</span> {station.installedSolarKW} kW
        </div>
        <div>
          <span className="text-slate-400">Wind Turbine Fleet:</span> {station.installedWindKW} kW
        </div>
        <div>
          <span className="text-slate-400">Battery Capacity:</span> {station.batteryCapacityKWh} kWh
        </div>
        <div>
          <span className="text-slate-400">Generators:</span> {station.generatorCount} Units ({station.generatorCapacityKVA} kVA)
        </div>
        <div>
          <span className="text-slate-400">Station Personnel:</span> {station.currentPersonnel} Scientists / Engineers
        </div>
      </div>
    </div>
  );
};
