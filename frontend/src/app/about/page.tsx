'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Activity,
  Sun,
  Wind,
  BatteryCharging,
  Cpu,
  TrendingUp,
  Sliders,
  PlaySquare,
  ShieldAlert,
  BrainCircuit,
  Radio,
} from 'lucide-react';
import { PolarLogo } from '@/components/common/PolarLogo';

const CAPABILITIES = [
  {
    icon: Activity,
    title: 'Real-Time SCADA Monitoring',
    desc: 'Live telemetry from diesel generators, solar PV arrays, wind turbines, and battery energy storage systems across both stations.',
    accent: 'cyan',
  },
  {
    icon: Sun,
    title: 'Renewable Energy Integration',
    desc: 'Solar and wind generation monitoring with irradiance, panel temperature, and wind-speed tracking optimized for extreme polar conditions.',
    accent: 'amber',
  },
  {
    icon: BatteryCharging,
    title: 'Battery & Generator Management',
    desc: 'BESS state-of-charge tracking, charge/discharge scheduling, and diesel genset fleet management with runtime optimization.',
    accent: 'emerald',
  },
  {
    icon: TrendingUp,
    title: 'AI-Powered Forecasting',
    desc: 'Deep learning models for 24-hour load demand and renewable generation prediction, trained on Antarctic meteorological data.',
    accent: 'blue',
  },
  {
    icon: Sliders,
    title: 'MILP Dispatch Optimization',
    desc: 'Mixed-integer linear programming engine that minimizes diesel fuel consumption while guaranteeing 100% life-support load coverage.',
    accent: 'purple',
  },
  {
    icon: PlaySquare,
    title: 'Blizzard & Stress Simulation',
    desc: 'Scenario simulation laboratory for testing microgrid resilience under extreme weather events, equipment failures, and demand surges.',
    accent: 'rose',
  },
  {
    icon: ShieldAlert,
    title: 'Resilience & Contingency Planning',
    desc: 'Automated contingency assessment for single-generator trips, prolonged blizzards, and communication blackout scenarios.',
    accent: 'orange',
  },
  {
    icon: BrainCircuit,
    title: 'AI-Assisted Operational Insights',
    desc: 'Natural language AI assistant that helps station engineers interpret telemetry data, diagnose anomalies, and make informed decisions.',
    accent: 'indigo',
  },
];

const ACCENT_CLASSES: Record<string, { icon: string; border: string; badge: string }> = {
  cyan: { icon: 'text-cyan-400', border: 'border-cyan-500/30', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
  amber: { icon: 'text-amber-400', border: 'border-amber-500/30', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  emerald: { icon: 'text-emerald-400', border: 'border-emerald-500/30', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  blue: { icon: 'text-blue-400', border: 'border-blue-500/30', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  purple: { icon: 'text-purple-400', border: 'border-purple-500/30', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  rose: { icon: 'text-rose-400', border: 'border-rose-500/30', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  orange: { icon: 'text-orange-400', border: 'border-orange-500/30', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  indigo: { icon: 'text-indigo-400', border: 'border-indigo-500/30', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#080D14] text-slate-100 font-mono">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#080D14]/95 backdrop-blur-xl border-b border-[#1B2C42]/60 px-4 sm:px-8 md:px-12 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 group text-slate-300 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <PolarLogo size={20} className="text-cyan-400" />
            <span className="text-sm font-bold tracking-wider uppercase text-white">
              POLAR<span className="text-cyan-400">-EMS</span>
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-8 md:px-12 pt-16 pb-12 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-radial from-cyan-500/8 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0A1626]/80 border border-cyan-500/40 text-cyan-400 text-xs font-bold tracking-wider uppercase mb-6">
            <Radio size={13} className="animate-pulse" />
            <span>Indian Antarctic Programme • NCPOR & MoES</span>
          </div>

          <h1
            className="font-extrabold uppercase leading-[1.15] text-white tracking-tight mb-5"
            style={{ fontSize: 'clamp(1.8rem, 3.5vw, 3rem)' }}
          >
            About{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
              POLAR-EMS
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-3xl mx-auto">
            POLAR-EMS (Polar Energy Management System) is an AI-powered SCADA platform purpose-built for
            India&apos;s Antarctic research stations — <strong className="text-slate-200">Maitri (70°46′S)</strong> and{' '}
            <strong className="text-slate-200">Bharati (69°24′S)</strong>. It provides autonomous energy management,
            predictive analytics, and operational resilience for isolated polar microgrids operating under
            extreme sub-zero conditions.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="px-4 sm:px-8 md:px-12 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="p-6 rounded-xl bg-[#0A1220]/80 border border-[#1B2C42] backdrop-blur-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-3">Mission</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Polar research stations face unique energy challenges: extreme cold, prolonged darkness,
              limited fuel supply, and the absolute imperative of uninterrupted life-support systems.
              POLAR-EMS addresses these challenges by combining real-time SCADA monitoring with mathematical
              optimization and machine learning to ensure safe, efficient, and sustainable energy operations
              in one of the harshest environments on Earth.
            </p>
          </div>
        </div>
      </section>

      {/* Capabilities Grid */}
      <section className="px-4 sm:px-8 md:px-12 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2
              className="font-bold uppercase tracking-tight text-white mb-2"
              style={{ fontSize: 'clamp(1.3rem, 2.5vw, 2rem)' }}
            >
              System Capabilities
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto">
              An integrated suite of monitoring, forecasting, optimization, and simulation tools
              designed for polar microgrid operations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              const ac = ACCENT_CLASSES[cap.accent] || ACCENT_CLASSES.cyan;
              return (
                <div
                  key={cap.title}
                  className={`p-5 rounded-xl bg-[#0A1220]/80 border ${ac.border} backdrop-blur-sm hover:bg-[#0D1B2D] transition-all duration-300 group`}
                >
                  <div className={`w-9 h-9 rounded-lg bg-[#112136] border ${ac.border} flex items-center justify-center ${ac.icon} mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">{cap.title}</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{cap.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stations Section */}
      <section className="px-4 sm:px-8 md:px-12 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-[#0A1220]/80 border border-cyan-500/20 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Maitri Station</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-2">
                Located at 70°46′S, 11°44′E in the Schirmacher Oasis, Maitri has been operational since 1989.
                The station&apos;s microgrid includes diesel generators, solar PV panels, and battery energy storage systems.
              </p>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">70°46′S • Schirmacher Oasis</span>
            </div>
            <div className="p-5 rounded-xl bg-[#0A1220]/80 border border-blue-500/20 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Bharati Station</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-2">
                Located at 69°24′S, 76°12′E in the Larsemann Hills, Bharati was commissioned in 2012.
                It features a modern containerized architecture with integrated renewable energy systems.
              </p>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">69°24′S • Larsemann Hills</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-8 md:px-12 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:scale-105"
          >
            <PolarLogo size={18} />
            <span>Enter SCADA Dashboard</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1B2C42]/60 px-4 sm:px-8 md:px-12 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 uppercase tracking-wider">
          <span>POLAR-EMS • AI-Powered Polar Energy Management</span>
          <span>NCPOR & MoES • Ministry of Earth Sciences, India</span>
        </div>
      </footer>
    </div>
  );
}
