'use client';

import React from 'react';
import Link from 'next/link';
import { AIInsight as AIInsightType } from '@/lib/types';
import { BrainCircuit, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AIInsightProps {
  insight: AIInsightType;
}

export const AIInsight: React.FC<AIInsightProps> = ({ insight }) => {
  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-[#5E6AD2]/[0.06] border border-[#5E6AD2]/30 p-5 sm:p-6 shadow-linear-card backdrop-blur-xl overflow-hidden group">
      {/* Subtle ambient indigo flare */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#5E6AD2]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#5E6AD2]/15 border border-[#5E6AD2]/40 flex items-center justify-center text-[#5E6AD2] shadow-sm">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-tight text-[#EDEDEF]">
                  AI Operational Advisory
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#5E6AD2]/15 text-[#6872D9] border border-[#5E6AD2]/30">
                  {insight.confidence}% CONFIDENCE
                </span>
              </div>
              <p className="text-xs text-[#8A8F98] font-mono mt-0.5">{insight.timestamp}</p>
            </div>
          </div>

          <span className="hidden sm:inline-block text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            Transformer-LSTM v4.2
          </span>
        </div>

        {/* Narrative */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs sm:text-sm text-[#EDEDEF] leading-relaxed">
          <p className="font-medium text-[#EDEDEF] mb-1 flex items-center gap-2">
            <Sparkles size={14} className="text-[#6872D9]" />
            {insight.title}
          </p>
          <p className="text-xs text-[#8A8F98] leading-relaxed">
            {insight.description}
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
          <div className="text-xs">
            <span className="text-[#5E6AD2] font-semibold uppercase tracking-wider block sm:inline mr-2 font-mono text-[11px]">
              ACTION:
            </span>
            <span className="text-[#EDEDEF]">{insight.recommendedAction}</span>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Button
              variant="secondary"
              size="sm"
              href="/ai-assistant"
              icon={<BrainCircuit size={13} className="text-[#5E6AD2]" />}
            >
              Ask Assistant
            </Button>
            <Button
              variant="primary"
              size="sm"
              href="/optimization"
              icon={<ArrowRight size={13} />}
            >
              View Optimization
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
