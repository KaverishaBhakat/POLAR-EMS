'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStation } from '@/lib/context/StationContext';
import { StationId } from '@/lib/types';
import {
  Radio,
  Bell,
  Thermometer,
  Wind,
  Clock,
  ShieldCheck,
  ChevronDown,
  RefreshCw,
  Building2,
  Sparkles,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeStationId,
    setActiveStationId,
    station,
    weather,
    unreadAlertCount,
    isLiveTelemetry,
    setIsLiveTelemetry,
    lastTelemetryTick,
    addToast,
  } = useStation();

  const [utcTime, setUtcTime] = useState<string>('');
  const [stationTime, setStationTime] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
      // Indian Standard / Research Station Log Time (UTC+5:30 or UTC+5)
      setStationTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' IST'
      );
    };
    updateClocks();
    const timer = setInterval(updateClocks, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStationChange = (id: StationId) => {
    setActiveStationId(id);
    setDropdownOpen(false);
    addToast({
      type: 'INFO',
      title: 'Station Telemetry Switched',
      message: `Active control stream changed to ${
        id === 'maitri' ? 'Maitri Research Station' : 'Bharati Research Station'
      }.`,
    });
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 bg-[#0A111C]/95 backdrop-blur-md border-b border-[#1B2C42]/80 text-slate-200">
      {/* Left: Station Selector & Demo Environment Badge */}
      <div className="flex items-center gap-3">
        {/* Station Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded bg-[#101A28] border border-cyan-500/40 hover:border-cyan-400 transition-all text-xs font-mono tracking-wider text-slate-100 shadow-[0_0_10px_rgba(6,182,212,0.1)] focus:outline-none"
          >
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-white">
              {station?.name || 'Maitri Research Station'}
            </span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-64 rounded-md bg-[#0D1624] border border-[#1B2C42] shadow-2xl z-50 py-1.5">
              <div className="px-3 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-[#1B2C42]/60">
                Select Active Station
              </div>
              <button
                onClick={() => handleStationChange('maitri')}
                className={`w-full text-left px-3 py-2 text-xs font-mono flex items-center justify-between hover:bg-[#152336] ${
                  activeStationId === 'maitri' ? 'text-cyan-300 font-bold bg-cyan-500/10' : 'text-slate-300'
                }`}
              >
                <div>
                  <div>Maitri Research Station</div>
                  <div className="text-[10px] text-slate-400">Schirmacher Oasis (70°S)</div>
                </div>
                {activeStationId === 'maitri' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                )}
              </button>
              <button
                onClick={() => handleStationChange('bharati')}
                className={`w-full text-left px-3 py-2 text-xs font-mono flex items-center justify-between hover:bg-[#152336] ${
                  activeStationId === 'bharati' ? 'text-cyan-300 font-bold bg-cyan-500/10' : 'text-slate-300'
                }`}
              >
                <div>
                  <div>Bharati Research Station</div>
                  <div className="text-[10px] text-slate-400">Larsemann Hills (69°S)</div>
                </div>
                {activeStationId === 'bharati' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Demo Environment Badge */}
        <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300">
          <Sparkles size={11} className="text-amber-400" />
          Demo Environment (Simulated SCADA)
        </span>
      </div>

      {/* Right: Weather Telemetry, Live Clock, Connection Status & Notifications */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* Quick Weather Telemetry */}
        {weather && (
          <div className="hidden lg:flex items-center gap-4 text-xs font-mono bg-[#0D1724] px-3 py-1 rounded border border-[#1B2C42]">
            <div className="flex items-center gap-1.5 text-cyan-300" title="Ambient Temperature">
              <Thermometer size={14} className="text-cyan-400" />
              <span>{weather.temperature}°C</span>
              <span className="text-[10px] text-slate-400">({weather.apparentTemperature}°C)</span>
            </div>
            <div className="w-[1px] h-3 bg-[#1B2C42]" />
            <div className="flex items-center gap-1.5 text-blue-300" title="Wind Velocity">
              <Wind size={14} className="text-blue-400" />
              <span>{weather.windSpeed} m/s</span>
            </div>
          </div>
        )}

        {/* Live Clocks */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-300 bg-[#0D1724] px-3 py-1 rounded border border-[#1B2C42]">
          <Clock size={13} className="text-slate-400" />
          <span className="text-slate-100 font-semibold">{stationTime}</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">{utcTime}</span>
        </div>

        {/* Telemetry Pulse / Live Status */}
        <button
          onClick={() => setIsLiveTelemetry(!isLiveTelemetry)}
          className={`flex items-center gap-2 text-xs font-mono px-2.5 py-1 rounded border transition-all ${
            isLiveTelemetry
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
              : 'border-slate-600 bg-slate-800/50 text-slate-400'
          }`}
          title="Toggle Live Telemetry Simulation"
        >
          <Radio
            size={13}
            className={isLiveTelemetry ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}
          />
          <span className="hidden sm:inline font-bold">
            {isLiveTelemetry ? 'TELEMETRY: LIVE' : 'TELEMETRY: PAUSED'}
          </span>
        </button>

        {/* Notifications Icon */}
        <Link
          href="/alerts"
          className="relative p-1.5 rounded bg-[#101A28] border border-[#1B2C42] hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition-colors"
          title="System Alerts"
        >
          <Bell size={16} />
          {unreadAlertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
              {unreadAlertCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
};
