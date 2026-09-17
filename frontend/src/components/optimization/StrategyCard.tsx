'use client';

import React from 'react';
import { OPTIMIZATION_RULES } from '@/lib/mock-data/optimization';
import { CheckCircle2, Shield, ArrowRight, Zap, Cpu, Sparkles } from 'lucide-react';

export const StrategyCard: React.FC = () => {
  return (
    <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2.5 border-b border-[#1B2C42]/50">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            AI Optimization Dispatch Policy & Rulebook
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Physics-informed mathematical constraints prioritized by safety and fuel-efficiency
          </p>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold uppercase">
          HUMAN-IN-THE-LOOP VALIDATED
        </span>
      </div>

      {/* Core Concept: AI predicts -> Optimization decides -> Safety protects -> Human approves */}
      <div className="p-3.5 rounded-lg bg-[#08101A] border border-cyan-500/30 mb-4 font-mono text-xs text-slate-200">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold text-center sm:text-left">
          POLAR-EMS ARCHITECTURAL CONTROL LOOP
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 text-center text-[11px]">
          <div className="flex-1 min-w-[110px] p-2 rounded bg-[#0D1826] border border-blue-500/30 text-blue-300 font-bold">
            1. AI PREDICTS
            <div className="text-[9px] text-slate-400 font-normal mt-0.5">Load & Weather</div>
          </div>
          <ArrowRight size={14} className="text-cyan-400 hidden sm:block" />
          <div className="flex-1 min-w-[110px] p-2 rounded bg-[#0D1826] border border-cyan-500/30 text-cyan-300 font-bold">
            2. OPTIMIZATION
            <div className="text-[9px] text-slate-400 font-normal mt-0.5">MILP Multi-Objective</div>
          </div>
          <ArrowRight size={14} className="text-cyan-400 hidden sm:block" />
          <div className="flex-1 min-w-[110px] p-2 rounded bg-[#0D1826] border border-emerald-500/30 text-emerald-300 font-bold">
            3. SAFETY LOCK
            <div className="text-[9px] text-slate-400 font-normal mt-0.5">Critical Life Support</div>
          </div>
          <ArrowRight size={14} className="text-cyan-400 hidden sm:block" />
          <div className="flex-1 min-w-[110px] p-2 rounded bg-[#0D1826] border border-purple-500/30 text-purple-300 font-bold">
            4. OPERATOR
            <div className="text-[9px] text-slate-400 font-normal mt-0.5">Approve / Override</div>
          </div>
        </div>
      </div>

      {/* Strategy Rules List */}
      <div className="space-y-2.5">
        {OPTIMIZATION_RULES.map((r) => (
          <div
            key={r.step}
            className="p-3 rounded bg-[#0A121E] border border-[#1B2C42]/70 flex items-start justify-between gap-3 font-mono"
          >
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {r.step}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-100">{r.title}</h4>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#132032] text-cyan-300 border border-cyan-500/30">
                    {r.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{r.rule}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded flex-shrink-0">
              <CheckCircle2 size={12} />
              <span>{r.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
