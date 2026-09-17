'use client';

import React from 'react';
import Link from 'next/link';
import { AIInsight as AIInsightType } from '@/lib/types';
import { BrainCircuit, ArrowRight, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

interface AIInsightProps {
  insight: AIInsightType;
}

export const AIInsight: React.FC<AIInsightProps> = ({ insight }) => {
  return (
    <div className="relative bg-gradient-to-br from-[#0B1728] via-[#0E1F36] to-[#0A1422] rounded-lg border border-cyan-500/40 p-5 shadow-[0_0_20px_rgba(6,182,212,0.12)] overflow-hidden">
      {/* Subtle tech background grid effect */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.25)]">
              <BrainCircuit className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold font-mono uppercase tracking-wider text-slate-100">
                  AI Operational Advisory
                </h3>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  CONFIDENCE: {insight.confidence}%
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">{insight.timestamp}</p>
            </div>
          </div>

          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
            TRANSFORMER-LSTM v4.2
          </span>
        </div>

        {/* Advisory Narrative */}
        <div className="my-3 p-3 rounded bg-[#08101C]/80 border border-cyan-500/20 font-mono text-xs text-slate-200 leading-relaxed">
          <p className="text-slate-100 font-medium mb-1.5 flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-400" />
            {insight.title}
          </p>
          <p className="text-slate-300 text-[11px]">{insight.description}</p>
        </div>

        {/* Recommended Action & CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#1B2C42]/60">
          <div className="font-mono text-[11px]">
            <span className="text-cyan-400 font-bold uppercase block sm:inline mr-2">
              RECOMMENDED ACTION:
            </span>
            <span className="text-slate-300">{insight.recommendedAction}</span>
          </div>

          <Link
            href="/optimization"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-[#080D14] font-mono font-bold text-xs tracking-wider uppercase transition-all duration-200 shadow-[0_0_12px_rgba(6,182,212,0.35)] flex-shrink-0"
          >
            <span>View Optimization</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};
