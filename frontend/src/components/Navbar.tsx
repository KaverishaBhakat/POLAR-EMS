'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Activity,
  MapPin,
  TrendingUp,
  Sliders,
  PlaySquare,
  ShieldAlert,
  BarChart3,
  Bell,
  UploadCloud,
  LogIn,
  UserPlus,
  Info,
  Menu,
  X,
  Radio,
  LucideIcon,
} from 'lucide-react';
import { PolarLogo } from '@/components/common/PolarLogo';

interface NavbarProps {
  scrollProgress: number;
}

interface NavLinkItem {
  name: string;
  href: string;
  badge?: string;
  icon: LucideIcon;
}

const SCADA_ROUTES: NavLinkItem[] = [
  { name: 'Live Dashboard', href: '/dashboard', badge: 'LIVE', icon: Activity },
  { name: 'Stations', href: '/stations', icon: MapPin },
  { name: 'AI Forecast', href: '/forecast', badge: 'ML', icon: TrendingUp },
  { name: 'Optimization', href: '/optimization', badge: 'MILP', icon: Sliders },
  { name: 'Simulation', href: '/simulation', icon: PlaySquare },
  { name: 'Resilience Hub', href: '/resilience', badge: 'NEW', icon: ShieldAlert },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Alerts', href: '/alerts', icon: Bell },
  { name: 'Data Ingestion', href: '/data-upload', icon: UploadCloud },
];

const AUTH_ROUTES = [
  { name: 'Sign In', href: '/login', icon: LogIn },
  { name: 'Sign Up', href: '/signup', icon: UserPlus },
];

const SYSTEM_ROUTES = [
  { name: 'About POLAR-EMS', href: '/about', icon: Info },
];

export const Navbar: React.FC<NavbarProps> = ({ scrollProgress }) => {
  const [mounted, setMounted] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup close timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Handle escape key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPanelOpen) {
        setIsPanelOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen]);

  // Desktop Hover Handlers with 200ms close delay to prevent flickering
  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsPanelOpen(true);
  };

  const handleMouseLeave = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setIsPanelOpen(false);
    }, 220);
  };

  // Toggle for click / tap / keyboard
  const handleToggle = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsPanelOpen((prev) => !prev);
  };

  const isLight = scrollProgress > 0.55;
  const navColor = isLight ? '#FFFFFF' : '#0F1E2E';

  return (
    <>
      <header
        className="absolute top-0 left-0 right-0 z-50 pointer-events-auto px-4 sm:px-8 md:px-12 pt-6 sm:pt-8 pb-4 flex items-center justify-between transition-colors duration-500 font-mono"
        style={{ color: navColor }}
      >
        {/* POLAR-EMS Brand identifier */}
        <Link
          href="/"
          className="flex items-center gap-2 group transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-lg p-1"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(-12px)',
            transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
          }}
        >
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/60 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)] backdrop-blur-md">
            <PolarLogo size={20} className="group-hover:scale-110 transition-transform text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-wider uppercase text-white drop-shadow">
                POLAR<span className="text-cyan-400">-EMS</span>
              </span>
              <span className="hidden sm:inline-block text-[9px] px-1 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded font-bold">
                ANTARCTICA
              </span>
            </div>
            <span className="text-[9px] text-slate-300 opacity-80 tracking-tight hidden sm:block">
              NCPOR & MoES RESEARCH STATIONS
            </span>
          </div>
        </Link>

        {/* Right Corner: Compact Hamburger Button (☰) */}
        <div
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            ref={triggerRef}
            onClick={handleToggle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggle();
              }
            }}
            aria-label="Toggle navigation side panel"
            aria-expanded={isPanelOpen}
            aria-controls="scada-side-panel"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#08111D]/90 hover:bg-[#0E1D32] border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] backdrop-blur-md cursor-pointer"
          >
            {isPanelOpen ? <X size={18} /> : <Menu size={18} />}
            <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
              Menu
            </span>
          </button>

          {/* Desktop & Mobile Slide-Out SCADA Side Navigation Panel */}
          <div
            id="scada-side-panel"
            ref={panelRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            aria-hidden={!isPanelOpen}
            className={`fixed sm:absolute right-0 top-full sm:mt-2 w-screen sm:w-80 max-w-[92vw] sm:max-w-sm max-h-[88vh] overflow-y-auto rounded-xl bg-[#08101A]/95 border border-[#1B2C42] shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl p-5 text-slate-200 transition-all duration-250 z-50 font-mono ${
              isPanelOpen
                ? 'opacity-100 translate-y-0 pointer-events-auto scale-100'
                : 'opacity-0 -translate-y-2 pointer-events-none scale-95'
            }`}
          >
            {/* Side Panel Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1B2C42]">
              <div className="flex items-center gap-2">
                <PolarLogo size={18} className="text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  POLAR<span className="text-cyan-400">-EMS</span> SCADA
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-bold flex items-center gap-1">
                <Radio size={10} className="animate-pulse text-cyan-400" />
                ONLINE
              </span>
            </div>

            {/* Category 1: SCADA LIVE */}
            <div className="space-y-1.5 mb-5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">
                SCADA LIVE
              </div>
              <div className="space-y-1">
                {SCADA_ROUTES.map((route) => {
                  const Icon = route.icon;
                  return (
                    <Link
                      key={route.href}
                      href={route.href}
                      onClick={() => setIsPanelOpen(false)}
                      className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs hover:bg-[#122032] hover:text-cyan-300 transition-colors group"
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon size={14} className="text-slate-400 group-hover:text-cyan-400 transition-colors" />
                        <span>{route.name}</span>
                      </span>
                      {route.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                          {route.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[#1B2C42]/80 my-3" />

            {/* Category 2: AUTHENTICATION */}
            <div className="space-y-1.5 mb-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">
                AUTHENTICATION
              </div>
              <div className="space-y-1">
                {AUTH_ROUTES.map((route) => {
                  const Icon = route.icon;
                  return (
                    <Link
                      key={route.href}
                      href={route.href}
                      onClick={() => setIsPanelOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs hover:bg-[#122032] hover:text-cyan-300 transition-colors text-slate-300"
                    >
                      <Icon size={14} className="text-slate-400" />
                      <span>{route.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[#1B2C42]/80 my-3" />

            {/* Category 3: SYSTEM */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">
                SYSTEM
              </div>
              <div className="space-y-1">
                {SYSTEM_ROUTES.map((route) => {
                  const Icon = route.icon;
                  return (
                    <Link
                      key={route.href}
                      href={route.href}
                      onClick={() => setIsPanelOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs hover:bg-[#122032] hover:text-cyan-300 transition-colors text-slate-300"
                    >
                      <Icon size={14} className="text-slate-400" />
                      <span>{route.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

