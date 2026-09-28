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
  ChevronDown,
  Building2,
  Sparkles,
  User,
  Activity,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeStationId,
    setActiveStationId,
    station,
    weather,
    unreadAlertCount,
    isLiveTelemetry,
    currentUser,
    addToast,
  } = useStation();

  const [utcTime, setUtcTime] = useState<string>('');
  const [stationTime, setStationTime] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
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
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 sm:px-8 py-3 bg-[#050506]/80 backdrop-blur-xl border-b border-white/[0.06] text-[#EDEDEF] transition-colors duration-200">
      {/* Left: Station Selector Dropdown */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.08] transition-all text-xs font-medium text-[#EDEDEF] focus:outline-none group shadow-sm"
          >
            <Building2 className="w-3.5 h-3.5 text-[#5E6AD2]" />
            <span className="font-medium">
              {station?.name || 'Maitri Research Station'}
            </span>
            <ChevronDown size={13} className="text-[#8A8F98] group-hover:text-[#EDEDEF] transition-transform duration-200" />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-64 rounded-xl bg-[#0A0A0C] border border-white/[0.1] shadow-2xl z-50 py-1.5 overflow-hidden backdrop-blur-xl">
              <div className="px-3 py-1 text-[10px] font-mono text-[#8A8F98] uppercase tracking-wider border-b border-white/[0.06]">
                Active Node Selector
              </div>
              <button
                onClick={() => handleStationChange('maitri')}
                className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors ${
                  activeStationId === 'maitri'
                    ? 'text-[#5E6AD2] font-semibold bg-[#5E6AD2]/10'
                    : 'text-[#EDEDEF] hover:bg-white/[0.05]'
                }`}
              >
                <div>
                  <div className="font-medium">Maitri Research Station</div>
                  <div className="text-[10px] text-[#8A8F98]">Schirmacher Oasis (70°S)</div>
                </div>
                {activeStationId === 'maitri' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5E6AD2]" />
                )}
              </button>
              <button
                onClick={() => handleStationChange('bharati')}
                className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors ${
                  activeStationId === 'bharati'
                    ? 'text-[#5E6AD2] font-semibold bg-[#5E6AD2]/10'
                    : 'text-[#EDEDEF] hover:bg-white/[0.05]'
                }`}
              >
                <div>
                  <div className="font-medium">Bharati Research Station</div>
                  <div className="text-[10px] text-[#8A8F98]">Larsemann Hills (69°S)</div>
                </div>
                {activeStationId === 'bharati' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5E6AD2]" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>415V SCADA Synced</span>
        </div>
      </div>

      {/* Right: Weather metrics, clocks, alerts, user */}
      <div className="flex items-center gap-3 sm:gap-5">
        {weather && (
          <div className="hidden lg:flex items-center gap-3 text-xs font-mono border-r border-white/[0.06] pr-4 text-[#8A8F98]">
            <div className="flex items-center gap-1.5">
              <Thermometer size={13} className="text-[#5E6AD2]" />
              <span className="font-medium text-[#EDEDEF]">
                {weather.temperature !== undefined ? `${weather.temperature.toFixed(1)}°C` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wind size={13} className="text-[#5E6AD2]" />
              <span className="font-medium text-[#EDEDEF]">
                {weather.windSpeed !== undefined ? `${weather.windSpeed.toFixed(1)} m/s` : 'N/A'}
              </span>
            </div>
          </div>
        )}

        <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-[#8A8F98]">
          <Clock size={12} className="text-[#5E6AD2]" />
          <span>{stationTime}</span>
        </div>

        {/* Alerts Bell */}
        <Link
          href="/alerts"
          className="relative p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[#8A8F98] hover:text-[#EDEDEF] transition-colors"
          title="Telemetry Alerts"
        >
          <Bell size={15} />
          {unreadAlertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#050506]" />
          )}
        </Link>

        {/* User Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-white/[0.06]">
          <div className="w-7 h-7 rounded-lg bg-[#5E6AD2]/20 border border-[#5E6AD2]/40 text-[#EDEDEF] flex items-center justify-center font-medium text-xs">
            {currentUser?.initials || 'KB'}
          </div>
          <div className="hidden xl:block text-left text-xs leading-none">
            <p className="font-medium text-[#EDEDEF]">
              {currentUser?.name || 'Kaverisha Bhakat'}
            </p>
            <p className="text-[10px] text-[#8A8F98] mt-0.5">
              SCADA Lead
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
