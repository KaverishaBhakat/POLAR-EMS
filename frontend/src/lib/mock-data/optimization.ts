import { HourlyDispatchPoint, OptimizationMetrics, StationId } from '../types';

export const OPTIMIZATION_METRICS: Record<StationId, OptimizationMetrics> = {
  maitri: {
    baselineFuelL: 1040,
    optimizedFuelL: 820,
    fuelSavedL: 220,
    fuelSavedPercent: 21.2,
    
    baselineRenewableUtilPercent: 28.4,
    optimizedRenewableUtilPercent: 44.8,
    
    baselineGeneratorRuntimeHours: 48, // 2 gensets running continuously
    optimizedGeneratorRuntimeHours: 34, // Smart cycling and single-gen peak shaving
    
    baselineCo2Kg: 2780,
    optimizedCo2Kg: 2190,
    co2AvoidedKg: 590,
    
    criticalLoadReliabilityPercent: 100,
    solverExecutionTimeMs: 428,
    solverStatus: 'OPTIMAL',
  },
  bharati: {
    baselineFuelL: 1180,
    optimizedFuelL: 890,
    fuelSavedL: 290,
    fuelSavedPercent: 24.6,
    
    baselineRenewableUtilPercent: 32.1,
    optimizedRenewableUtilPercent: 52.4,
    
    baselineGeneratorRuntimeHours: 48,
    optimizedGeneratorRuntimeHours: 31,
    
    baselineCo2Kg: 3150,
    optimizedCo2Kg: 2375,
    co2AvoidedKg: 775,
    
    criticalLoadReliabilityPercent: 100,
    solverExecutionTimeMs: 395,
    solverStatus: 'OPTIMAL',
  },
};

export const OPTIMIZATION_RULES = [
  {
    step: 1,
    title: 'Renewable Priority Dispatch',
    rule: 'Direct all real-time solar photovoltaic and wind turbine generation directly to instantaneous station load before fossil fuel engagement.',
    status: 'ACTIVE',
    badge: 'PRIORITY 1',
  },
  {
    step: 2,
    title: 'Surplus BESS Absorption',
    rule: 'Automatically route net renewable surplus generation to charge the 500 kWh Lithium Iron Phosphate battery bank, preventing turbine curtailment.',
    status: 'ACTIVE',
    badge: 'STORAGE',
  },
  {
    step: 3,
    title: '30% Critical Reserve Lock',
    rule: 'Enforce strict 30% minimum battery state of charge (SOC) buffer reserved exclusively for emergency medical, SATCOM, and freeze-protection heating loads.',
    status: 'ENFORCED',
    badge: 'SAFETY CONSTRAINT',
  },
  {
    step: 4,
    title: 'Optimal Specific Fuel Consumption (SFC) Band',
    rule: 'Constrain active diesel generators to operate within 75%–85% rated capacity band where brake specific fuel consumption is minimized (18.2 L/h).',
    status: 'ACTIVE',
    badge: 'EFFICIENCY',
  },
  {
    step: 5,
    title: '100% Critical Load Guarantee',
    rule: 'Continuous algorithmic verification ensuring total operating spinning reserve exceeds critical life-support demand (182 kW) by at least 150%.',
    status: 'ENFORCED',
    badge: 'SAFETY CONSTRAINT',
  },
  {
    step: 6,
    title: 'Predictive Multi-Generator Staging',
    rule: 'Pre-warm and stage secondary generator G2 only when AI forecast predicts net demand deficit exceeding single-genset safe envelope for >20 mins.',
    status: 'ACTIVE',
    badge: 'AI DISPATCH',
  },
];

export function generateDispatchSchedule(stationId: StationId): HourlyDispatchPoint[] {
  const isMaitri = stationId === 'maitri';
  const hours = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
  ];

  return hours.map((time, idx) => {
    // Solar profile
    const solarFactor = Math.max(0, Math.sin(((idx - 5) / 14) * Math.PI));
    const solarKW = Math.round(solarFactor * (isMaitri ? 80 : 120));

    // Wind profile
    const windKW = Math.round((isMaitri ? 70 : 95) + Math.sin(idx * 0.8) * 25);

    // Total load
    const activity = (idx >= 7 && idx <= 21) ? 50 : 15;
    const totalLoadKW = Math.round((isMaitri ? 390 : 440) + activity + Math.sin(idx * 0.4) * 20);

    const totalRenewables = solarKW + windKW;
    const deficit = totalLoadKW - totalRenewables;

    let batteryDischargeKW = 0;
    let batteryChargeKW = 0;
    let generator1KW = 0;
    let generator2KW = 0;
    let generator3KW = 0;

    if (deficit < 0) {
      // Surplus renewables: charge battery
      batteryChargeKW = Math.min(60, Math.abs(deficit));
      generator1KW = 40; // Idle/base minimum
    } else {
      // Deficit: dispatch battery first during peak hours (18:00-21:00)
      if (idx >= 17 && idx <= 21) {
        batteryDischargeKW = Math.min(75, deficit * 0.4);
      } else if (idx >= 6 && idx <= 9) {
        batteryDischargeKW = Math.min(50, deficit * 0.3);
      }

      const remainingDeficit = Math.max(0, deficit - batteryDischargeKW);
      
      // G1 takes primary efficient load up to 135 kW
      generator1KW = Math.min(135, remainingDeficit);
      
      // G2 takes remainder if G1 maxes out
      if (remainingDeficit > 135) {
        generator2KW = Math.min(125, remainingDeficit - 135);
      }
    }

    return {
      time,
      solarKW,
      windKW,
      batteryDischargeKW: Math.round(batteryDischargeKW),
      batteryChargeKW: Math.round(batteryChargeKW),
      generator1KW: Math.round(generator1KW),
      generator2KW: Math.round(generator2KW),
      generator3KW,
      totalLoadKW,
      netDeficitKW: Math.round(deficit),
    };
  });
}
