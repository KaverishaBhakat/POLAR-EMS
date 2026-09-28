'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, CornerDownLeft, Loader2 } from 'lucide-react';

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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        return;
      }
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
    <div className="rounded-2xl bg-[#0A0A0C]/90 backdrop-blur-2xl border border-white/[0.08] p-3.5 shadow-2xl shadow-black/50">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={2}
          placeholder={`Ask POLAR-EMS about ${stationName} telemetry, weather, battery BESS, forecasting, or optimization...`}
          className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-[#5E6AD2]/60 focus:bg-white/[0.05] rounded-xl p-3 text-xs sm:text-sm text-[#EDEDEF] placeholder-[#8A8F98]/70 focus:outline-none focus:ring-1 focus:ring-[#5E6AD2]/40 resize-none transition-all disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
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
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/10 border border-white/[0.06] hover:border-rose-500/30 text-[#8A8F98] hover:text-rose-300 text-[11px] font-mono transition-all flex items-center gap-1.5 disabled:opacity-40"
              title="Clear current session conversation"
            >
              <Trash2 size={12} />
              <span>Clear chat</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-[#8A8F98]/70">
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
                : 'text-[#8A8F98]'
            }`}
          >
            {charCount} / {MAX_CHARS}
          </span>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading || isOverLimit}
            className={`px-4 py-2 rounded-lg font-medium text-xs tracking-wide transition-all duration-200 flex items-center gap-2 shadow-sm ${
              !input.trim() || isLoading || isOverLimit
                ? 'bg-white/[0.05] text-[#8A8F98] border border-white/[0.06] cursor-not-allowed'
                : 'bg-[#5E6AD2] hover:bg-[#6872D9] text-[#EDEDEF] border border-[#717CE8]/40 shadow-[0_2px_12px_rgba(94,106,210,0.35)] active:scale-[0.98]'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <span>Send Query</span>
                <Send size={12} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
