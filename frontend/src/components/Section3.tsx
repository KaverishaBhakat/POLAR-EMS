'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Compass, UserPlus, ShieldCheck, Radio } from 'lucide-react';
import { Stagger } from './Stagger';

interface Section3Props {
  opacity: number;
}

export const Section3: React.FC<Section3Props> = ({ opacity }) => {
  const isVisible = opacity > 0.3;

  return (
    <section
      className="absolute inset-0 flex items-center justify-end px-6 sm:px-8 md:px-16 lg:px-28 transition-opacity duration-100 ease-out font-mono"
      style={{
        opacity,
        pointerEvents: opacity > 0.1 ? 'auto' : 'none',
      }}
    >
      <div className="max-w-2xl text-left w-full space-y-6">
        {/* Eyebrow */}
        <Stagger show={isVisible} delay={0}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <Radio size={13} className="text-cyan-400 animate-pulse" />
            <span>Ministry of Earth Sciences • NCPOR</span>
          </div>
        </Stagger>

        {/* H2 */}
        <Stagger show={isVisible} delay={150}>
          <h2
            className="font-bold text-white leading-[1.15] uppercase tracking-tight"
            style={{ fontSize: 'clamp(2rem, 3.8vw, 3.8rem)' }}
          >
            Securing Scientific <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300">
              Life Support
            </span>{' '}
            in Antarctica.
          </h2>
        </Stagger>

        {/* Description */}
        <Stagger show={isVisible} delay={250}>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
            Empowering station engineers at Maitri and Bharati with real-time autonomous load balancing, mathematical battery dispatch, and predictive storm resilience.
          </p>
        </Stagger>

        {/* Action Buttons: Sign Up & Enter Dashboard */}
        <Stagger show={isVisible} delay={350}>
          <div className="flex flex-wrap items-center gap-4 pt-2 pointer-events-auto">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:scale-105"
            >
              <UserPlus size={16} />
              <span>Sign Up Operator Account</span>
              <ArrowRight size={14} />
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2.5 px-5 py-3.5 rounded-xl bg-[#08111D]/90 hover:bg-[#0E1D32] border border-cyan-500/50 text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 backdrop-blur-md hover:border-cyan-400"
            >
              <Compass size={16} className="text-cyan-400" />
              <span>Enter SCADA Control</span>
            </Link>
          </div>
        </Stagger>
      </div>
    </section>
  );
};
