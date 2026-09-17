'use client';

import React from 'react';
import { useStation } from '@/lib/context/StationContext';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStation();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4">
      {toasts.map((toast) => {
        const config = {
          SUCCESS: {
            icon: CheckCircle2,
            border: 'border-emerald-500/40',
            bg: 'bg-[#0A1A17]/95 text-emerald-300',
            iconColor: 'text-emerald-400',
          },
          WARNING: {
            icon: AlertTriangle,
            border: 'border-amber-500/40',
            bg: 'bg-[#1A1608]/95 text-amber-300',
            iconColor: 'text-amber-400',
          },
          ERROR: {
            icon: AlertOctagon,
            border: 'border-rose-500/40',
            bg: 'bg-[#1A0A0E]/95 text-rose-300',
            iconColor: 'text-rose-400',
          },
          INFO: {
            icon: Info,
            border: 'border-cyan-500/40',
            bg: 'bg-[#0A1520]/95 text-cyan-300',
            iconColor: 'text-cyan-400',
          },
        }[toast.type];

        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border ${config.border} ${config.bg} shadow-2xl backdrop-blur-md transition-all duration-300 animate-slide-in-right`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
            <div className="flex-1 pr-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider font-mono text-slate-100">
                {toast.title}
              </h4>
              <p className="text-xs text-slate-300/90 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const LoadingSkeleton: React.FC<{ className?: string }> = ({ className = 'h-32 w-full' }) => (
  <div
    className={`bg-[#0D1623]/80 border border-[#1B2C42]/50 rounded-lg animate-pulse ${className}`}
  />
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-[#1B2C42] rounded-lg bg-[#0A101A]/60">
    <Info className="w-10 h-10 text-cyan-400/50 mb-3" />
    <h4 className="text-sm font-mono uppercase tracking-wider text-slate-200">{title}</h4>
    <p className="text-xs text-slate-400 mt-1 max-w-sm mb-4">{description}</p>
    {action}
  </div>
);
