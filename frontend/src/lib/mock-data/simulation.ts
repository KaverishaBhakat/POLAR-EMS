import { SimulationParams, SimulationResults, StationId } from '../types';

export const SCENARIO_PRESETS: Record<string, { name: string; description: string; params: SimulationParams }> = {
  normal: {
    name: 'Normal Day',
    description: 'Typical Antarctic summer-autumn conditions with standard personnel activity and moderate wind/solar resource.',
    params: {
      temperatureC: -20,
      windSpeedMs: 14,
      solarAvailabilityPercent: 75,
      stationOccupancyPercent: 55,
      batteryInitialSocPercent: 80,
      forecastErrorPercent: 5,
      generatorsAvailable: { g1: true, g2: true, g3: true, g4: true },
    },
  },
  extremeCold: {
    name: 'Extreme Cold (-48°C)',
    description: 'Polar vortex descent causing severe thermal envelope stress and maximum life-support line-tracing heating demand.',
    params: {
      temperatureC: -48,
      windSpeedMs: 18,
      solarAvailabilityPercent: 40,
      stationOccupancyPercent: 60,
      batteryInitialSocPercent: 70,
      forecastErrorPercent: 8,
      generatorsAvailable: { g1: true, g2: true, g3: true, g4: true },
    },
  },
  storm: {
    name: 'Antarctic Storm (Blizzard)',
    description: 'Violent katabatic storm (36 m/s gusting 45 m/s). Zero solar irradiance and wind turbine safety pitch-feather shutdown.',
    params: {
      temperatureC: -36,
      windSpeedMs: 36, // >25 m/s causes wind turbine auto-cutout safety shutdown!
      solarAvailabilityPercent: 0,
      stationOccupancyPercent: 100,
      batteryInitialSocPercent: 65,
      forecastErrorPercent: 20,
      generatorsAvailable: { g1: true, g2: true, g3: true, g4: true },
    },
  },
  lowRenewable: {
    name: 'Low Renewable Generation',
    description: 'Calm overcast weather with negligible wind (2.5 m/s) and dense cloud cover suppressing solar yield.',
    params: {
      temperatureC: -24,
      windSpeedMs: 2.5,
      solarAvailabilityPercent: 10,
      stationOccupancyPercent: 50,
      batteryInitialSocPercent: 45,
      forecastErrorPercent: 12,
      generatorsAvailable: { g1: true, g2: true, g3: true, g4: true },
    },
  },
  highOccupancy: {
    name: 'High Station Demand',
    description: 'Full summer expedition personnel occupancy (65+ scientists), all laboratory and core drill rigs operating at peak.',
    params: {
      temperatureC: -28,
      windSpeedMs: 15,
      solarAvailabilityPercent: 60,
      stationOccupancyPercent: 100,
      batteryInitialSocPercent: 85,
      forecastErrorPercent: 6,
      generatorsAvailable: { g1: true, g2: true, g3: true, g4: true },
    },
  },
  genFailure: {
    name: 'Generator Failure (G1 Outage)',
    description: 'Unscheduled primary Genset G1 emergency tripping during cold weather, testing automated backup and battery support.',
    params: {
      temperatureC: -30,
      windSpeedMs: 12,
      solarAvailabilityPercent: 50,
      stationOccupancyPercent: 65,
      batteryInitialSocPercent: 60,
      forecastErrorPercent: 10,
      generatorsAvailable: { g1: false, g2: true, g3: true, g4: true },
    },
  },
};

