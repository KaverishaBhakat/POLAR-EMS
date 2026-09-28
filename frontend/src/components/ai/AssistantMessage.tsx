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
    const lines = content.split('\n');
    return (
      <div className="space-y-2 text-xs sm:text-sm font-sans leading-relaxed text-[#EDEDEF]">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-1.5" />;
          }

          // Header line (### or ##)
          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={idx} className="text-xs sm:text-sm font-semibold text-[#EDEDEF] pt-2 pb-1 border-b border-white/[0.06]">
                {trimmed.replace('### ', '')}
              </h4>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h3 key={idx} className="text-sm font-semibold text-[#EDEDEF] pt-3 pb-1 border-b border-[#5E6AD2]/30">
                {trimmed.replace('## ', '')}
              </h3>
            );
          }

          // Bullet items
          if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const itemText = trimmed.replace(/^[•\-\*]\s*/, '');
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-[#5E6AD2] mt-1 font-bold">•</span>
                <span className="flex-1 text-[#EDEDEF]/90">
                  {renderInlineFormatting(itemText)}
                </span>
              </div>
            );
          }

          // Numbered list
          const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
          if (numberedMatch) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-[#5E6AD2] font-mono text-xs font-semibold mt-0.5">
                  {numberedMatch[1]}.
                </span>
                <span className="flex-1 text-[#EDEDEF]/90">
                  {renderInlineFormatting(numberedMatch[2])}
                </span>
              </div>
            );
          }

          return (
            <p key={idx} className="text-[#EDEDEF]/90">
              {renderInlineFormatting(line)}
            </p>
          );
        })}
      </div>
    );
  };

  const renderInlineFormatting = (text: string) => {
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
          <code key={i} className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[#6872D9] font-mono text-xs">
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
        <div className="max-w-2xl bg-[#5E6AD2]/10 border border-[#5E6AD2]/25 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-[#5E6AD2]/20 text-[10px] font-mono text-[#6872D9]">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <User size={12} className="text-[#5E6AD2]" />
              OPERATOR COMMAND
            </span>
            <span className="text-[#8A8F98] flex items-center gap-1">
              <Clock size={10} />
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#EDEDEF] whitespace-pre-wrap leading-relaxed">
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

  const optimizationEvidence = evidenceList.find((e) => e.type === 'OPTIMIZATION' && e.data);
  const scenarioEvidence = evidenceList.find((e) => e.type === 'RESILIENCE' && e.data);

  return (
    <div className="flex items-start gap-3 my-4">
      {/* Bot Avatar */}
      <div className="w-8 h-8 rounded-xl bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 flex items-center justify-center text-[#5E6AD2] flex-shrink-0 shadow-sm mt-1">
        <BrainCircuit size={17} />
      </div>

      <div className="flex-1 max-w-4xl space-y-3">
        {/* Main Box */}
        <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.07] p-5 shadow-linear-card">
          {/* Header Metadata Bar */}
          <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/[0.06] flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[#EDEDEF] flex items-center gap-1.5">
                POLAR-EMS Assistant
              </span>

              {response?.station && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#8A8F98] flex items-center gap-1">
                  <MapPin size={10} className="text-[#5E6AD2]" />
                  {response.station.name || response.station.code}
                </span>
              )}

              {intents.map((intent, i) => (
                <span
                  key={i}
                  className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#5E6AD2]/10 border border-[#5E6AD2]/25 text-[#6872D9] uppercase tracking-wider"
                >
                  {intent}
                </span>
              ))}

              {ragUsed && (
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 flex items-center gap-1">
                  <BookOpen size={10} />
                  Knowledge Base
                </span>
              )}
            </div>

            <span className="text-[10px] font-mono text-[#8A8F98] flex items-center gap-1">
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
            <div className="mt-3.5 p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/[0.06] to-[#5E6AD2]/[0.06] border border-emerald-500/20 text-xs font-mono">
              <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                  <Sliders size={13} />
                  MILP Dispatch Solution
                </span>
                <ProvenanceBadge type="OPTIMIZATION" size="sm" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                {optimizationEvidence.data.fuelSavingsPercent !== undefined && (
                  <div className="p-2 rounded-lg bg-black/20 border border-white/[0.06]">
                    <span className="text-[10px] text-[#8A8F98] block">Fuel Reduction</span>
                    <span className="text-emerald-300 font-bold">
                      {optimizationEvidence.data.fuelSavingsPercent}%
                    </span>
                  </div>
                )}
                {optimizationEvidence.data.carbonReductionPercent !== undefined && (
                  <div className="p-2 rounded-lg bg-black/20 border border-white/[0.06]">
                    <span className="text-[10px] text-[#8A8F98] block">CO2 Avoided</span>
                    <span className="text-emerald-300 font-bold">
                      {optimizationEvidence.data.carbonReductionPercent}%
                    </span>
                  </div>
                )}
                {optimizationEvidence.data.solverStatus && (
                  <div className="p-2 rounded-lg bg-black/20 border border-white/[0.06]">
                    <span className="text-[10px] text-[#8A8F98] block">Solver Status</span>
                    <span className="text-[#5E6AD2] font-semibold uppercase">
                      {optimizationEvidence.data.solverStatus}
                    </span>
                  </div>
                )}
                {optimizationEvidence.data.horizonHours && (
                  <div className="p-2 rounded-lg bg-black/20 border border-white/[0.06]">
                    <span className="text-[10px] text-[#8A8F98] block">Horizon</span>
                    <span className="text-[#EDEDEF]">
                      {optimizationEvidence.data.horizonHours}h Dispatch
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scenario / Resilience Highlight Card */}
          {scenarioEvidence && scenarioEvidence.data && (
            <div className="mt-3.5 p-3.5 rounded-xl bg-amber-500/[0.05] border border-amber-500/20 text-xs font-mono">
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                  <ShieldCheck size={13} />
                  Resilience Stress Test Result
                </span>
                <ProvenanceBadge type="MODELED / SCENARIO" size="sm" />
              </div>
              <div className="text-[11px] text-[#EDEDEF] leading-relaxed">
                {scenarioEvidence.data.scenarioName && (
                  <p className="mb-1 text-amber-300 font-semibold">
                    Scenario: {scenarioEvidence.data.scenarioName}
                  </p>
                )}
                {scenarioEvidence.data.summary && (
                  <p className="text-[#8A8F98]">{scenarioEvidence.data.summary}</p>
                )}
              </div>
            </div>
          )}

          {/* Technical Metadata Bar */}
          {(toolsUsed.length > 0 || provenanceList.length > 0) && (
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono text-[#8A8F98] uppercase mr-1">
                  Provenance:
                </span>
                {provenanceList.length > 0 ? (
                  provenanceList.map((prov, i) => (
                    <ProvenanceBadge key={i} type={prov} size="sm" />
                  ))
                ) : (
                  <span className="text-[10px] font-mono text-[#8A8F98]/60 italic">Unspecified</span>
                )}
              </div>

              {toolsUsed.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] font-mono text-[#8A8F98] uppercase mr-1 flex items-center gap-1">
                    <Cpu size={10} className="text-[#5E6AD2]" />
                    Tools:
                  </span>
                  {toolsUsed.map((tool, i) => (
                    <code
                      key={i}
                      className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-[#EDEDEF]"
                    >
                      {tool}
                    </code>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Evidence & Sources Section */}
        {evidenceList.length > 0 && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl overflow-hidden shadow-linear-card">
            <button
              onClick={() => setEvidenceOpen(!evidenceOpen)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-[#5E6AD2]" />
                <span className="text-xs font-semibold text-[#EDEDEF]">
                  Evidence & Sources
                </span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-[#5E6AD2]/10 text-[#6872D9] border border-[#5E6AD2]/20">
                  {evidenceList.length} source{evidenceList.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[#8A8F98] text-xs font-mono">
                <span>{evidenceOpen ? 'Hide' : 'Inspect'}</span>
                {evidenceOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            {evidenceOpen && (
              <div className="p-3 border-t border-white/[0.06] space-y-2 bg-black/20">
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
