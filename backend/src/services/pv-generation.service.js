/**
 * Photovoltaic (PV) Generation Modeling Service
 * 
 * Computes photovoltaic power generation estimates from solar resource irradiance
 * using the standard IEC/WMO photovoltaic yield formula:
 * 
 * P = G * Pmax * PR / G_STC
 * 
 * Where:
 * - G: Solar irradiance in W/m²
 * - Pmax: Installed DC PV array capacity in kW (capacityKw)
 * - PR: System Performance Ratio (accounting for inverter, thermal, wiring, snow/albedo losses)
 * - G_STC: Standard Test Conditions reference irradiance (1000 W/m²)
 * 
 * pvPowerKw = (irradianceWm2 * capacityKw * performanceRatio) / 1000
 */

const { prisma } = require('../config/database');
const { estimateSolarIrradiance } = require('./solar-resource-estimation.service');
const ApiError = require('../utils/ApiError');

// Standard fallback parameters when station has not configured custom hardware
const DEFAULT_PV_CAPACITY_KW = 50.0;
const DEFAULT_PERFORMANCE_RATIO = 0.80;
const GSTC_WM2 = 1000.0;

/**
 * Resolves PV system hardware capacity and performance ratio for a given station.
 */
const resolveStationPvConfig = async (stationId, overrideCapacity, overridePr) => {
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    include: { pvConfig: true },
  });

  if (!station) {
    throw ApiError.notFound(`Station with ID '${stationId}' not found`, 'STATION_NOT_FOUND');
  }

  let capacityKw = DEFAULT_PV_CAPACITY_KW;
  let performanceRatio = DEFAULT_PERFORMANCE_RATIO;
  let isConfiguredInDb = false;

  if (station.pvConfig) {
    capacityKw = station.pvConfig.capacityKw;
    performanceRatio = station.pvConfig.performanceRatio;
    isConfiguredInDb = true;
  }

  // Allow explicit query parameter overrides
  if (overrideCapacity !== undefined && !isNaN(overrideCapacity) && overrideCapacity > 0) {
    capacityKw = parseFloat(overrideCapacity);
  }
  if (overridePr !== undefined && !isNaN(overridePr) && overridePr > 0 && overridePr <= 1.0) {
    performanceRatio = parseFloat(overridePr);
  }

  return {
    station,
    capacityKw,
    performanceRatio,
    isConfiguredInDb,
  };
};

/**
 * Calculates PV power generation for a specific timestamp based on climatological solar resource.
 * 
 * @param {Object} params
 * @param {string} params.stationId - Station UUID
 * @param {string|Date} params.timestamp - Target date/time
 * @param {number} [params.year] - Optional specific climatology year (1985-2000)
 * @param {number} [params.capacityKw] - Optional capacity override
 * @param {number} [params.performanceRatio] - Optional PR override
 */
const estimatePvGeneration = async ({
  stationId,
  timestamp,
  year: requestedYear,
  capacityKw: overrideCap,
  performanceRatio: overridePr,
}) => {
  if (!stationId) {
    throw ApiError.badRequest('Query parameter "stationId" is required', 'MISSING_STATION_ID');
  }
  if (!timestamp) {
    throw ApiError.badRequest('Query parameter "timestamp" is required', 'MISSING_TIMESTAMP');
  }

  const dateObj = new Date(timestamp);
  if (isNaN(dateObj.getTime())) {
    throw ApiError.badRequest(`Invalid timestamp format: "${timestamp}". Use ISO 8601 string (e.g. 1995-12-15T13:00:00Z)`, 'INVALID_TIMESTAMP');
  }

  const month = dateObj.getUTCMonth() + 1; // 1-12
  let hour = dateObj.getUTCHours();
  if (hour === 0) hour = 24; // Map UTC 00:00 to 24:00 diurnal period if appropriate

  // If a specific year is explicitly passed or timestamp year is within 1985-2000
  let climatologyYear = requestedYear;
  if (!climatologyYear && dateObj.getUTCFullYear() >= 1985 && dateObj.getUTCFullYear() <= 2000) {
    climatologyYear = dateObj.getUTCFullYear();
  }

  const { station, capacityKw, performanceRatio, isConfiguredInDb } =
    await resolveStationPvConfig(stationId, overrideCap, overridePr);

  const solarResource = await estimateSolarIrradiance({
    month,
    hour,
    year: climatologyYear,
  });

  if (!solarResource.available || solarResource.irradianceWm2 === null) {
    return {
      stationId: station.id,
      stationCode: station.code,
      stationName: station.name,
      timestamp: dateObj.toISOString(),
      month,
      hour,
      year: climatologyYear ?? null,
      source: 'solar_climatology',
      resourceType: solarResource.resourceType,
      available: false,
      reason: solarResource.reason || 'SOLAR_RESOURCE_UNAVAILABLE',
      irradianceWm2: null,
      pvCapacityKw: capacityKw,
      performanceRatio,
      isConfiguredInDb,
      estimatedPvPowerKw: null,
    };
  }

  // Standard PV calculation: P = G * Pmax * PR / 1000
  const rawPvPowerKw = (solarResource.irradianceWm2 * capacityKw * performanceRatio) / GSTC_WM2;
  const estimatedPvPowerKw = parseFloat(Math.max(0, rawPvPowerKw).toFixed(2));

  return {
    stationId: station.id,
    stationCode: station.code,
    stationName: station.name,
    timestamp: dateObj.toISOString(),
    month,
    hour,
    year: climatologyYear ?? null,
    source: 'solar_climatology',
    resourceType: solarResource.resourceType,
    available: true,
    irradianceWm2: solarResource.irradianceWm2,
    pvCapacityKw: capacityKw,
    performanceRatio,
    isConfiguredInDb,
    estimatedPvPowerKw,
  };
};

