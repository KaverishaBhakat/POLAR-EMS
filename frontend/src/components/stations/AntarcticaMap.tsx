'use client';

import React from 'react';
import { useStation } from '@/lib/context/StationContext';
import { StationId } from '@/lib/types';
import { MapPin, Compass, Radio, Building2, Wind, Thermometer, ArrowRight, Zap, BatteryCharging } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { useRouter } from 'next/navigation';

export const AntarcticaMap: React.FC = () => {
  const { activeStationId, setActiveStationId, addToast } = useStation();
  const router = useRouter();

  const handleSelectStation = (id: StationId) => {
    setActiveStationId(id);
    addToast({
      type: 'INFO',
      title: 'Station Selected',
      message: `Navigating to ${id === 'maitri' ? 'Maitri' : 'Bharati'} Research Station dashboard.`,
    });
    router.push('/dashboard');
  };

  return (
    <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2.5 border-b border-[#1B2C42]/50">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            Indian Antarctic Research Stations Spatial Radar
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Geographic telemetry coordinates, microclimate conditions & active station hubs
          </p>
        </div>
      </div>

      {/* Stylized Polar Map Visual */}
      <div className="relative w-full h-80 sm:h-96 rounded-lg bg-[#070D16] border border-[#1B2C42] overflow-hidden flex items-center justify-center">
        {/* Polar grid concentric circles */}
        <div className="absolute w-[500px] h-[500px] rounded-full border border-cyan-500/10 pointer-events-none" />
        <div className="absolute w-[360px] h-[360px] rounded-full border border-cyan-500/15 pointer-events-none" />
        <div className="absolute w-[220px] h-[220px] rounded-full border border-cyan-500/20 pointer-events-none" />
        <div className="absolute w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] pointer-events-none" />
        <span className="absolute top-[52%] text-[9px] text-cyan-500/60 font-mono pointer-events-none">
          SOUTH POLE (90°S)
        </span>

        {/* Latitude Lines */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-[1px] bg-cyan-500/10" />
          <div className="h-full w-[1px] bg-cyan-500/10 absolute" />
        </div>

        {/* Station 1 Marker: MAITRI (Schirmacher Oasis, 70°45'S, 11°44'E) */}
        <div className="absolute top-[28%] left-[28%] z-20">
          <div className="relative group">
            <button
              onClick={() => handleSelectStation('maitri')}
              className={`flex items-center gap-2 p-2.5 rounded-lg border backdrop-blur-md transition-all duration-300 ${
                activeStationId === 'maitri'
                  ? 'bg-[#0A1828] border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] ring-2 ring-cyan-500/30'
                  : 'bg-[#0A121E]/90 border-[#1B2C42] hover:border-cyan-500/50'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping absolute -top-1 -left-1" />
              <div className="w-3 h-3 rounded-full bg-cyan-400" />
              <div className="text-left">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>MAITRI STATION</span>
                  <StatusBadge status="OPERATIONAL" size="sm" showDot={false} />
                </div>
                <div className="text-[10px] text-slate-300 flex items-center gap-2 mt-0.5">
                  <span>70°45&apos;S, 11°44&apos;E</span>
                  <span className="text-cyan-400 font-bold">428 kW</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Station 2 Marker: BHARATI (Larsemann Hills, 69°24'S, 76°11'E) */}
        <div className="absolute top-[32%] right-[24%] z-20">
          <div className="relative group">
            <button
              onClick={() => handleSelectStation('bharati')}
              className={`flex items-center gap-2 p-2.5 rounded-lg border backdrop-blur-md transition-all duration-300 ${
                activeStationId === 'bharati'
                  ? 'bg-[#0A1828] border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] ring-2 ring-cyan-500/30'
                  : 'bg-[#0A121E]/90 border-[#1B2C42] hover:border-cyan-500/50'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute -top-1 -left-1" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <div className="text-left">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>BHARATI STATION</span>
                  <StatusBadge status="OPERATIONAL" size="sm" showDot={false} />
                </div>
                <div className="text-[10px] text-slate-300 flex items-center gap-2 mt-0.5">
                  <span>69°24&apos;S, 76°11&apos;E</span>
                  <span className="text-emerald-400 font-bold">485 kW</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
