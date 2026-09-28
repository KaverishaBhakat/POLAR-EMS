'use client';

import React, { useState } from 'react';
import {
  Activity,
  TrendingUp,
  Sliders,
  ShieldCheck,
  BookOpen,
  Sparkles,
  ChevronRight,
  HelpCircle,
  LucideIcon,
} from 'lucide-react';

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
  compact?: boolean;
}

interface PromptCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  prompts: string[];
}

const CATEGORIES: PromptCategory[] = [
  {
    id: 'operations',
    label: 'Current Operations',
    icon: Activity,
    prompts: [
      'What is the current weather at Maitri?',
      'What is the current battery SOC?',
      'What is the current energy load?',
      'Are there any active alerts?',
    ],
  },
  {
    id: 'forecasting',
    label: 'Forecasting',
    icon: TrendingUp,
    prompts: [
      'What will the temperature be over the next 24 hours?',
      'Show me the recent renewable generation.',
      'How has the energy load changed?',
    ],
  },
  {
    id: 'optimization',
    label: 'Optimization',
    icon: Sliders,
    prompts: [
      'How should the generators and battery be dispatched?',
      'What is the optimal fuel-saving strategy for Maitri?',
    ],
  },
  {
    id: 'resilience',
    label: 'Resilience & Scenarios',
    icon: ShieldCheck,
    prompts: [
      'What happens during Polar Night?',
      'What happens if the primary generator fails?',
      'How does the microgrid handle blizzard conditions?',
    ],
  },
  {
    id: 'knowledge',
    label: 'Polar Knowledge Base',
    icon: BookOpen,
    prompts: [
      'How does the BESS architecture work?',
      'How does POLAR-EMS manage renewable energy?',
      'What is the difference between measured and modeled telemetry?',
    ],
  },
];

export const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({
  onSelectPrompt,
  compact = false,
}) => {
  const [activeTab, setActiveTab] = useState<string>('operations');

  if (compact) {
    const quickPrompts = [
      'What is the current battery SOC?',
      'What is the current weather at Maitri?',
      'What happens during Polar Night?',
      'How should generators and battery be dispatched?',
      'How does the BESS architecture work?',
    ];

    return (
      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSelectPrompt(prompt)}
            className="text-left text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-[#5E6AD2]/40 text-[#8A8F98] hover:text-[#EDEDEF] transition-all flex items-center gap-2 group"
          >
            <Sparkles size={12} className="text-[#5E6AD2] flex-shrink-0" />
            <span className="truncate">{prompt}</span>
          </button>
        ))}
      </div>
    );
  }

  const currentCategory = CATEGORIES.find((c) => c.id === activeTab) || CATEGORIES[0];

  return (
    <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.07] overflow-hidden shadow-linear-card">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <HelpCircle size={14} className="text-[#5E6AD2]" />
          <span className="text-xs font-medium tracking-tight text-[#EDEDEF]">
            Suggested Operator Inquiries
          </span>
        </div>
        <span className="text-[10px] text-[#8A8F98] font-mono">
          Click any prompt to execute
        </span>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-white/[0.06] bg-black/20 scrollbar-thin px-2 py-1.5 gap-1">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#5E6AD2]/20 text-[#EDEDEF] border border-[#5E6AD2]/40 shadow-sm'
                  : 'text-[#8A8F98] hover:text-[#EDEDEF] hover:bg-white/[0.04]'
              }`}
            >
              <Icon size={13} className={isActive ? 'text-[#5E6AD2]' : 'text-[#8A8F98]'} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Prompts list */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {currentCategory.prompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSelectPrompt(prompt)}
            className="text-left p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] hover:border-[#5E6AD2]/40 text-xs text-[#EDEDEF] transition-all flex items-center justify-between group"
          >
            <span className="pr-3 leading-relaxed text-[#EDEDEF]/90">{prompt}</span>
            <ChevronRight
              size={14}
              className="text-[#8A8F98] group-hover:text-[#5E6AD2] transition-transform group-hover:translate-x-0.5 flex-shrink-0"
            />
          </button>
        ))}
      </div>
    </div>
  );
};
