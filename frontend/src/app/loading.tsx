import React from 'react';
import { Compass } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#080D14] flex flex-col items-center justify-center p-6 font-mono text-slate-100">
      <div className="w-12 h-12 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
        <Compass size={24} className="animate-spin" />
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-cyan-300 animate-pulse">
        CONNECTING TO POLAR SCADA TELEMETRY...
      </p>
      <p className="text-[10px] text-slate-500 mt-1">Maitri & Bharati Microgrid Grid Stream</p>
    </div>
  );
}
