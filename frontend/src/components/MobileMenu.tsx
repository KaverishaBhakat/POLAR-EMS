'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  Compass,
  Activity,
  MapPin,
  TrendingUp,
  Sliders,
  PlaySquare,
  BarChart3,
  Bell,
  Settings,
  LogIn,
  UserPlus,
  ArrowRight,
  CloudSun,
  Zap,
} from 'lucide-react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const DASHBOARD_ROUTES = [
  { name: 'Live SCADA Operations', href: '/dashboard', icon: Activity, badge: 'LIVE' },
  { name: 'Microgrid Energy & Load Ops', href: '/energy', icon: Zap, badge: 'LOAD' },
  { name: 'Polar Meteorology & Weather', href: '/weather', icon: CloudSun, badge: 'AWS' },
  { name: 'Antarctic Stations (Maitri & Bharati)', href: '/stations', icon: MapPin },
  { name: 'AI Load & Weather Forecast', href: '/forecast', icon: TrendingUp, badge: 'AI' },
  { name: 'MILP Dispatch Optimization', href: '/optimization', icon: Sliders, badge: 'SAVE 21%' },
  { name: 'Extreme Simulation Lab', href: '/simulation', icon: PlaySquare, badge: 'TEST' },
  { name: 'Microgrid ESG Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Telemetry Alerts & Safety', href: '/alerts', icon: Bell },
  { name: 'Station Settings & SCADA Config', href: '/settings', icon: Settings },
];

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-[#070D16] transition-all duration-500 font-mono ${
        isOpen ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none'
      }`}
      aria-hidden={!isOpen}
    >
      <div
        className={`w-full h-full flex flex-col justify-between overflow-y-auto transition-transform duration-500 p-6 sm:p-8 ${
          isOpen ? 'translate-y-0' : '-translate-y-8'
        }`}
      >
        {/* Header / Brand & Close button */}
        <div className="flex items-center justify-between border-b border-[#1B2C42] pb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/60 flex items-center justify-center text-cyan-400">
              <Compass size={18} className="animate-spin-slow" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wider">
                POLAR<span className="text-cyan-400">-EMS</span>
              </div>
              <div className="text-[9px] text-slate-400">INDIAN ANTARCTIC PROGRAMME</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white transition-colors duration-200 hover:border-cyan-400 hover:text-cyan-400 focus:outline-none"
          >
            <X size={18} />
          </button>
        </div>

        {/* Auth CTA Banner: Sign In & Sign Up */}
        <div className="my-5 p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-[#0B1728] to-blue-950/40 border border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
              Operator Access Portal
            </span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/login"
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#0F1B2B] border border-cyan-500/40 text-cyan-300 text-xs font-bold uppercase hover:bg-cyan-500/10 transition-colors"
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </Link>
            <Link
              href="/signup"
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-cyan-500 text-black text-xs font-bold uppercase shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:bg-cyan-400 transition-colors"
            >
              <UserPlus size={14} />
              <span>Sign Up</span>
            </Link>
          </div>
        </div>

        {/* Dashboard Sections List */}
        <nav className="flex-1 space-y-1.5 py-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest px-2 mb-2 font-bold">
            Antarctic Dashboard Sections
          </p>
          {DASHBOARD_ROUTES.map((route, i) => {
            const Icon = route.icon;
            return (
              <div
                key={route.href}
                style={{
                  transform: isOpen ? 'translateY(0)' : 'translateY(15px)',
                  opacity: isOpen ? 1 : 0,
                  transitionDelay: isOpen ? `${i * 35 + 80}ms` : '0ms',
                }}
                className="transition-all duration-300"
              >
                <Link
                  href={route.href}
                  onClick={onClose}
                  className="flex items-center justify-between p-3 rounded-lg text-slate-200 hover:text-cyan-300 hover:bg-[#0D1826] border border-transparent hover:border-cyan-500/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold tracking-wide">{route.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {route.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                        {route.badge}
                      </span>
                    )}
                    <ArrowRight size={13} className="text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Footer / Credits */}
        <div className="pt-6 border-t border-[#1B2C42]/60 flex items-center justify-between text-[10px] text-slate-500">
          <span>NCPOR & MoES INDIA</span>
          <span>MAITRI (70°S) • BHARATI (69°S)</span>
        </div>
      </div>
    </div>
  );
};
