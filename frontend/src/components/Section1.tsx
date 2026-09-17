'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Compass, ShieldCheck, Zap, Radio, UserPlus, LogIn } from 'lucide-react';
import { Stagger } from './Stagger';

interface Section1Props {
  opacity: number;
}

export const Section1: React.FC<Section1Props> = ({ opacity }) => {
  const isVisible = opacity > 0.3;

  return (
    <section
      className="absolute inset-0 flex items-center px-6 sm:px-8 md:px-16 lg:px-24 transition-opacity duration-100 ease-out font-mono"
      style={{
        opacity,
        pointerEvents: opacity > 0.1 ? 'auto' : 'none',
      }}
    >
      <div className="max-w-4xl space-y-5">
        {/* Eyebrow / Mission Tag */}
        <Stagger show={isVisible} delay={0}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#08111D]/80 border border-cyan-500/40 text-cyan-400 text-xs font-bold tracking-wider uppercase backdrop-blur-md shadow-[0_0_12px_rgba(6,182,212,0.2)]">
            <Radio size={14} className="text-cyan-400 animate-pulse" />
            <span>Indian Antarctic Programme • NCPOR & MoES</span>
          </div>
        </Stagger>

        {/* Hero Headline */}
        <Stagger show={isVisible} delay={120}>
          <h1
            className="font-extrabold uppercase leading-[1.1] text-[#0A1626] tracking-tight drop-shadow-sm"
            style={{ fontSize: 'clamp(2.1rem, 4.8vw, 4.4rem)' }}
          >
            AI-Powered Polar <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-blue-700 to-[#0A1626]">
              Energy Management
            </span>
          </h1>
        </Stagger>

        {/* Subtitle */}
        <Stagger show={isVisible} delay={220}>
          <p className="text-xs sm:text-sm md:text-base leading-relaxed text-[#15273B]/90 font-medium max-w-2xl">
            Autonomous generation scheduling, dynamic MILP battery dispatch, and 100% life-support guarantee under sub-zero blizzards for Maitri (70°S) and Bharati (69°S) stations.
          </p>
        </Stagger>

        {/* Live Metrics Highlight Pills */}
        <Stagger show={isVisible} delay={300}>
          <div className="flex flex-wrap gap-2.5 pt-1 text-xs">
            <div className="px-3 py-1.5 rounded-md bg-[#08111D]/85 border border-cyan-500/40 text-cyan-300 backdrop-blur-sm shadow-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-bold">21.2%</span> Fuel Savings
            </div>
            <div className="px-3 py-1.5 rounded-md bg-[#08111D]/85 border border-emerald-500/40 text-emerald-300 backdrop-blur-sm shadow-sm flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span className="font-bold">100%</span> Life-Support Guard
            </div>
            <div className="px-3 py-1.5 rounded-md bg-[#08111D]/85 border border-purple-500/40 text-purple-300 backdrop-blur-sm shadow-sm flex items-center gap-2">
              <Zap size={14} className="text-purple-400" />
              <span>500 kWh BESS Storage</span>
            </div>
          </div>
        </Stagger>

        {/* CTA Buttons: Sign Up & Enter Dashboard */}
        <Stagger show={isVisible} delay={400}>
          <div className="flex flex-wrap items-center gap-3 pt-3 pointer-events-auto">
            {/* Primary Sign Up Button */}
            <Link
              href="/signup"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] hover:scale-105"
            >
              <UserPlus size={16} />
              <span>Sign Up / Register Station</span>
              <ArrowRight size={14} />
            </Link>

            {/* Secondary Enter Dashboard Button */}
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#08111D]/90 hover:bg-[#0E1D32] border border-cyan-500/50 text-white font-bold text-xs tracking-wider uppercase transition-all duration-300 backdrop-blur-md shadow-md hover:border-cyan-400"
            >
              <Compass size={16} className="text-cyan-400" />
              <span>Enter SCADA Dashboard</span>
            </Link>

            {/* Quick Sign In link */}
            <Link
              href="/login"
              className="flex items-center gap-1 text-xs text-[#0A1626] hover:text-cyan-600 font-bold uppercase tracking-wider px-2 py-1 transition-colors"
            >
              <LogIn size={13} />
              <span>Sign In</span>
            </Link>
          </div>
        </Stagger>
      </div>

      {/* Bottom-right scroll prompt */}
      <div className="absolute bottom-10 right-6 sm:right-8 md:right-12 pointer-events-auto">
        <Stagger show={isVisible} delay={500}>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#0A1626]/70">
            <span>Scroll To Explore Modules</span>
            <div className="w-8 h-8 rounded-full border border-[#0A1626]/40 flex items-center justify-center animate-bounce">
              <ArrowRight size={14} className="rotate-90" />
            </div>
          </div>
        </Stagger>
      </div>
    </section>
  );
};
