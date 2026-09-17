'use client';

import React from 'react';
import Link from 'next/link';
import {
  Activity,
  TrendingUp,
  Sliders,
  PlaySquare,
  BarChart3,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Stagger } from './Stagger';

interface Section2Props {
  opacity: number;
}

const DASHBOARD_MODULES = [
  {
    title: 'Live SCADA Control',
    href: '/dashboard',
    icon: Activity,
    badge: 'LIVE',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    desc: 'Instantaneous multi-generator, PV, wind, and battery flow telemetry.',
  },
  {
    title: 'AI Load & Weather Forecast',
    href: '/forecast',
    icon: TrendingUp,
    badge: 'DEEP LEARNING',
    badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    desc: '24-hour predictive load & renewable generation forecasting for polar stations.',
  },
  {
    title: 'MILP Dispatch Optimization',
    href: '/optimization',
    icon: Sliders,
    badge: 'SAVE 21.2%',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    desc: 'Dynamic mathematical solver minimizing diesel burn while protecting life support.',
  },
  {
    title: 'Blizzard Simulation Lab',
    href: '/simulation',
    icon: PlaySquare,
    badge: 'STRESS TEST',
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    desc: 'Simulate sub-zero blizzards, wind gusts, and single-generator trip events.',
  },
  {
    title: 'Station SCADA Network',
    href: '/stations',
    icon: MapPin,
    badge: 'MAITRI & BHARATI',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    desc: 'Dual station switching between Maitri (70°S) and Bharati (69°S) microgrids.',
  },
  {
    title: 'ESG & Fleet Analytics',
    href: '/analytics',
    icon: BarChart3,
    badge: 'ESG REPORT',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    desc: 'CO₂ emissions abatement tracking, diesel fuel conservation, and generator runtimes.',
  },
];

export const Section2: React.FC<Section2Props> = ({ opacity }) => {
  const isVisible = opacity > 0.3;

  return (
    <section
      className="absolute inset-0 flex items-center justify-center px-4 sm:px-8 md:px-14 transition-opacity duration-100 ease-out font-mono"
      style={{
        opacity,
        pointerEvents: opacity > 0.1 ? 'auto' : 'none',
      }}
    >
      <div className="max-w-5xl w-full text-center space-y-6">
        {/* Header */}
        <Stagger show={isVisible} delay={0}>
          <div className="space-y-2">
            <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#0A1626]/80 px-3 py-1 rounded-full bg-white/40 border border-[#0A1626]/20 backdrop-blur-sm">
              Operational SCADA Capabilities
            </span>
            <h2
              className="font-bold tracking-tight uppercase text-[#0A1626] leading-tight"
              style={{ fontSize: 'clamp(1.5rem, 3.2vw, 3rem)' }}
            >
              Connected Antarctic Microgrid System
            </h2>
            <p className="text-xs sm:text-sm text-[#14263B]/80 max-w-2xl mx-auto">
              Direct access to all live SCADA subsystems, predictive neural net forecasts, and mathematical dispatch engines:
            </p>
          </div>
        </Stagger>

        {/* 6 Clickable Module Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2 text-left pointer-events-auto">
          {DASHBOARD_MODULES.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <Stagger key={mod.title} show={isVisible} delay={80 + i * 50}>
                <Link
                  href={mod.href}
                  className="group block p-4 rounded-xl bg-[#08111D]/90 hover:bg-[#0D1B2D] border border-cyan-500/30 hover:border-cyan-400 transition-all duration-300 backdrop-blur-md shadow-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#112136] border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                      <Icon size={16} />
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${mod.badgeColor}`}>
                      {mod.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center justify-between">
                    <span>{mod.title}</span>
                    <ArrowRight size={13} className="text-cyan-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h3>

                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                    {mod.desc}
                  </p>
                </Link>
              </Stagger>
            );
          })}
        </div>

        {/* Bottom CTA Pill to Sign Up or Access All */}
        <Stagger show={isVisible} delay={450}>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 pointer-events-auto">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
            >
              <span>Sign Up For Operator Access</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#08111D]/80 hover:bg-[#0E1D32] border border-cyan-500/40 text-cyan-300 text-xs uppercase tracking-wider transition-all duration-200"
            >
              <span>Launch Full SCADA Console</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </Stagger>
      </div>
    </section>
  );
};