export function runSimulationCalculation(params: SimulationParams, stationId: StationId): SimulationResults {
  const isMaitri = stationId === 'maitri';
  const baseThermalDemand = Math.abs(params.temperatureC) * 3.5;
  const occupancyDemand = (params.stationOccupancyPercent / 100) * 85;
  const nominalBase = isMaitri ? 340 : 380;
  
  // Total baseline load
  const totalSimulatedLoad = Math.round(nominalBase + baseThermalDemand + occupancyDemand);
  const criticalLoadRequired = isMaitri ? 182 : 210;

  // Wind turbine physics:
  // Cut-in: 3 m/s, Rated: 12 m/s, Cut-out: 25 m/s (feathered for storm safety)
  let windEfficiency = 0;
  if (params.windSpeedMs >= 3 && params.windSpeedMs <= 25) {
    windEfficiency = Math.min(1.0, (params.windSpeedMs - 3) / 9);
  } else if (params.windSpeedMs > 25) {
    // Katabatic storm cutout protection
    windEfficiency = 0;
  }
  const maxWindCapacity = isMaitri ? 80 : 120;
  const totalWindKW = Math.round(maxWindCapacity * windEfficiency);

  // Solar yield
  const maxSolarCapacity = isMaitri ? 100 : 150;
  const totalSolarKW = Math.round(maxSolarCapacity * (params.solarAvailabilityPercent / 100) * 0.7);

  const totalRenewableKW = totalWindKW + totalSolarKW;
  const netDeficitKW = totalSimulatedLoad - totalRenewableKW;

  // Generator capacity available
  const availableGenCount = Object.values(params.generatorsAvailable).filter(Boolean).length;
  const unitCapacity = 135; // kW safe output per gen
  const totalGenCapacity = availableGenCount * unitCapacity;

  // Baseline unoptimized calculation
  const baselineFuelL = Math.round((totalSimulatedLoad * 24 * 0.28) / (0.8 + (1 - params.solarAvailabilityPercent / 100) * 0.1));
  const baselineRenewableUtil = Math.round(Math.min(100, (totalRenewableKW / Math.max(1, totalSimulatedLoad)) * 70));

  // POLAR-EMS Optimized calculation
  let requiredGenDispatch = Math.max(0, netDeficitKW);
  let batteryMinSoc = params.batteryInitialSocPercent;
  let stressLevel: 'NORMAL' | 'ELEVATED' | 'CRITICAL' = 'NORMAL';
  let energyStressDetected = false;
  const contingencyActions: string[] = [];

  // If deficit exceeds available generation capacity + battery
  const maxBatteryDischargeKW = 90;
  const maxAvailableGenerationTotal = totalGenCapacity + maxBatteryDischargeKW;

  if (netDeficitKW > totalGenCapacity) {
    const batteryNeeded = netDeficitKW - totalGenCapacity;
    batteryMinSoc = Math.max(15, params.batteryInitialSocPercent - (batteryNeeded * 8) / (isMaitri ? 5 : 6));
    if (netDeficitKW > maxAvailableGenerationTotal || batteryMinSoc < 25) {
      energyStressDetected = true;
      stressLevel = netDeficitKW > maxAvailableGenerationTotal ? 'CRITICAL' : 'ELEVATED';
      contingencyActions.push('Shed Flexible auxiliary loads (cryo-freeze buffering & laundry) saving ~94 kW');
      contingencyActions.push('Preserve 100% Critical Life-Support (thermal heating, ICU ward, SATCOM)');
      contingencyActions.push('Initiate high-rate emergency battery discharge (75 kW peak shaving)');
      contingencyActions.push('Cold-start auxiliary Genset G3 / G4 to stabilize AC microgrid frequency');
    }
  } else {
    // Normal or efficient dispatch
    batteryMinSoc = Math.max(30, params.batteryInitialSocPercent - 15);
  }

  const simulatedGenKW = Math.min(totalGenCapacity, requiredGenDispatch);
  const simulatedFuelL = Math.round((simulatedGenKW * 24 * 0.235) + 80);
  const simulatedRenewableUtil = Math.round(Math.min(100, (totalRenewableKW / Math.max(1, totalSimulatedLoad)) * 100));
  const criticalCoverage = energyStressDetected && netDeficitKW > maxAvailableGenerationTotal + 100 ? 94.2 : 100;

  const fuelSavedL = Math.max(40, baselineFuelL - simulatedFuelL);
  const fuelSavedPercent = +((fuelSavedL / baselineFuelL) * 100).toFixed(1);
  const co2SavedKg = Math.round(fuelSavedL * 2.68);

  // Generate 24h timeline
  const hours = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
  const timeline = hours.map((hour, idx) => {
    const solarCurve = Math.max(0, Math.sin(((idx - 1) / 5) * Math.PI));
    const hSolar = Math.round(totalSolarKW * solarCurve);
    const hWind = Math.round(totalWindKW * (0.9 + Math.sin(idx) * 0.2));
    const hRen = hSolar + hWind;
    const hLoad = Math.round(totalSimulatedLoad + (Math.sin(idx * 0.8) * 35));
    const hGen = Math.round(Math.min(totalGenCapacity, Math.max(30, hLoad - hRen)));
    const hSoc = Math.round(Math.max(batteryMinSoc, params.batteryInitialSocPercent - idx * 4 + (hRen > hLoad ? 8 : 0)));

    return {
      hour,
      loadDemandKW: hLoad,
      renewableGenKW: hRen,
      generatorDispatchKW: hGen,
      batterySocPercent: Math.min(100, Math.max(15, hSoc)),
    };
  });

  // AI Narrative Explanation
  let aiDecisionExplanation = '';
  if (params.windSpeedMs > 25) {
    aiDecisionExplanation = `Due to extreme storm wind speed (${params.windSpeedMs} m/s) exceeding the 25 m/s safety limit, wind turbines were pitched to feather mode to prevent mechanical fatigue. POLAR-EMS compensated by ramping active Gensets to 82% SFC sweet-spot while preserving critical life-support heating.`;
  } else if (params.temperatureC < -40) {
    aiDecisionExplanation = `Deep Antarctic cold (-48°C) increased thermal heating demand by +${Math.round(baseThermalDemand)} kW. POLAR-EMS pre-emptively staged secondary Generator G2 and utilized battery peak-shaving to avoid generator overloading.`;
  } else if (!params.generatorsAvailable.g1) {
    aiDecisionExplanation = `Detected Primary Genset G1 outage. POLAR-EMS instantly activated high-speed BESS discharge (65 kW) to prevent bus voltage collapse, and automatically signaled Genset G2 to assume primary load.`;
  } else {
    aiDecisionExplanation = `Under simulated conditions, POLAR-EMS prioritized direct renewable consumption (${simulatedRenewableUtil}% penetration), achieving ${fuelSavedPercent}% fuel reduction (${fuelSavedL} L/day saved) while maintaining 100% critical load reliability.`;
  }

  return {
    baseline: {
      fuelConsumptionL: baselineFuelL,
      renewableUtilPercent: baselineRenewableUtil,
      batteryMinSocPercent: Math.round(params.batteryInitialSocPercent * 0.6),
      generatorRuntimeHours: 48,
      criticalLoadCoveragePercent: criticalCoverage,
      co2EmissionsKg: Math.round(baselineFuelL * 2.68),
    },
    simulated: {
      fuelConsumptionL: simulatedFuelL,
      renewableUtilPercent: simulatedRenewableUtil,
      batteryMinSocPercent: Math.round(batteryMinSoc),
      generatorRuntimeHours: availableGenCount > 1 ? 34 : 24,
      criticalLoadCoveragePercent: criticalCoverage,
      co2EmissionsKg: Math.round(simulatedFuelL * 2.68),
    },
    delta: {
      fuelSavedL,
      fuelSavedPercent,
      co2SavedKg,
    },
    energyStressDetected,
    stressLevel,
    contingencyActions,
    aiDecisionExplanation,
    timeline,
  };
}
