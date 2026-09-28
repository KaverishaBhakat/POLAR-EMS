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
} from 'lucide-react';
import { Stagger } from './Stagger';

interface Section2Props {
  opacity: number;
}

const CAPABILITY_CARDS = [
  {
    title: 'Live SCADA Control',
    href: '/dashboard',
    icon: Activity,
    badge: 'LIVE',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    desc: 'Monitor station weather, energy, renewable generation, battery and generator telemetry.',
  },
  {
    title: 'AI Weather & Energy Forecasting',
    href: '/forecast',
    icon: TrendingUp,
    badge: 'FORECAST',
    badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    desc: 'Use historical station data and forecasting models to anticipate operating conditions.',
  },
  {
    title: 'MILP Dispatch Optimization',
    href: '/optimization',
    icon: Sliders,
    badge: 'OPTIMIZATION SCENARIO',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    desc: 'Optimize renewable, battery and generator dispatch while respecting operating constraints.',
  },
  {
    title: 'Resilience Simulation',
    href: '/simulation',
    icon: PlaySquare,
    badge: 'SCENARIO',
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    desc: 'Test polar-night, generator-failure, battery, renewable-drop and severe-weather scenarios.',
  },
  {
    title: 'Station Network',
    href: '/stations',
    icon: MapPin,
    badge: 'MAITRI & BHARATI',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    desc: 'Switch between Maitri and Bharati with station-aware monitoring and data isolation.',
  },
  {
    title: 'Energy & Operational Analytics',
    href: '/analytics',
    icon: BarChart3,
    badge: 'ANALYTICS',
    badgeColor: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
    desc: 'Analyze energy demand, renewable contribution, generator operation and historical trends.',
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
              Platform Overview
            </span>
            <h2
              className="font-bold tracking-tight uppercase text-[#0A1626] leading-tight"
              style={{ fontSize: 'clamp(1.5rem, 3.2vw, 3rem)' }}
            >
              POLAR-EMS Capabilities
            </h2>
            <p className="text-xs sm:text-sm text-[#14263B]/80 max-w-2xl mx-auto">
              Monitor, forecast, optimize and stress-test polar station energy systems from one operational platform.
            </p>
          </div>
        </Stagger>

        {/* 6 Capability Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2 text-left pointer-events-auto">
          {CAPABILITY_CARDS.map((mod, i) => {
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
      </div>
    </section>
  );
};
