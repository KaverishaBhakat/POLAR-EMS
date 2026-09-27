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
            className="text-left text-xs font-mono px-3 py-1.5 rounded bg-[#0A1626] hover:bg-[#12243C] border border-cyan-500/20 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition-all duration-150 flex items-center gap-1.5"
          >
            <Sparkles size={12} className="text-cyan-400 flex-shrink-0" />
            <span className="truncate">{prompt}</span>
          </button>
        ))}
      </div>
    );
  }

  const currentCategory = CATEGORIES.find((c) => c.id === activeTab) || CATEGORIES[0];

  return (
    <div className="bg-[#08101C] rounded-lg border border-[#1B2C42] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1B2C42] flex items-center justify-between bg-[#060D17]">
        <div className="flex items-center gap-2">
          <HelpCircle size={15} className="text-cyan-400" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-200">
            Suggested Operator Queries
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          Click any prompt to ask
        </span>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-[#1B2C42]/60 bg-[#060D17]/50 scrollbar-thin">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono whitespace-nowrap transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#0E1A2B]'
              }`}
            >
              <Icon size={13} className={isActive ? 'text-cyan-400' : 'text-slate-400'} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Prompts list */}
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {currentCategory.prompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSelectPrompt(prompt)}
            className="text-left p-2.5 rounded bg-[#0B1728] hover:bg-[#12233B] border border-[#1B2C42] hover:border-cyan-500/40 text-xs font-mono text-slate-300 hover:text-cyan-200 transition-all duration-150 flex items-center justify-between group"
          >
            <span className="pr-2">{prompt}</span>
            <ChevronRight
              size={14}
              className="text-slate-500 group-hover:text-cyan-400 transition-transform group-hover:translate-x-0.5 flex-shrink-0"
            />
          </button>
        ))}
      </div>
    </div>
  );
};
