'use client';

import React from 'react';
import { ShieldAlert, Database, MapPin, ArrowRight, LucideIcon } from 'lucide-react';
import { ProvenanceBadge } from './ProvenanceBadge';
import { GlassCard, Button } from '@/components/ui';
import { useStation } from '@/lib/context/StationContext';

export interface StationUnavailableStateProps {
  title?: string;
  subsystemName?: string;
  description?: string;
  icon?: LucideIcon;
  stationName?: string;
  provenanceType?: string;
  className?: string;
  showSwitchToMaitri?: boolean;
}

export const StationUnavailableState: React.FC<StationUnavailableStateProps> = ({
  title = 'Telemetry unavailable',
  subsystemName,
  description,
  icon: Icon = ShieldAlert,
  stationName = 'Bharati Station',
  provenanceType = 'UNAVAILABLE',
  className = '',
  showSwitchToMaitri = true,
}) => {
  const { setActiveStationId } = useStation();

  const defaultDescription = subsystemName
    ? `No measured ${subsystemName.toLowerCase()} telemetry has been ingested for ${stationName} yet.`
    : `No measured electrical telemetry has been ingested for ${stationName} yet.`;

  return (
    <GlassCard className={`p-8 sm:p-10 text-center space-y-5 max-w-2xl mx-auto my-6 border-amber-500/20 bg-[#0A121E]/80 backdrop-blur-xl ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-[0_0_20px_rgba(245,158,11,0.1)]">
        <Icon size={26} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          <ProvenanceBadge type={provenanceType} size="xs" />
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            {stationName}
          </span>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-slate-100 font-mono tracking-tight uppercase">
          {title}
        </h3>

        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
          {description || defaultDescription}
        </p>

        <p className="text-[11px] text-slate-400 font-mono pt-1">
          POLAR-EMS strictly preserves zero-fabrication integrity. Real weather observations for Bharati (50,248 rows) remain active in Meteorology.
        </p>
      </div>

      {showSwitchToMaitri && (
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Button
            onClick={() => setActiveStationId('maitri')}
            variant="secondary"
            size="sm"
            className="border-white/10 hover:border-accent/40"
          >
            <MapPin size={13} className="mr-1.5 text-accent-bright" />
            <span>Switch to Maitri Modeled Subsystem</span>
            <ArrowRight size={13} className="ml-1.5" />
          </Button>
        </div>
      )}
    </GlassCard>
  );
};
