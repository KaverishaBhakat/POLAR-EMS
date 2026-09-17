/**
 * POLAR-EMS Deterministic Calculations Engine
 * Rule-based physical and mathematical calculations only.
 * No AI/ML is claimed or used here.
 */

/**
 * Calculates renewable penetration percentage
 * @param {number} renewableKW - Total renewable generation in kW
 * @param {number} totalLoadKW - Total station load in kW
 * @returns {number} Penetration percentage (0-100+)
 */
const calculateRenewablePenetration = (renewableKW, totalLoadKW) => {
  if (!totalLoadKW || totalLoadKW <= 0) return 0;
  const penetration = (renewableKW / totalLoadKW) * 100;
  return Math.max(0, Math.round(penetration * 10) / 10);
};

/**
 * Calculates energy balance across microgrid assets
 * @param {number} renewableKW - Renewable power (solar + wind)
 * @param {number} generatorKW - Generator output power
 * @param {number} batteryDischargeKW - Battery discharge power
 * @param {number} batteryChargeKW - Battery charge power
 * @param {number} totalLoadKW - Total demand load
 */
const calculateEnergyBalance = (
  renewableKW = 0,
  generatorKW = 0,
  batteryDischargeKW = 0,
  batteryChargeKW = 0,
  totalLoadKW = 0
) => {
  const totalSupplyKW = renewableKW + generatorKW + batteryDischargeKW - batteryChargeKW;
  const netDeficitKW = Math.max(0, totalLoadKW - totalSupplyKW);
  const netSurplusKW = Math.max(0, totalSupplyKW - totalLoadKW);

  return {
    totalSupplyKW: Math.round(totalSupplyKW * 100) / 100,
    totalLoadKW: Math.round(totalLoadKW * 100) / 100,
    netBalanceKW: Math.round((totalSupplyKW - totalLoadKW) * 100) / 100,
    netDeficitKW: Math.round(netDeficitKW * 100) / 100,
    netSurplusKW: Math.round(netSurplusKW * 100) / 100,
  };
};

/**
 * Evaluates energy stress and critical load risk
 * @param {number} availableSupplyKW - Available supply (renewables + online genset capacity + available battery discharge)
 * @param {number} totalLoadKW - Current total load
 * @param {number} criticalLoadKW - Current critical load (life support, comms, medical)
 */
const evaluateSystemRisk = (availableSupplyKW, totalLoadKW, criticalLoadKW) => {
  const energyStress = availableSupplyKW < totalLoadKW;
  const criticalLoadRisk = availableSupplyKW < criticalLoadKW;

  return {
    energyStress,
    criticalLoadRisk,
    stressMarginKW: Math.round((availableSupplyKW - totalLoadKW) * 100) / 100,
    criticalMarginKW: Math.round((availableSupplyKW - criticalLoadKW) * 100) / 100,
  };
};

/**
 * Runs a deterministic rule-based polar microgrid scenario simulation.
 * Pure mathematical equations based on thermal loss, wind power curves, and PV geometry.
 * 
 * @param {Object} params
 * @param {number} params.temperature - Ambient temperature in °C (-50 to +10)
 * @param {number} params.windSpeed - Wind speed in m/s (0 to 45)
 * @param {number} params.solarAvailability - Solar availability factor (0 to 1.0)
 * @param {number} params.occupancy - Station personnel count (10 to 60)
 * @param {number} params.batterySOC - Initial battery state of charge (0 to 100%)
 * @param {number} params.renewableForecastError - Uncertainty margin (-30 to +30%)
 * @param {boolean} params.generatorFailure - Whether one primary diesel generator has faulted
 * @param {Object} stationConfig - Station baseline ratings
 */
