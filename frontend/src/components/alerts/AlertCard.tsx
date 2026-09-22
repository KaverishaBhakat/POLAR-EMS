'use client';

import React from 'react';
import { AlertRecord, SystemAlert } from '@/lib/types';
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
  Cpu,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface AlertCardProps {
  alert: AlertRecord | SystemAlert;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onAcknowledge,
  onDismiss,
}) => {
  const isRecord = 'message' in alert;
  const severity = alert.severity || 'INFO';
  const status = ('status' in alert ? (alert as AlertRecord).status : (alert as SystemAlert).acknowledged ? 'ACKNOWLEDGED' : (alert as SystemAlert).dismissed ? 'RESOLVED' : 'ACTIVE') || 'ACTIVE';
  const title = alert.title || 'System Alert';
  const message = isRecord ? (alert as AlertRecord).message : (alert as SystemAlert).description;
  const category = (isRecord ? (alert as AlertRecord).type : (alert as SystemAlert).category) || 'SYSTEM';
  const source = isRecord ? (alert as AlertRecord).source : (alert as SystemAlert).rootCause || 'SCADA Controller';
  const stationDisplay = isRecord && (alert as AlertRecord).station ? (alert as AlertRecord).station?.code || (alert as AlertRecord).station?.name : alert.stationId;
  const timestamp = isRecord && alert.createdAt
    ? new Date(alert.createdAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : (alert as SystemAlert).timestamp || 'N/A';

  const isAcknowledged = status === 'ACKNOWLEDGED' || Boolean(('acknowledgedAt' in alert && (alert as AlertRecord).acknowledgedAt) || (alert as SystemAlert).acknowledged);
  const isResolved = status === 'RESOLVED' || Boolean(('dismissed' in alert && (alert as SystemAlert).dismissed));

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
  }[severity] || {
    icon: Info,
    color: 'text-cyan-400',
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-500/5',
  };

  const Icon = iconConfig.icon;

  return (
    <div
      className={`rounded-lg border p-4 font-mono transition-all duration-200 ${
        isResolved
          ? 'opacity-50 bg-[#080D15] border-[#152336]'
          : isAcknowledged
          ? 'opacity-80 bg-[#0A101A] border-[#1B2C42]'
          : `${iconConfig.bg} ${iconConfig.border} bg-[#0E1724]/90`
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
                {title}
              </h4>
              <StatusBadge status={severity} size="sm" />
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#132032] text-slate-400 uppercase">
                {category}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
              <span className="flex items-center gap-1">
                <Clock size={11} /> {timestamp}
              </span>
              {stationDisplay && (
                <span className="flex items-center gap-1 uppercase text-cyan-400">
                  <Building2 size={11} /> {stationDisplay}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-end sm:self-start">
          {!isAcknowledged && !isResolved && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/25 text-[11px] font-bold uppercase transition-all"
            >
              <CheckCircle2 size={13} />
              <span>Acknowledge</span>
            </button>
          )}

          {isAcknowledged && !isResolved && (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded">
              <Check size={11} /> Acknowledged
            </span>
          )}

          {isResolved && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1 px-2 py-0.5 bg-slate-800/50 border border-slate-700/40 rounded">
              <ShieldCheck size={11} className="text-emerald-400" /> Resolved
            </span>
          )}

          {!isResolved && (
            <button
              onClick={() => onDismiss(alert.id)}
              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Resolve / Dismiss Alert"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed pl-8 mb-2">
        {message}
      </p>

      {/* Source / Telemetry Origin */}
      <div className="ml-8 p-2.5 rounded bg-[#080E17] border border-[#1B2C42]/60 text-[11px] space-y-1">
        <div>
          <span className="text-slate-400 font-bold uppercase">Telemetry Source: </span>
          <span className="text-slate-300">{source}</span>
        </div>
        <div>
          <span className="text-cyan-400 font-bold uppercase">SCADA Safety Status: </span>
          <span className="text-slate-200">
            {isResolved
              ? 'Issue marked resolved by operator'
              : isAcknowledged
              ? 'Acknowledged — active monitoring'
              : 'Unacknowledged trigger — requires operator review'}
          </span>
        </div>
      </div>
    </div>
  );
};
