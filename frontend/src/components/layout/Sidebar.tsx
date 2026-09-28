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
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Zap,
  UploadCloud,
  CloudSun,
  Leaf,
  Cpu,
  BatteryCharging,
  BrainCircuit,
  Compass,
  Sparkles,
  LucideIcon,
} from 'lucide-react';

interface NavGroup {
  title: string;
  items: {
    name: string;
    href: string;
    icon: LucideIcon;
    badge?: string;
    showBadgeCount?: boolean;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'OPERATIONS',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: Activity, badge: 'LIVE' },
      { name: 'Stations', href: '/stations', icon: MapPin },
      { name: 'Weather', href: '/weather', icon: CloudSun },
      { name: 'Energy', href: '/energy', icon: Zap },
      { name: 'Renewables', href: '/renewable', icon: Leaf },
      { name: 'Generators', href: '/generators', icon: Cpu },
      { name: 'Battery BESS', href: '/battery', icon: BatteryCharging },
      { name: 'Alerts', href: '/alerts', icon: Bell, showBadgeCount: true },
    ],
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { name: 'AI Assistant', href: '/ai-assistant', icon: BrainCircuit, badge: 'LLM' },
      { name: 'Forecast', href: '/forecast', icon: TrendingUp },
      { name: 'Optimization', href: '/optimization', icon: Sliders, badge: 'MILP' },
      { name: 'Resilience', href: '/resilience', icon: ShieldCheck, badge: 'STRESS' },
      { name: 'Simulation', href: '/simulation', icon: PlaySquare },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'DATA',
    items: [
      { name: 'Data Ingestion', href: '/data-upload', icon: UploadCloud },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { unreadAlertCount, currentUser, activeStationId } = useStation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`relative z-40 flex flex-col justify-between bg-[#050506] border-r border-white/[0.06] transition-all duration-300 ${
        collapsed ? 'w-18' : 'w-64'
      } flex-shrink-0 h-screen sticky top-0 select-none`}
    >
      {/* Top Header & Branding */}
      <div>
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.06]">
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden group">
            <div className="w-8 h-8 rounded-xl bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 flex items-center justify-center flex-shrink-0 text-[#5E6AD2] group-hover:border-[#5E6AD2]/60 group-hover:bg-[#5E6AD2]/25 transition-all shadow-sm">
              <Compass className="w-4 h-4" />
            </div>
            {!collapsed && (
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold tracking-tight text-[#EDEDEF]">
                    POLAR-EMS
                  </span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/[0.06] text-[#8A8F98]">
                    v2.4
                  </span>
                </div>
                <p className="text-[10px] text-[#8A8F98] tracking-tight">
                  Antarctic Microgrid Ops
                </p>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle Sidebar"
            className="p-1 rounded-lg text-[#8A8F98] hover:text-[#EDEDEF] hover:bg-white/[0.06] transition-colors"
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="p-2 space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)] scrollbar-thin">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-0.5">
              {!collapsed && (
                <div className="px-2.5 py-1 text-[10px] font-mono font-medium tracking-wider text-[#8A8F98]/70 uppercase">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 group ${
                      isActive
                        ? 'bg-[#5E6AD2]/15 text-[#EDEDEF] font-medium border border-[#5E6AD2]/30 shadow-[0_0_12px_rgba(94,106,210,0.15)]'
                        : 'text-[#8A8F98] hover:text-[#EDEDEF] hover:bg-white/[0.04]'
                    }`}
                    title={collapsed ? item.name : undefined}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        size={15}
                        className={`flex-shrink-0 transition-colors ${
                          isActive ? 'text-[#5E6AD2]' : 'text-[#8A8F98] group-hover:text-[#EDEDEF]'
                        }`}
                      />
                      {!collapsed && <span>{item.name}</span>}
                    </div>

                    {!collapsed && item.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-medium ${
                          isActive
                            ? 'bg-[#5E6AD2]/30 text-[#EDEDEF]'
                            : 'bg-white/[0.05] text-[#8A8F98]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {!collapsed && item.showBadgeCount && unreadAlertCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-rose-500 text-white rounded-full font-bold">
                        {unreadAlertCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Node Identity & Status */}
      <div className="p-3 border-t border-white/[0.06] bg-[#020203]/40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
            {activeStationId === 'maitri' ? 'M' : 'B'}
          </div>
          {!collapsed && (
            <div className="overflow-hidden text-left text-xs leading-tight">
              <p className="font-medium text-[#EDEDEF] truncate">
                {activeStationId === 'maitri' ? 'Maitri Node' : 'Bharati Node'}
              </p>
              <p className="text-[10px] text-emerald-400/80 font-mono truncate mt-0.5">
                SCADA Active
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