/**
 * Calculates 24-hour diurnal PV generation profile for a given calendar month.
 * 
 * @param {Object} params
 * @param {string} params.stationId - Station UUID
 * @param {number} params.month - Calendar month (1-12)
 * @param {number} [params.year] - Optional specific climatology year
 * @param {number} [params.capacityKw] - Optional capacity override
 * @param {number} [params.performanceRatio] - Optional PR override
 */
const getMonthlyPvProfile = async ({
  stationId,
  month,
  year: requestedYear,
  capacityKw: overrideCap,
  performanceRatio: overridePr,
}) => {
  if (!stationId) {
    throw ApiError.badRequest('Query parameter "stationId" is required', 'MISSING_STATION_ID');
  }
  const monthNum = parseInt(month, 10);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    throw ApiError.badRequest('Month parameter must be an integer between 1 and 12', 'INVALID_MONTH');
  }

  const { station, capacityKw, performanceRatio, isConfiguredInDb } =
    await resolveStationPvConfig(stationId, overrideCap, overridePr);

  const whereClause = { month: monthNum };
  if (requestedYear !== undefined && !isNaN(requestedYear)) {
    whereClause.year = requestedYear;
  }

  const records = await prisma.solarRadiationClimatology.findMany({
    where: whereClause,
    orderBy: [{ hour: 'asc' }, { year: 'asc' }],
    select: {
      year: true,
      hour: true,
      radiationValue: true,
      irradianceWm2: true,
      source: true,
    },
  });

  // Group records by hour (1 to 24)
  const hourMap = new Map();
  for (let h = 1; h <= 24; h++) {
    hourMap.set(h, []);
  }
  for (const r of records) {
    if (hourMap.has(r.hour)) {
      hourMap.get(r.hour).push(r);
    }
  }

  const hourlyPoints = [];
  for (let h = 1; h <= 24; h++) {
    const list = hourMap.get(h) || [];
    const validList = list.filter((r) => r.radiationValue !== null && r.irradianceWm2 !== null);

    let irradianceWm2 = null;
    let estimatedPvPowerKw = null;
    let available = false;
    let reason = undefined;

    if (validList.length > 0) {
      available = true;
      const avgIrr = validList.reduce((acc, r) => acc + r.irradianceWm2, 0) / validList.length;
      irradianceWm2 = parseFloat(avgIrr.toFixed(2));
      const rawPower = (irradianceWm2 * capacityKw * performanceRatio) / GSTC_WM2;
      estimatedPvPowerKw = parseFloat(Math.max(0, rawPower).toFixed(2));
    } else {
      const isPolarNight = monthNum === 6 || (monthNum === 7 && h < 9);
      reason = isPolarNight ? 'POLAR_NIGHT_HORIZON_OBSCURATION' : 'SOLAR_RESOURCE_UNAVAILABLE';
    }

    hourlyPoints.push({
      hour: h,
      irradianceWm2,
      estimatedPvPowerKw,
      available,
      reason,
    });
  }

  return {
    stationId: station.id,
    stationCode: station.code,
    stationName: station.name,
    month: monthNum,
    year: requestedYear ?? null,
    pvCapacityKw: capacityKw,
    performanceRatio,
    isConfiguredInDb,
    profile: hourlyPoints,
  };
};

module.exports = {
  estimatePvGeneration,
  getMonthlyPvProfile,
  resolveStationPvConfig,
};
