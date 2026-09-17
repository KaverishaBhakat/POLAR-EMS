'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Compass, UserPlus, LogIn, Activity, Radio, Menu } from 'lucide-react';
import { MobileMenu } from './MobileMenu';

interface NavbarProps {
  scrollProgress: number;
}

const DASHBOARD_LINKS = [
  { name: 'SCADA LIVE', href: '/dashboard', badge: 'LIVE' },
  { name: 'STATIONS', href: '/stations' },
  { name: 'FORECAST', href: '/forecast', badge: 'AI' },
  { name: 'OPTIMIZATION', href: '/optimization' },
  { name: 'SIMULATION', href: '/simulation' },
  { name: 'ANALYTICS', href: '/analytics' },
  { name: 'ALERTS', href: '/alerts' },
];

export const Navbar: React.FC<NavbarProps> = ({ scrollProgress }) => {
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const isLight = scrollProgress > 0.55;
  const navColor = isLight ? '#FFFFFF' : '#0F1E2E';
  const navMutedColor = isLight ? 'rgba(255, 255, 255, 0.75)' : 'rgba(15, 30, 46, 0.75)';

  return (
    <>
      <header
        className="absolute top-0 left-0 right-0 z-50 pointer-events-auto px-4 sm:px-8 md:px-12 pt-6 sm:pt-8 pb-4 flex items-center justify-between transition-colors duration-500 font-mono"
        style={{ color: navColor }}
      >
        {/* Brand / Logo + Mobile Toggle */}
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger (<lg) */}
          <button
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open navigation menu"
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-md border border-cyan-500/40 bg-black/30 backdrop-blur-sm text-cyan-400 focus:outline-none p-1.5 cursor-pointer hover:bg-cyan-500/20 transition-colors"
          >
            <Menu size={20} />
          </button>

          {/* POLAR-EMS Brand identifier */}
          <Link
            href="/"
            className="flex items-center gap-2 group transition-transform hover:scale-[1.02]"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(-12px)',
              transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/60 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)] backdrop-blur-md">
              <Compass size={18} className="animate-spin-slow" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-wider uppercase">
                  POLAR<span className="text-cyan-400">-EMS</span>
                </span>
                <span className="hidden sm:inline-block text-[9px] px-1 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded">
                  ANTARCTICA
                </span>
              </div>
              <span className="text-[9px] opacity-70 tracking-tight hidden sm:block">
                NCPOR & MoES RESEARCH STATIONS
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Central cluster of Dashboard Navigation Links (lg+) */}
        <nav className="hidden lg:flex items-center gap-5 xl:gap-7 bg-black/25 backdrop-blur-md px-5 py-2 rounded-full border border-white/10 shadow-lg">
          {DASHBOARD_LINKS.map((link, i) => (
            <Link
              key={link.name}
              href={link.href}
              className="relative text-[11px] tracking-[0.14em] uppercase font-semibold transition-all duration-200 hover:text-cyan-400 hover:scale-105 flex items-center gap-1"
              style={{
                color: isLight ? '#FFFFFF' : '#142538',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(-10px)',
                transition: `opacity 0.5s ease-out ${i * 50 + 80}ms, transform 0.5s ease-out ${
                  i * 50 + 80
                }ms, color 200ms`,
              }}
            >
              <span>{link.name}</span>
              {link.badge && (
                <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold">
                  {link.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right Cluster: Sign In & Sign Up Action Buttons */}
        <div
          className="flex items-center gap-3 sm:gap-4"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(-12px)',
            transition: 'opacity 0.6s ease-out 250ms, transform 0.6s ease-out 250ms',
          }}
        >
          {/* Sign In Link */}
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-300 hover:bg-cyan-500/10 hover:border-cyan-400 border border-transparent"
            style={{ color: isLight ? '#FFFFFF' : '#0F1E2E' }}
          >
            <LogIn size={13} className="text-cyan-400" />
            <span>Sign In</span>
          </Link>

          {/* Sign Up Button (Highlighted Hero CTA) */}
          <Link
            href="/signup"
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.35)] hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:scale-105"
          >
            <UserPlus size={13} />
            <span>Sign Up</span>
          </Link>
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
};
