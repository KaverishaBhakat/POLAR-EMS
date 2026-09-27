import React from 'react';
import { Database, Sun, Activity, Sliders, Cpu, Wrench, HelpCircle, ShieldAlert, LucideIcon } from 'lucide-react';

export type ProvenanceCategory =
  | 'REAL'
  | 'MEASURED'
  | 'REAL_MEASURED'
  | 'REAL / MEASURED'
  | 'REAL_CLIMATOLOGY'
  | 'REAL CLIMATOLOGY'
  | 'CLIMATOLOGY'
  | 'MODELED'
  | 'SCENARIO'
  | 'OPTIMIZATION'
  | 'OR_TOOLS_MILP'
  | 'ENGINEERING_ASSUMPTION'
  | 'ENGINEERING ASSUMPTION'
  | 'ASSUMPTION'
  | 'UNAVAILABLE';

export interface ProvenanceBadgeProps {
  type: ProvenanceCategory | string;
  label?: string;
  size?: 'xs' | 'sm' | 'md';
  showTooltip?: boolean;
  className?: string;
}

interface ProvenanceConfig {
  key: string;
  displayLabel: string;
  description: string;
  bg: string;
  text: string;
  border: string;
  dotColor: string;
  icon: LucideIcon;
}

const PROVENANCE_MAP: Record<string, ProvenanceConfig> = {
  REAL_MEASURED: {
    key: 'REAL_MEASURED',
    displayLabel: 'REAL / MEASURED',
    description: 'Physical sensor observation or live SCADA telemetry recorded at the station node.',
    bg: 'bg-emerald-950/70',
    text: 'text-emerald-300',
    border: 'border-emerald-500/40',
    dotColor: 'bg-emerald-400',
    icon: Database,
  },
  REAL_CLIMATOLOGY: {
    key: 'REAL_CLIMATOLOGY',
    displayLabel: 'REAL CLIMATOLOGY',
    description: 'Historical observed climatological dataset (e.g. Maitri 1985–2000 solar radiation normals).',
    bg: 'bg-sky-950/70',
    text: 'text-sky-300',
    border: 'border-sky-500/40',
    dotColor: 'bg-sky-400',
    icon: Sun,
  },
  MODELED: {
    key: 'MODELED',
    displayLabel: 'MODELED',
    description: 'Mathematically derived output (e.g. PV yield from irradiance, wind power from turbine curve).',
    bg: 'bg-amber-950/70',
    text: 'text-amber-300',
    border: 'border-amber-500/40',
    dotColor: 'bg-amber-400',
    icon: Activity,
  },
  SCENARIO: {
    key: 'SCENARIO',
    displayLabel: 'SCENARIO',
    description: 'Contingency or what-if mutation parameter for resilience stress-testing.',
    bg: 'bg-purple-950/70',
    text: 'text-purple-300',
    border: 'border-purple-500/40',
    dotColor: 'bg-purple-400',
    icon: Sliders,
  },
  OPTIMIZATION: {
    key: 'OPTIMIZATION',
    displayLabel: 'OPTIMIZATION',
    description: 'Decision output synthesized by Google OR-Tools MILP unit commitment and dispatch engine.',
    bg: 'bg-cyan-950/70',
    text: 'text-cyan-300',
    border: 'border-cyan-500/40',
    dotColor: 'bg-cyan-400',
    icon: Cpu,
  },
  ENGINEERING_ASSUMPTION: {
    key: 'ENGINEERING_ASSUMPTION',
    displayLabel: 'ENGINEERING ASSUMPTION',
    description: 'Station design configuration parameter or hardware specification baseline.',
    bg: 'bg-indigo-950/70',
    text: 'text-indigo-300',
    border: 'border-indigo-500/40',
    dotColor: 'bg-indigo-400',
    icon: Wrench,
  },
  UNAVAILABLE: {
    key: 'UNAVAILABLE',
    displayLabel: 'UNAVAILABLE',
    description: 'No telemetry or model output recorded for this temporal window (e.g. polar night).',
    bg: 'bg-slate-900/80',
    text: 'text-slate-400',
    border: 'border-slate-700/50',
    dotColor: 'bg-slate-500',
    icon: ShieldAlert,
  },
};

function normalizeType(raw: string): ProvenanceConfig {
  const norm = raw.trim().toUpperCase().replace(/[\/\s-]+/g, '_');
  if (norm === 'REAL' || norm === 'MEASURED' || norm === 'REAL_MEASURED') {
    return PROVENANCE_MAP.REAL_MEASURED;
  }
  if (norm === 'REAL_CLIMATOLOGY' || norm === 'CLIMATOLOGY' || norm === 'CLIMATOLOGICAL_ESTIMATE') {
    return PROVENANCE_MAP.REAL_CLIMATOLOGY;
  }
  if (norm === 'MODELED' || norm === 'MODEL' || norm === 'DERIVED') {
    return PROVENANCE_MAP.MODELED;
  }
  if (norm === 'SCENARIO' || norm === 'WHAT_IF') {
    return PROVENANCE_MAP.SCENARIO;
  }
  if (norm === 'OPTIMIZATION' || norm === 'OPTIMIZED' || norm === 'OR_TOOLS_MILP' || norm === 'MILP') {
    return PROVENANCE_MAP.OPTIMIZATION;
  }
  if (norm === 'ENGINEERING_ASSUMPTION' || norm === 'ASSUMPTION' || norm === 'CONFIGURATION') {
    return PROVENANCE_MAP.ENGINEERING_ASSUMPTION;
  }
  if (norm === 'UNAVAILABLE' || norm === 'NULL' || norm === 'OFFLINE') {
    return PROVENANCE_MAP.UNAVAILABLE;
  }
  return PROVENANCE_MAP.MODELED;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  type,
  label,
  size = 'xs',
  showTooltip = true,
  className = '',
}) => {
  const config = normalizeType(type);
  const Icon = config.icon;

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 tracking-wider gap-1',
    sm: 'text-[10px] px-2 py-0.5 tracking-wider gap-1.5',
    md: 'text-xs px-2.5 py-1 tracking-wider gap-2',
  }[size];

  const iconSizes = {
    xs: 10,
    sm: 11,
    md: 13,
  }[size];

  return (
    <span
      title={showTooltip ? `${config.displayLabel}: ${config.description}` : undefined}
      className={`inline-flex items-center font-mono font-bold uppercase rounded border select-none transition-colors ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
      role="status"
      aria-label={`Provenance: ${config.displayLabel}`}
    >
      <Icon size={iconSizes} className="flex-shrink-0" />
      <span>{label || config.displayLabel}</span>
    </span>
  );
};
