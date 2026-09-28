'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  MapPin,
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

const MENU_ROUTES: NavLinkItem[] = [
  { name: 'Live Dashboard', href: '/dashboard', badge: 'LIVE', icon: Activity },
  { name: 'Stations', href: '/stations', icon: MapPin },
  { name: 'About POLAR-EMS', href: '/about', icon: Info },
  { name: 'Sign In', href: '/login', icon: LogIn },
  { name: 'Sign Up', href: '/signup', icon: UserPlus },
];

export const Navbar: React.FC<NavbarProps> = ({ scrollProgress }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on Escape
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

  // Close on click outside
  useEffect(() => {
    if (!isPanelOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsPanelOpen(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPanelOpen]);

  const handleToggle = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const isLight = scrollProgress > 0.55;
  const navColor = isLight ? '#FFFFFF' : '#0F1E2E';

  return (
    <>
      <header
        className="absolute top-0 left-0 right-0 z-50 pointer-events-auto px-4 sm:px-8 md:px-12 pt-6 sm:pt-8 pb-4 flex items-center justify-between transition-colors duration-500 font-mono"
        style={{ color: navColor }}
      >
        {/* Top-Left: POLAR-EMS Brand Identifier (Immediate render, no delay) */}
        <Link
          href="/"
          className="flex items-center gap-2 group transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-lg p-1"
        >
          <div className="w-8 h-8 rounded-lg bg-[#0A1626]/85 border border-cyan-500/60 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)] backdrop-blur-md">
            <PolarLogo size={20} className="group-hover:scale-110 transition-transform text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-wider uppercase drop-shadow-sm text-[#0A1626]">
                POLAR<span className="text-cyan-600">-EMS</span>
              </span>
              <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-700 border border-cyan-500/50 rounded font-bold backdrop-blur-sm">
                ANTARCTICA
              </span>
            </div>
            <span className="text-[9px] tracking-tight hidden sm:block font-medium drop-shadow-sm text-[#1B3A5C]">
              AI-POWERED POLAR ENERGY MANAGEMENT
            </span>
          </div>
        </Link>

        {/* Top-Right: Translucent Menu Button + Floating SCADA Panel */}
        <div ref={containerRef} className="relative">
          <button
            ref={triggerRef}
            onClick={handleToggle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggle();
              }
            }}
            aria-label="Toggle navigation menu"
            aria-expanded={isPanelOpen}
            aria-controls="scada-nav-panel"
            className={`
              flex items-center gap-2 px-3.5 py-2 rounded-lg
              border cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-cyan-400/60
              transition-all duration-200 ease-out font-mono
              ${isPanelOpen
                ? 'bg-[#0A1626]/90 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-[#0A1626]/20 border-[#0A1626]/25 text-[#0A1626] hover:bg-[#0A1626]/80 hover:border-cyan-400/60 hover:text-cyan-300 hover:shadow-[0_0_12px_rgba(6,182,212,0.2)]'
              }
              backdrop-blur-md
            `}
          >
            {isPanelOpen ? <X size={16} /> : <Menu size={16} />}
            <span className="text-xs font-bold uppercase tracking-wider">
              MENU
            </span>
          </button>

          {/* Floating SCADA Navigation Panel */}
          <div
            id="scada-nav-panel"
            aria-hidden={!isPanelOpen}
            className={`
              absolute right-0 top-full mt-2.5
              w-[calc(100vw-2rem)] sm:w-64
              max-w-[18rem]
              rounded-xl
              bg-[#0A1220]/90 border border-cyan-500/20
              shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_1px_rgba(255,255,255,0.05)]
              backdrop-blur-2xl
              p-3.5
              text-slate-200
              font-mono
              z-50
              transition-all duration-200 ease-out
              ${isPanelOpen
                ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                : 'opacity-0 -translate-y-1.5 scale-[0.97] pointer-events-none'
              }
            `}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/8">
              <div className="flex items-center gap-2">
                <PolarLogo size={15} className="text-cyan-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/90">
                  POLAR<span className="text-cyan-400">-EMS</span>
                </span>
              </div>
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 font-bold flex items-center gap-1">
                <Radio size={8} className="animate-pulse" />
                ONLINE
              </span>
            </div>

            {/* Exactly 5 Navigation Items */}
            <div className="space-y-1">
              {MENU_ROUTES.map((route) => {
                const Icon = route.icon;
                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    onClick={closePanel}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg text-[12px] text-slate-300 hover:bg-white/10 hover:text-cyan-300 border border-transparent hover:border-cyan-500/20 transition-all duration-150 group"
                  >
                    <span className="flex items-center gap-2.5 group-hover:translate-x-0.5 transition-transform duration-150">
                      <Icon size={14} className="text-slate-400 group-hover:text-cyan-400 transition-colors duration-150" />
                      <span className="font-medium">{route.name}</span>
                    </span>
                    {route.badge && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/25 text-cyan-400">
                        {route.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
