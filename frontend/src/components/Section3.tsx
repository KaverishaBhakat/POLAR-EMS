'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Radio } from 'lucide-react';
import { PolarLogo } from '@/components/common/PolarLogo';
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
            style={{ fontSize: 'clamp(1.6rem, 3.2vw, 3rem)' }}
          >
            Ready to operate the{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300">
              polar microgrid
            </span>
            ?
          </h2>
        </Stagger>

        {/* Description */}
        <Stagger show={isVisible} delay={250}>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
            Access real-time telemetry, forecasting models, optimization scenarios and resilience simulations for Maitri and Bharati stations.
          </p>
        </Stagger>

        {/* Single Final CTA: Open SCADA Dashboard */}
        <Stagger show={isVisible} delay={350}>
          <div className="flex flex-wrap items-center gap-4 pt-2 pointer-events-auto">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:scale-105 group"
            >
              <PolarLogo size={18} />
              <span>Open SCADA Dashboard</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </Stagger>
      </div>
    </section>
  );
};
