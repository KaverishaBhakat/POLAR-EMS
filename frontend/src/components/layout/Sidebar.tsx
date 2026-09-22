'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStation } from '@/lib/context/StationContext';
import {
  Activity,
  TrendingUp,
  Sliders,
  PlaySquare,
  BarChart3,
  MapPin,
  Bell,
  Settings,
  Shield,
  Radio,
  ChevronLeft,
  ChevronRight,
  User,
  Compass,
  Zap,
  UploadCloud,
  CloudSun,
  Leaf,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: Activity, badge: 'LIVE' },
  { name: 'Energy', href: '/energy', icon: Zap, badge: 'LOAD' },
  { name: 'Renewables', href: '/renewable', icon: Leaf, badge: 'CLEAN' },
  { name: 'Weather', href: '/weather', icon: CloudSun, badge: 'AWS' },
  { name: 'Data Ingestion', href: '/data-upload', icon: UploadCloud, badge: 'INGEST' },
  { name: 'Forecast', href: '/forecast', icon: TrendingUp, badge: 'AI' },
  { name: 'Optimization', href: '/optimization', icon: Sliders, badge: 'SAVE 21%' },
  { name: 'Simulation', href: '/simulation', icon: PlaySquare, badge: 'TEST' },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Stations', href: '/stations', icon: MapPin },
  { name: 'Alerts', href: '/alerts', icon: Bell, showBadgeCount: true },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { unreadAlertCount, currentUser } = useStation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`relative z-40 flex flex-col justify-between bg-[#0A111C] border-r border-[#1B2C42] transition-all duration-300 ${
        collapsed ? 'w-18' : 'w-64'
      } flex-shrink-0 h-screen sticky top-0`}
    >
      {/* Top Header & Branding */}
      <div>
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#1B2C42]/80">
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-md bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/50 flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
              <Compass className="w-5 h-5 text-cyan-400 animate-spin-slow" />
            </div>
            {!collapsed && (
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm font-bold tracking-wider text-slate-100">
                    POLAR<span className="text-cyan-400">-EMS</span>
                  </span>
                  <span className="text-[9px] font-mono px-1 py-0.2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded">
                    v2.4
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 tracking-tight font-mono">
                  INDIAN ANTARCTIC PROGRAMME
                </p>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle Sidebar"
            className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-[#121E2E] transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Operational Status Pill */}
        <div className="px-3 py-2.5 mx-2 my-2.5 rounded border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
                SYSTEM OPERATIONAL
              </p>
              <p className="text-[9px] text-slate-400 font-mono truncate">
                MICROGRID STABLE (50.0 Hz)
              </p>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="px-2 py-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-md font-mono text-xs transition-all duration-200 ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)] font-semibold'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-[#121F30] border border-transparent'
                }`}
                title={collapsed ? item.name : undefined}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-300'
                    }`}
                  />
                  {!collapsed && <span>{item.name}</span>}
                </div>

                {!collapsed && item.showBadgeCount && unreadAlertCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                    {unreadAlertCount}
                  </span>
                )}

                {!collapsed && item.badge && !item.showBadgeCount && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                      isActive
                        ? 'bg-cyan-400/20 text-cyan-200'
                        : 'bg-[#152336] text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom User / Station Controller Profile */}
      <div className="p-3 border-t border-[#1B2C42]/80 bg-[#080E17]">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#16273B] border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-mono text-xs font-bold flex-shrink-0">
              {currentUser?.initials || <User size={14} />}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate font-mono" title={currentUser?.name}>
                {currentUser?.name || 'Station Officer'}
              </p>
              <p className="text-[10px] text-slate-400 truncate" title={currentUser?.role}>
                {currentUser?.role || 'Station SCADA Operator'}
              </p>
            </div>
            <Link
              href="/settings"
              className="text-slate-400 hover:text-cyan-400 p-1"
              title="Settings"
            >
              <Settings size={14} />
            </Link>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded bg-[#16273B] border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-mono text-xs font-bold" title={currentUser?.name}>
              {currentUser?.initials || 'SO'}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
