'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, AlertTriangle, ArrowLeft, Activity } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#080D14] flex items-center justify-center p-6 font-mono text-slate-100">
      <div className="max-w-md w-full bg-[#0E1724] border border-cyan-500/40 rounded-lg p-8 text-center shadow-[0_0_30px_rgba(6,182,212,0.15)] relative">
        <div className="w-14 h-14 rounded-full bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mx-auto mb-4 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          <Compass size={28} className="animate-spin-slow" />
        </div>

        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold uppercase tracking-wider">
          SCADA ERROR 404: NODE NOT FOUND
        </span>

        <h2 className="text-xl font-bold uppercase tracking-wide text-white mt-3 mb-2">
          Telemetry Route Unreachable
        </h2>

        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          The requested Antarctic microgrid monitoring node or route coordinate could not be resolved by the POLAR-EMS server.
        </p>

        <div className="flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
          >
            <Activity size={15} />
            <span>Return to Operations Center</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
