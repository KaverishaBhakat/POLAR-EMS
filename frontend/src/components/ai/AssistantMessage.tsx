'use client';

import React, { useState } from 'react';
import { ChatMessage, AssistantEvidence } from '@/lib/types';
import { EvidenceCard } from '@/components/ai/EvidenceCard';
import { ProvenanceBadge } from '@/components/common/ProvenanceBadge';
import {
  BrainCircuit,
  User,
  Sparkles,
  BookOpen,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
} from 'lucide-react';

interface AssistantMessageProps {
  message: ChatMessage;
  onRetry?: (query: string) => void;
  isLatest?: boolean;
}

export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  message,
  onRetry,
  isLatest = false,
}) => {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const isUser = message.role === 'user';
  const response = message.response;

  // Format message text with line breaks and markdown-style bullet/bold styling
  const renderFormattedContent = (content: string) => {
    // Split into paragraphs / lines
    const lines = content.split('\n');
    return (
      <div className="space-y-2 text-xs sm:text-sm font-sans leading-relaxed text-slate-100">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-1.5" />;
          }

          // Header line (### or ##)
          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={idx} className="text-xs sm:text-sm font-bold font-mono text-cyan-300 pt-2 pb-1 border-b border-[#1B2C42]/60">
                {trimmed.replace('### ', '')}
              </h4>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h3 key={idx} className="text-sm font-bold font-mono text-cyan-200 pt-3 pb-1 border-b border-cyan-500/30">
                {trimmed.replace('## ', '')}
              </h3>
            );
          }

          // Bullet items
          if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const itemText = trimmed.replace(/^[•\-\*]\s*/, '');
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-cyan-400 mt-1 font-bold">•</span>
                <span className="flex-1 text-slate-200">
                  {renderInlineFormatting(itemText)}
                </span>
              </div>
            );
          }

          // Numbered list (e.g., 1. 2.)
          const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
          if (numberedMatch) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-cyan-400 font-mono text-xs font-semibold mt-0.5">
                  {numberedMatch[1]}.
                </span>
                <span className="flex-1 text-slate-200">
                  {renderInlineFormatting(numberedMatch[2])}
                </span>
              </div>
            );
          }

          // Regular paragraph
          return (
            <p key={idx} className="text-slate-200">
              {renderInlineFormatting(line)}
            </p>
          );
        })}
      </div>
    );
  };

  // Helper for bold and code tags inline
  const renderInlineFormatting = (text: string) => {
    // Basic bold **text** parsing
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-[#060D17] border border-[#1B2C42] text-cyan-300 font-mono text-xs">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-3 my-3">
        <div className="max-w-2xl bg-[#0D2036] border border-cyan-500/30 rounded-lg p-3.5 shadow-[0_2px_12px_rgba(6,182,212,0.1)]">
          <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-cyan-500/20 text-[10px] font-mono text-cyan-300">
            <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
              <User size={12} className="text-cyan-400" />
              OPERATOR COMMAND
            </span>
            <span className="text-slate-400 flex items-center gap-1">
              <Clock size={10} />
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-sans text-slate-100 whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  // Assistant Message Layout
  const evidenceList: AssistantEvidence[] = response?.evidence || [];
  const provenanceList: string[] = response?.provenance || [];
  const toolsUsed: string[] = response?.toolsUsed || [];
  const intents: string[] = response?.intent || [];
  const ragUsed = response?.ragUsed;

  // Extract any special optimization or scenario data for highlight callout
  const optimizationEvidence = evidenceList.find((e) => e.type === 'OPTIMIZATION' && e.data);
  const scenarioEvidence = evidenceList.find((e) => e.type === 'RESILIENCE' && e.data);

  return (
    <div className="flex items-start gap-3 my-4">
      {/* Bot Avatar */}
      <div className="w-8 h-8 rounded-md bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/50 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.25)] mt-1">
        <BrainCircuit size={18} />
      </div>

      <div className="flex-1 max-w-4xl space-y-3">
        {/* Main Box */}
        <div className="bg-[#08121E] border border-[#1B2C42] rounded-lg p-4 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
          {/* Header Metadata Bar */}
          <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[#1B2C42] flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                POLAR-EMS ASSISTANT
              </span>

              {/* Station badge */}
              {response?.station && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0A1626] border border-cyan-500/30 text-cyan-400 flex items-center gap-1">
                  <MapPin size={10} />
                  {response.station.name || response.station.code}
                </span>
              )}

              {/* Intent badges */}
              {intents.map((intent, i) => (
                <span
                  key={i}
                  className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300 uppercase tracking-wider"
                >
                  {intent}
                </span>
              ))}

              {/* RAG Knowledge indicator */}
              {ragUsed && (
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                  <BookOpen size={10} />
                  Knowledge Base Consulted
                </span>
              )}
            </div>

            <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
              <Clock size={10} />
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* Assistant Answer Body */}
          <div className="py-1">
            {renderFormattedContent(message.content)}
          </div>

          {/* Optimization Highlight Card */}
          {optimizationEvidence && optimizationEvidence.data && (
            <div className="mt-3.5 p-3 rounded bg-gradient-to-r from-emerald-950/20 to-cyan-950/20 border border-emerald-500/30 font-mono text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={13} />
                  MILP Dispatch Solution
                </span>
                <ProvenanceBadge type="OPTIMIZATION" size="sm" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                {optimizationEvidence.data.fuelSavingsPercent !== undefined && (
                  <div className="p-1.5 rounded bg-[#060D17] border border-[#1B2C42]">
                    <span className="text-[10px] text-slate-400 block">Fuel Reduction</span>
                    <span className="text-emerald-300 font-bold">
                      {optimizationEvidence.data.fuelSavingsPercent}%
                    </span>
                  </div>
                )}
                {optimizationEvidence.data.carbonReductionPercent !== undefined && (
                  <div className="p-1.5 rounded bg-[#060D17] border border-[#1B2C42]">
                    <span className="text-[10px] text-slate-400 block">CO2 Avoided</span>
                    <span className="text-emerald-300 font-bold">
                      {optimizationEvidence.data.carbonReductionPercent}%
                    </span>
                  </div>
                )}
                {optimizationEvidence.data.solverStatus && (
                  <div className="p-1.5 rounded bg-[#060D17] border border-[#1B2C42]">
                    <span className="text-[10px] text-slate-400 block">Solver Status</span>
                    <span className="text-cyan-300 font-semibold uppercase">
                      {optimizationEvidence.data.solverStatus}
                    </span>
                  </div>
                )}
                {optimizationEvidence.data.horizonHours && (
                  <div className="p-1.5 rounded bg-[#060D17] border border-[#1B2C42]">
                    <span className="text-[10px] text-slate-400 block">Horizon</span>
                    <span className="text-slate-200">
                      {optimizationEvidence.data.horizonHours}h Dispatch
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scenario / Resilience Highlight Card */}
          {scenarioEvidence && scenarioEvidence.data && (
            <div className="mt-3.5 p-3 rounded bg-[#0D1826] border border-amber-500/30 font-mono text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={13} />
                  Resilience Stress Test Result
                </span>
                <ProvenanceBadge type="MODELED / SCENARIO" size="sm" />
              </div>
              <div className="text-[11px] text-slate-300 leading-relaxed">
                {scenarioEvidence.data.scenarioName && (
                  <p className="mb-1 text-amber-300 font-semibold">
                    Scenario: {scenarioEvidence.data.scenarioName}
                  </p>
                )}
                {scenarioEvidence.data.summary && (
                  <p className="text-slate-300">{scenarioEvidence.data.summary}</p>
                )}
              </div>
            </div>
          )}

          {/* Technical Metadata Bar: Tools Used & Provenance Badges */}
          {(toolsUsed.length > 0 || provenanceList.length > 0) && (
            <div className="mt-4 pt-3 border-t border-[#1B2C42] flex items-center justify-between gap-3 flex-wrap text-xs">
              {/* Provenance Tags */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono text-slate-400 uppercase mr-1">
                  Data Provenance:
                </span>
                {provenanceList.length > 0 ? (
                  provenanceList.map((prov, i) => (
                    <ProvenanceBadge key={i} type={prov} size="sm" />
                  ))
                ) : (
                  <span className="text-[10px] font-mono text-slate-500 italic">Unspecified</span>
                )}
              </div>

              {/* Tools list */}
              {toolsUsed.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] font-mono text-slate-400 uppercase mr-1 flex items-center gap-1">
                    <Cpu size={10} />
                    Tools:
                  </span>
                  {toolsUsed.map((tool, i) => (
                    <code
                      key={i}
                      className="px-1.5 py-0.5 rounded bg-[#060D17] border border-[#1B2C42] text-[10px] font-mono text-slate-300"
                    >
                      {tool}
                    </code>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Evidence & Sources Section (Collapsible) */}
        {evidenceList.length > 0 && (
          <div className="rounded-lg border border-[#1B2C42] bg-[#070E18] overflow-hidden">
            <button
              onClick={() => setEvidenceOpen(!evidenceOpen)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-[#0B1728] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-cyan-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  Evidence & Sources
                </span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {evidenceList.length} source{evidenceList.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-400 text-xs font-mono">
                <span>{evidenceOpen ? 'Hide Evidence' : 'Inspect Evidence'}</span>
                {evidenceOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            {evidenceOpen && (
              <div className="p-3 border-t border-[#1B2C42] space-y-2 bg-[#050A12]">
                {evidenceList.map((ev, idx) => (
                  <EvidenceCard key={idx} evidence={ev} index={idx} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
