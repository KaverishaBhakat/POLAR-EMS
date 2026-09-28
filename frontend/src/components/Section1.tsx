'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Radio, UserPlus } from 'lucide-react';
import { PolarLogo } from '@/components/common/PolarLogo';
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
        <Stagger show={isVisible} delay={0}>
          <h1
            className="font-extrabold uppercase leading-[1.15] text-[#0A1626] tracking-tight drop-shadow-sm"
            style={{ fontSize: 'clamp(1.6rem, 3.5vw, 3rem)' }}
          >
            Securing Scientific <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-blue-700 to-[#0A1626]">
              Life Support
            </span>{' '}
            in Antarctica.
          </h1>
        </Stagger>

        {/* Subtitle */}
        <Stagger show={isVisible} delay={0}>
          <p className="text-xs sm:text-sm md:text-base leading-relaxed text-[#15273B]/90 font-medium max-w-2xl">
            Monitor, forecast, optimize and stress-test energy systems for Maitri (70°S) and Bharati (69°S) research stations from one integrated SCADA platform.
          </p>
        </Stagger>

        {/* Hero CTAs: ONE primary dashboard + ONE secondary signup */}
        <Stagger show={isVisible} delay={0}>
          <div className="flex flex-wrap items-center gap-3 pt-2 pointer-events-auto">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:scale-105 group"
            >
              <PolarLogo size={18} />
              <span>Open SCADA Dashboard</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#08111D]/85 hover:bg-[#0E1D32] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 font-bold text-xs tracking-wider uppercase transition-all duration-300 backdrop-blur-md"
            >
              <UserPlus size={14} />
              <span>Sign Up</span>
            </Link>
          </div>
        </Stagger>
      </div>

      {/* Bottom-right scroll prompt */}
      <div className="absolute bottom-10 right-6 sm:right-8 md:right-12 pointer-events-auto">
        <Stagger show={isVisible} delay={0}>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#0A1626]/70">
            <span>Scroll To Explore</span>
            <div className="w-8 h-8 rounded-full border border-[#0A1626]/40 flex items-center justify-center animate-bounce">
              <ArrowRight size={14} className="rotate-90" />
            </div>
          </div>
        </Stagger>
      </div>
    </section>
  );
};
