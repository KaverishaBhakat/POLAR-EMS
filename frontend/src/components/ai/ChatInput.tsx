'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, CornerDownLeft, Loader2, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onClearConversation?: () => void;
  isLoading: boolean;
  stationName: string;
  hasMessages?: boolean;
}

const MAX_CHARS = 4000;

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onClearConversation,
  isLoading,
  stationName,
  hasMessages = false,
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow newline
        return;
      }
      // Submit on Enter or Ctrl/Cmd+Enter
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || trimmed.length > MAX_CHARS) {
      return;
    }
    onSendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const charCount = input.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = charCount > MAX_CHARS * 0.85;

  return (
    <div className="bg-[#08101C] border border-[#1B2C42] rounded-lg p-3 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={2}
          placeholder={`Ask POLAR-EMS about ${stationName} telemetry, weather, battery, forecasting, optimization, or resilience...`}
          className="w-full bg-[#050B14] border border-[#1B2C42] focus:border-cyan-500/60 rounded-md p-3 text-xs sm:text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 resize-none transition-all disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
          maxLength={MAX_CHARS + 50}
        />
      </div>

      {/* Action Footer */}
      <div className="mt-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {hasMessages && onClearConversation && (
            <button
              type="button"
              onClick={onClearConversation}
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded bg-[#0A1422] hover:bg-rose-950/40 border border-[#1B2C42] hover:border-rose-500/40 text-slate-400 hover:text-rose-300 font-mono text-[11px] transition-all flex items-center gap-1.5 disabled:opacity-40"
              title="Clear current session conversation"
            >
              <Trash2 size={12} />
              <span>Clear chat</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-slate-500">
            <CornerDownLeft size={10} />
            <span>Enter to send, Shift+Enter for newline</span>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* Character counter */}
          <span
            className={`text-[10px] font-mono ${
              isOverLimit
                ? 'text-rose-400 font-bold'
                : isNearLimit
                ? 'text-amber-400'
                : 'text-slate-500'
            }`}
          >
            {charCount} / {MAX_CHARS}
          </span>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading || isOverLimit}
            className={`px-4 py-2 rounded font-mono font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 shadow-[0_0_12px_rgba(6,182,212,0.25)] ${
              !input.trim() || isLoading || isOverLimit
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed shadow-none'
                : 'bg-cyan-500 hover:bg-cyan-400 text-[#070D16] border border-cyan-400 active:scale-[0.98]'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <span>Send Query</span>
                <Send size={13} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
