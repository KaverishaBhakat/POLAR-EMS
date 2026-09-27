'use client';

import React from 'react';
import { ShieldAlert, ArrowRight, MapPin } from 'lucide-react';
import { useStation } from '@/lib/context/StationContext';

export const BharatiUnsupportedNotice: React.FC = () => {
  const { setActiveStationId } = useStation();

  return (
    <div className="bg-[#0E1724]/95 rounded-lg border border-amber-500/40 p-6 sm:p-10 font-mono text-center max-w-2xl mx-auto my-8 space-y-5">
      <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
        <ShieldAlert size={28} />
      </div>

      <div className="space-y-2">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase tracking-widest">
          STATION SCOPE NOTICE
        </span>
        <h2 className="text-base sm:text-xl font-bold text-white uppercase">
          Resilience simulation is currently available for Maitri Station.
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed max-w-xl mx-auto">
          The 24-hour OR-Tools MILP contingency simulation framework is configured with the Maitri 2019 AWS wind record, 100 kW solar climatology profile, and dual diesel generator fleet (GEN-01 &amp; GEN-02).
        </p>
        <p className="text-[11px] text-slate-400">
          Bharati Station resilience telemetry will be integrated in the next phase without fabricating synthetic telemetry.
        </p>
      </div>

      <div className="pt-2 flex justify-center">
        <button
          onClick={() => setActiveStationId('maitri')}
          className="flex items-center gap-2 px-5 py-2.5 rounded bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold text-xs uppercase tracking-wider hover:from-cyan-400 hover:to-blue-500 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
        >
          <MapPin size={14} />
          <span>Switch to Maitri Station</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
