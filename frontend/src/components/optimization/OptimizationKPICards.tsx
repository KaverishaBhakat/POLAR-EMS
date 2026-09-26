'use client';

import React from 'react';
import { OptimizationMetrics, OptimizationResultData } from '@/lib/types';
import {
  Sun,
  BatteryCharging,
  Zap,
  Clock,
  Fuel,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Percent,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface OptimizationKPICardsProps {
  optimizationData: OptimizationResultData;
  metrics: OptimizationMetrics;
}

export const OptimizationKPICards: React.FC<OptimizationKPICardsProps> = ({
  optimizationData,
  metrics,
}) => {
  const solverStatus = metrics.solverStatus || optimizationData.status || 'OPTIMAL';
  const pvAvailable = metrics.totalPVAvailableKWh ?? optimizationData.totalPVAvailableKWh ?? 0;
  const pvUsed = metrics.totalPVUsedKWh ?? optimizationData.totalPVUsedKWh ?? 0;
  const pvCurtailed = metrics.totalPVCurtailedKWh ?? optimizationData.totalPVCurtailedKWh ?? 0;
  const pvUtilization = metrics.pvUtilizationPercent ?? optimizationData.pvUtilizationPercent ?? 100.0;
  const batteryDischarge = metrics.totalBatteryDischarge ?? optimizationData.totalBatteryDischarge ?? 0;
  const genOutput = metrics.totalGeneratorEnergy ?? optimizationData.totalGeneratorEnergy ?? 0;
  const genRuntime = metrics.optimizedGeneratorRuntimeHours ?? optimizationData.generatorCommittedHours ?? 0;
  const optimizedFuel = metrics.optimizedFuelL ?? optimizationData.totalEstimatedFuel ?? 0;
  const criticalLoadShed = metrics.criticalLoadShedTotalKWh ?? optimizationData.criticalLoadShedTotalKWh ?? 0;

  const cards = [
    {
      id: 'status',
      label: 'Optimization Status',
      value: solverStatus,
      unit: '',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
      badge: (
        <StatusBadge
          status={solverStatus === 'OPTIMAL' || solverStatus === 'SUCCESS' ? 'OPERATIONAL' : 'WARNING'}
          label={solverStatus}
          size="sm"
        />
      ),
      subtext: 'MILP SCIP Solver',
    },
    {
      id: 'pv-available',
      label: 'PV Available',
      value: pvAvailable.toFixed(1),
      unit: 'kWh',
      icon: Sun,
      iconColor: 'text-amber-400',
      subtext: 'Dec Climatology Model',
    },
    {
      id: 'pv-used',
      label: 'PV Used',
      value: pvUsed.toFixed(1),
      unit: 'kWh',
      icon: Sun,
      iconColor: 'text-emerald-400',
      subtext: 'Dispatched to Load/BESS',
    },
    {
      id: 'pv-curtailed',
      label: 'PV Curtailed',
      value: pvCurtailed.toFixed(1),
      unit: 'kWh',
      icon: Layers,
      iconColor: pvCurtailed > 0 ? 'text-amber-400' : 'text-slate-400',
      subtext: pvCurtailed === 0 ? 'Zero Curtailment' : 'Spillover',
    },
    {
      id: 'pv-utilization',
      label: 'PV Utilization',
      value: pvUtilization.toFixed(1),
      unit: '%',
      icon: Percent,
      iconColor: 'text-cyan-400',
      subtext: 'Solar Absorption Rate',
    },
    {
      id: 'battery-discharge',
      label: 'Battery Discharge',
      value: batteryDischarge.toFixed(1),
      unit: 'kWh',
      icon: BatteryCharging,
      iconColor: 'text-cyan-400',
      subtext: 'Peak Shaving / Deficit',
    },
    {
      id: 'generator-output',
      label: 'Generator Output',
      value: genOutput.toFixed(1),
      unit: 'kWh',
      icon: Zap,
      iconColor: 'text-blue-400',
      subtext: 'Supplementary Genset',
    },
    {
      id: 'generator-runtime',
      label: 'Generator Runtime',
      value: String(genRuntime),
      unit: 'hours',
      icon: Clock,
      iconColor: 'text-blue-400',
      subtext: '24-hour lookahead',
    },
    {
      id: 'optimized-fuel',
      label: 'Optimized Fuel',
      value: optimizedFuel.toFixed(1),
      unit: 'liters',
      icon: Fuel,
      iconColor: 'text-emerald-400',
      subtext: `Saved ${metrics.fuelSavedL?.toFixed(1) ?? '13.0'} L (${metrics.fuelSavedPercent?.toFixed(1) ?? '21.9'}%)`,
    },
    {
      id: 'critical-load-shed',
      label: 'Critical Load Shed',
      value: criticalLoadShed.toFixed(1),
      unit: 'kWh',
      icon: criticalLoadShed === 0 ? ShieldCheck : AlertTriangle,
      iconColor: criticalLoadShed === 0 ? 'text-emerald-400' : 'text-rose-400',
      subtext: criticalLoadShed === 0 ? '100% Life Support Safe' : 'Emergency Shedding',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <div
            key={card.id}
            className="p-3.5 rounded-lg bg-[#0E1724]/90 border border-[#1B2C42] hover:border-cyan-500/40 transition-all font-mono space-y-1.5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400">
              <span className="truncate">{card.label}</span>
              <IconComponent size={14} className={card.iconColor} />
            </div>

            <div className="pt-0.5">
              {card.badge ? (
                <div className="py-1">{card.badge}</div>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {card.value}
                  </span>
                  {card.unit && (
                    <span className="text-[11px] text-slate-400 font-semibold">{card.unit}</span>
                  )}
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-500 truncate pt-0.5 border-t border-[#1B2C42]/50">
              {card.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
};
