'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { ChatMessage, AssistantResponse } from '@/lib/types';
import { AssistantMessage } from '@/components/ai/AssistantMessage';
import { ChatInput } from '@/components/ai/ChatInput';
import { SuggestedPrompts } from '@/components/ai/SuggestedPrompts';
import {
  BrainCircuit,
  MapPin,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Cpu,
  Layers,
  HelpCircle,
  Activity,
  Zap,
} from 'lucide-react';

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-msg',
  role: 'assistant',
  content: `### Welcome to POLAR-EMS AI Operations Assistant

I am the grounded operational intelligence layer for Antarctic microgrids at **Maitri** and **Bharati** research stations.

I have direct, read-only access to:
• **PostgreSQL Station Telemetry** (Weather AWS, Energy Loads, Battery BESS, Diesel Fleet)
• **Climatological Radiation Datasets** (1985–2000 NCPOR Solar Baseline)
• **Physics-based Solar & Wind Forecasts** (Next 24–48 hours)
• **OR-Tools MILP Dispatch Optimization** (Fuel savings, peak-shaving, battery scheduling)
• **Resilience & Extreme Stress Simulations** (Polar Night, generator outages, blizzards)
• **Polar Energy Knowledge Base** (NCPOR architecture, polar microgrid operations)

All answers provide verifiable **Data Provenance** (*REAL / MEASURED*, *MODELED / SCENARIO*, *OPTIMIZATION*, *CLIMATOLOGY*).

Select a prompt below or type your inquiry to begin.`,
  timestamp: new Date().toISOString(),
  response: {
    success: true,
    answer: '',
    intent: ['KNOWLEDGE', 'TELEMETRY'],
    provenance: ['REAL / MEASURED', 'MODELED / SCENARIO', 'OPTIMIZATION'],
    ragUsed: true,
  },
};

export default function AIAssistantPage() {
  const { activeStationId, station } = useStation();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const stationCode = (activeStationId || 'MAITRI').toUpperCase();
  const stationName = station?.name || (stationCode === 'MAITRI' ? 'Maitri Station' : 'Bharati Station');

  const handleSendMessage = async (userPrompt: string) => {
    if (!userPrompt.trim() || isLoading) return;

    setErrorMessage(null);
    setLastFailedPrompt(null);

    const userMessageId = `user-${Date.now()}`;
    const newUserMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: userPrompt,
      timestamp: new Date().toISOString(),
    };

    // Prepare recent messages (exclude welcome message, keep max 10 messages)
    const historyForBackend = messages
      .filter((m) => m.id !== 'welcome-msg')
      .slice(-10)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    // Optimistically add user message to conversation
    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const response: AssistantResponse = await apiClient.askAssistant({
        message: userPrompt,
        stationId: stationCode,
        recentMessages: historyForBackend,
      });

      if (!response.success && !response.answer) {
        throw new Error('The assistant could not produce a grounded answer for this query.');
      }

      const assistantMessageId = `asst-${Date.now()}`;
      const newAssistantMsg: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: response.answer || 'Operational analysis complete.',
        response: response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, newAssistantMsg]);
    } catch (err: any) {
      console.error('Error calling AI assistant:', err);
      const friendlyError =
        err.message ||
        'AI assistant service is currently unavailable. Please verify that the POLAR-EMS backend is running.';
      setErrorMessage(friendlyError);
      setLastFailedPrompt(userPrompt);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearConversation = () => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
    setErrorMessage(null);
    setLastFailedPrompt(null);
  };

  const handleRetry = () => {
    if (lastFailedPrompt) {
      handleSendMessage(lastFailedPrompt);
    }
  };

  const hasUserMessages = messages.some((m) => m.role === 'user');

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-3 sm:p-6 max-w-7xl mx-auto space-y-4 font-sans">
      {/* Top Banner / Mission Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-[#0A121F] border border-[#1B2C42] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 via-blue-600/30 to-slate-900 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <BrainCircuit size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold font-mono uppercase tracking-wider text-slate-100">
                AI Operations Assistant
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                SCADA-LLM v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Grounded operational intelligence & function-calling telemetry engine
            </p>
          </div>
        </div>

        {/* Current Active Station Context */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#060D17] border border-cyan-500/30 text-xs font-mono">
            <MapPin size={13} className="text-cyan-400" />
            <span className="text-slate-400 uppercase">Station:</span>
            <span className="text-cyan-300 font-bold">{stationName}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              {stationCode}
            </span>
          </div>
        </div>
      </div>

      {/* Suggested Prompts Header (shown prominently when starting conversation) */}
      {!hasUserMessages && (
        <div className="transition-all duration-300">
          <SuggestedPrompts onSelectPrompt={handleSendMessage} />
        </div>
      )}

      {/* Main Conversation Stream */}
      <div className="flex-1 bg-[#050C16] border border-[#1B2C42] rounded-lg p-3 sm:p-5 shadow-inner overflow-y-auto max-h-[60vh] min-h-[350px] space-y-4">
        {messages.map((msg, index) => (
          <AssistantMessage
            key={msg.id}
            message={msg}
            onRetry={handleSendMessage}
            isLatest={index === messages.length - 1}
          />
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3 my-4 animate-fadeIn">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/50 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
              <BrainCircuit size={18} className="animate-spin" />
            </div>
            <div className="p-4 rounded-lg bg-[#08121E] border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-3 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>POLAR-EMS is analyzing station telemetry, forecasts, and evidence...</span>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs font-mono flex items-start justify-between gap-3 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-300 uppercase tracking-wide">Assistant Error</p>
                <p className="mt-1 text-slate-300 text-[11px] leading-relaxed">{errorMessage}</p>
              </div>
            </div>
            {lastFailedPrompt && (
              <button
                onClick={handleRetry}
                className="px-3 py-1.5 rounded bg-rose-900/60 hover:bg-rose-800/80 border border-rose-400/50 text-rose-100 font-mono text-xs flex items-center gap-1.5 transition-all flex-shrink-0"
              >
                <RotateCcw size={12} />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar (when conversation already has messages) */}
      {hasUserMessages && (
        <div className="pt-1">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles size={12} className="text-cyan-400" />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Quick Suggestions:
            </span>
          </div>
          <SuggestedPrompts onSelectPrompt={handleSendMessage} compact={true} />
        </div>
      )}

      {/* Bottom Input Field */}
      <div className="sticky bottom-2 z-20">
        <ChatInput
          onSendMessage={handleSendMessage}
          onClearConversation={handleClearConversation}
          isLoading={isLoading}
          stationName={stationName}
          hasMessages={hasUserMessages}
        />
      </div>
    </div>
  );
}
