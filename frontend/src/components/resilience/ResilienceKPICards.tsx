'use client';

import {
  Zap,
  Leaf,
  Cpu,
  Fuel,
  Clock,
  BatteryCharging,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { ResilienceMetrics } from '@/lib/types';
import { ProvenanceBadge } from '../common/ProvenanceBadge';

interface ResilienceKPICardsProps {
  metrics: ResilienceMetrics | null | undefined;
  objectiveValue?: number | null;
}

export const ResilienceKPICards: React.FC<ResilienceKPICardsProps> = ({
  metrics,
  objectiveValue,
}) => {
  if (!metrics) return null;

  const totalDemand = metrics.total_demand_kwh ?? 0;
  const pvAvail = metrics.total_pv_available_kwh ?? 0;
  const windAvail = metrics.total_wind_available_kwh ?? 0;
  const renewAvail = metrics.total_renewable_available_kwh ?? pvAvail + windAvail;
  const renewUsed = metrics.total_renewable_used_kwh ?? 0;
  const renewUtil = metrics.renewable_utilization_percent ?? 100;

  const genEnergy = metrics.total_generator_energy_kwh ?? 0;
  const fuelLiters = metrics.estimated_fuel_liters ?? 0;
  const genHours = metrics.generator_runtime_hours ?? 0;

  const minSoc = metrics.minimum_battery_soc_percent ?? 20;
  const maxSoc = metrics.maximum_battery_soc_percent ?? 95;

  const criticalShed = metrics.total_critical_load_shed_kwh ?? 0;
  const criticalReliability = metrics.critical_load_reliability_percent ?? 100;

  const objVal = objectiveValue ?? 0;

  const cards = [
    {
      id: 'demand',
      title: 'Total Demand',
      value: `${totalDemand.toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh`,
      subtitle: '24-hour station load',
      icon: Zap,
      accentColor: 'text-amber-400',
      borderColor: 'border-[#1E324A]',
      provenance: 'SCENARIO',
    },
    {
      id: 'renewable',
      title: 'Renewable Energy',
      value: `${renewUsed.toFixed(1)} / ${renewAvail.toFixed(1)} kWh`,
      subtitle: `${renewUtil.toFixed(1)}% utilization (PV+Wind)`,
      icon: Leaf,
      accentColor: 'text-emerald-400',
      borderColor: 'border-[#1E324A]',
      provenance: 'MODELED',
    },
    {
      id: 'generator',
      title: 'Generator Energy',
      value: `${genEnergy.toFixed(1)} kWh`,
      subtitle: metrics.failed_generator_identifier
        ? `${metrics.failed_generator_identifier} OFFLINE (GEN-02 active)`
        : 'Primary & secondary gensets',
      icon: Cpu,
      accentColor: 'text-blue-400',
      borderColor: 'border-[#1E324A]',
      provenance: 'OPTIMIZATION',
    },
    {
      id: 'fuel',
      title: 'Fuel Consumption',
      value: `${fuelLiters.toFixed(1)} L`,
      subtitle: 'Estimated polar diesel (SAB)',
      icon: Fuel,
      accentColor: 'text-rose-400',
      borderColor: 'border-[#1E324A]',
      provenance: 'OPTIMIZATION',
    },
    {
      id: 'runtime',
      title: 'Generator Runtime',
      value: `${genHours} h`,
      subtitle: 'Committed genset hours',
      icon: Clock,
      accentColor: 'text-cyan-400',
      borderColor: 'border-[#1E324A]',
      provenance: 'OPTIMIZATION',
    },
    {
      id: 'battery',
      title: 'Battery SOC Limits',
      value: `${minSoc.toFixed(1)}% – ${maxSoc.toFixed(1)}%`,
      subtitle: 'Min reserve & peak capacity',
      icon: BatteryCharging,
      accentColor: 'text-teal-400',
      borderColor: 'border-[#1E324A]',
      provenance: 'OPTIMIZATION',
    },
    {
      id: 'critical_load',
      title: 'Critical Load Shed',
      value: `${criticalShed.toFixed(1)} kWh`,
      subtitle: `${criticalReliability.toFixed(1)}% life-support reliability`,
      icon: ShieldCheck,
      accentColor: criticalShed > 0 ? 'text-rose-400' : 'text-emerald-400',
      borderColor: criticalShed > 0 ? 'border-rose-500/40' : 'border-[#1E324A]',
      provenance: 'OPTIMIZATION',
    },
    {
      id: 'objective',
      title: 'Optimization Objective',
      value: objVal.toFixed(2),
      subtitle: 'MILP economic & penalty cost',
      icon: Target,
      accentColor: 'text-purple-400',
      borderColor: 'border-[#1E324A]',
      provenance: 'OPTIMIZATION',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 font-mono">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className={`p-3 rounded-lg bg-[#0E1724]/90 border ${card.borderColor} flex flex-col justify-between space-y-2`}
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider truncate" title={card.title}>
                {card.title}
              </span>
              <Icon className={`w-3.5 h-3.5 ${card.accentColor} flex-shrink-0`} />
            </div>

            <div>
              <div className="text-sm sm:text-base font-extrabold text-white truncate" title={card.value}>
                {card.value}
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5 truncate" title={card.subtitle}>
                {card.subtitle}
              </p>
            </div>

            <div className="pt-1 border-t border-[#1B2C42]/50 flex items-center justify-between">
              <ProvenanceBadge type={card.provenance} size="xs" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
