'use client';

import React from 'react';
import { SystemAlert } from '@/lib/types';
import { StatusBadge } from '../common/StatusBadge';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  BrainCircuit,
  CheckCircle2,
  Trash2,
  Clock,
  Building2,
} from 'lucide-react';

interface AlertCardProps {
  alert: SystemAlert;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onAcknowledge,
  onDismiss,
}) => {
  const iconConfig = {
    CRITICAL: {
      icon: AlertOctagon,
      color: 'text-rose-400',
      border: 'border-rose-500/40',
      bg: 'bg-rose-500/5',
    },
    WARNING: {
      icon: AlertTriangle,
      color: 'text-amber-400',
      border: 'border-amber-500/40',
      bg: 'bg-amber-500/5',
    },
    INFO: {
      icon: Info,
      color: 'text-sky-400',
      border: 'border-sky-500/40',
      bg: 'bg-sky-500/5',
    },
    AI_INSIGHT: {
      icon: BrainCircuit,
      color: 'text-cyan-400',
      border: 'border-cyan-500/40',
      bg: 'bg-cyan-500/5',
    },
  }[alert.severity];

  const Icon = iconConfig.icon;

  return (
    <div
      className={`rounded-lg border p-4 font-mono transition-all duration-200 ${
        alert.acknowledged ? 'opacity-70 bg-[#0A101A] border-[#1B2C42]' : `${iconConfig.bg} ${iconConfig.border} bg-[#0E1724]/90`
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2.5">
        <div className="flex items-start gap-2.5">
          <div className={`p-1.5 rounded bg-[#132032] border border-[#1B2C42] mt-0.5 ${iconConfig.color}`}>
            <Icon size={16} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-slate-100 uppercase">
                {alert.title}
              </h4>
              <StatusBadge status={alert.severity} size="sm" />
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#132032] text-slate-400 uppercase">
                {alert.category}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
              <span className="flex items-center gap-1">
                <Clock size={11} /> {alert.timestamp}
              </span>
              <span className="flex items-center gap-1 uppercase text-cyan-400">
                <Building2 size={11} /> {alert.stationId} Station
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-end sm:self-start">
          {!alert.acknowledged ? (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/25 text-[11px] font-bold uppercase transition-all"
            >
              <CheckCircle2 size={13} />
              <span>Acknowledge</span>
            </button>
          ) : (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded">
              <CheckCircle2 size={11} /> Acknowledged
            </span>
          )}

          <button
            onClick={() => onDismiss(alert.id)}
            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Dismiss Alert"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed pl-8 mb-2">
        {alert.description}
      </p>

      {/* Root Cause & Action Accordion */}
      <div className="ml-8 p-2.5 rounded bg-[#080E17] border border-[#1B2C42]/60 text-[11px] space-y-1">
        <div>
          <span className="text-slate-400 font-bold uppercase">Root Cause: </span>
          <span className="text-slate-300">{alert.rootCause}</span>
        </div>
        <div>
          <span className="text-cyan-400 font-bold uppercase">Recommended Protocol: </span>
          <span className="text-slate-200">{alert.recommendedAction}</span>
        </div>
      </div>
    </div>
  );
};