const runRuleBasedSimulation = (params, stationConfig = {}) => {
  const {
    temperature = -18,
    windSpeed = 12,
    solarAvailability = 0.5,
    occupancy = 25,
    batterySOC = 70,
    renewableForecastError = 0,
    generatorFailure = false,
  } = params;

  // Station baseline parameters (defaults to Maitri specs)
  const baseLoadKW = stationConfig.baseLoadKW || 65;
  const installedSolarKW = stationConfig.installedSolarKW || 45;
  const installedWindKW = stationConfig.installedWindKW || 60;
  const batteryCapacityKWh = stationConfig.batteryCapacityKWh || 300;
  const totalGensetCapacityKW = stationConfig.generatorCapacityKW || 140;
  const baseCriticalLoadKW = stationConfig.criticalLoadKW || 42;

  // 1. Thermal & Occupancy Load Calculation
  // In Antarctica, heating load increases ~1.8 kW per °C below freezing (0°C)
  const thermalDelta = Math.max(0, -temperature);
  const heatingDemandKW = thermalDelta * 1.8;
  const occupancyDemandKW = (occupancy - 20) * 0.75;
  const predictedLoad = Math.max(
    30,
    Math.round((baseLoadKW + heatingDemandKW + occupancyDemandKW) * 10) / 10
  );

  // 2. Solar Generation Model (clear-sky insolation * availability)
  // Antarctic irradiance peak ~800 W/m² (0.8 kW/kWp rating)
  const solarGenRaw = installedSolarKW * Math.max(0, Math.min(1, solarAvailability)) * 0.85;

  // 3. Wind Generation Model (Standard Cubic Power Curve)
  // Cut-in: 3.5 m/s, Rated: 12 m/s, Cut-out: 25 m/s (polar storm shut-off)
  let windGenRaw = 0;
  if (windSpeed >= 3.5 && windSpeed <= 25) {
    if (windSpeed >= 12) {
      windGenRaw = installedWindKW * 0.95;
    } else {
      windGenRaw = installedWindKW * Math.pow((windSpeed - 3.5) / (12 - 3.5), 2.5);
    }
  } else if (windSpeed > 25) {
    // High wind pitch cut-out for storm protection
    windGenRaw = 0;
  }

  // Apply forecast uncertainty margin
  const uncertaintyFactor = 1 + (renewableForecastError / 100);
  const solarGeneration = Math.max(0, Math.round(solarGenRaw * uncertaintyFactor * 10) / 10);
  const windGeneration = Math.max(0, Math.round(windGenRaw * uncertaintyFactor * 10) / 10);
  const renewableGeneration = Math.round((solarGeneration + windGeneration) * 10) / 10;

  // 4. Battery Storage Dispatch
  const usableBatteryKWh = (Math.max(0, batterySOC - 20) / 100) * batteryCapacityKWh;
  const maxDischargePowerKW = stationConfig.maxDischargePower || 75;
  const netDeficitBeforeStorage = Math.max(0, predictedLoad - renewableGeneration);

  // Storage supplies what it can over the simulated 1-hour interval
  const batteryContributionKW = Math.min(netDeficitBeforeStorage, usableBatteryKWh, maxDischargePowerKW);
  const postStorageSOC = Math.max(
    20,
    Math.round((batterySOC - (batteryContributionKW / batteryCapacityKWh) * 100) * 10) / 10
  );

  // 5. Generator Dispatch Requirement
  const generatorRequirement = Math.max(
    0,
    Math.round((netDeficitBeforeStorage - batteryContributionKW) * 10) / 10
  );

  // Available generator capacity considering failure
  const availableGenCapacity = generatorFailure
    ? totalGensetCapacityKW * 0.65 // 1 generator tripped (~35% capacity lost)
    : totalGensetCapacityKW;

  // Fuel consumption: ~0.26 L/kWh for diesel genset at typical Antarctic load factors
  const fuelConsumption = Math.round(generatorRequirement * 0.26 * 10) / 10;

  // 6. Stress & Critical Risk Evaluations
  const totalAvailableSupply = renewableGeneration + batteryContributionKW + availableGenCapacity;
  const energyStress = generatorRequirement > availableGenCapacity || totalAvailableSupply < predictedLoad;
  const criticalLoadRisk = (renewableGeneration + availableGenCapacity + batteryContributionKW) < baseCriticalLoadKW;

  // 7. Deterministic Action Recommendation
  let recommendation = 'Nominal microgrid operation. Renewable generation and battery reserve meet station demand.';
  if (criticalLoadRisk) {
    recommendation = 'CRITICAL ALERT: Life-support at risk! Immediately shed non-essential laboratory and flexible heating loads. Start secondary standby gensets.';
  } else if (generatorFailure && energyStress) {
    recommendation = 'HIGH STRESS: Generator failure detected during high demand. Restrict heating to habitable modules and preserve battery reserve.';
  } else if (energyStress) {
    recommendation = 'SYSTEM STRESS: Station load exceeds dispatch capacity. Shed secondary research circuits and schedule auxiliary diesel dispatch.';
  } else if (renewableGeneration > predictedLoad) {
    recommendation = 'RENEWABLE SURPLUS: Wind and solar output exceeds station demand. Direct excess power to thermal storage and BESS charging.';
  }

  return {
    engine: 'Rule-Based Simulation',
    predictedLoad,
    renewableGeneration,
    batterySOC: postStorageSOC,
    fuelConsumption,
    generatorRequirement,
    energyStress,
    criticalLoadRisk,
    recommendation,
  };
};

module.exports = {
  calculateRenewablePenetration,
  calculateEnergyBalance,
  evaluateSystemRisk,
  runRuleBasedSimulation,
};
