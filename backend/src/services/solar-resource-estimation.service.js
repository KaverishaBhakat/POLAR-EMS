/**
 * Solar Resource Estimation Service
 * 
 * Estimates expected solar irradiance (W/m²) for a given timestamp by extracting
 * historical monthly/hourly climatology profiles (month + hour) from SolarRadiationClimatology.
 * 
 * IMPORTANT ARCHITECTURE:
 * - Climatology contains NO day-level observations.
 * - Month and hour are extracted from the target timestamp.
 * - When a specific historical year is requested, the exact (year, month, hour) record is used.
 * - When no year is specified, the multi-year climatological normal for (month, hour) is used.
 * - Missing/NULL observations return available=false (never fabricate 0).
 */

const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * Estimates solar irradiance for a given month and hour.
 * 
 * @param {Object} params
 * @param {number} params.month - Calendar month (1-12)
 * @param {number} params.hour - Diurnal hour (1-24)
 * @param {number} [params.year] - Optional specific historical climatology year (1985-2000)
 * @returns {Promise<Object>} Estimation result
 */
const estimateSolarIrradiance = async ({ month, hour, year }) => {
  if (isNaN(month) || month < 1 || month > 12) {
    throw ApiError.badRequest('Month must be an integer between 1 and 12', 'INVALID_MONTH');
  }
  if (isNaN(hour) || hour < 1 || hour > 24) {
    throw ApiError.badRequest('Hour must be an integer between 1 and 24', 'INVALID_HOUR');
  }

  // 1. If a specific historical year is requested (e.g., 1995)
  if (year !== undefined && !isNaN(year)) {
    const record = await prisma.solarRadiationClimatology.findUnique({
      where: {
        year_month_hour: {
          year,
          month,
          hour,
        },
      },
    });

    if (!record) {
      return {
        available: false,
        reason: `NO_HISTORICAL_RECORD_FOR_YEAR_${year}`,
        month,
        hour,
        year,
        radiationValue: null,
        irradianceWm2: null,
        source: 'solar_climatology',
        resourceType: 'climatological_historical_point',
      };
    }

    if (record.radiationValue === null || record.irradianceWm2 === null) {
      const isPolarNight = month === 6 || (month === 7 && hour < 9);
      return {
        available: false,
        reason: isPolarNight
          ? 'POLAR_NIGHT_HORIZON_OBSCURATION'
          : 'SOLAR_RESOURCE_UNAVAILABLE',
        month,
        hour,
        year,
        radiationValue: null,
        irradianceWm2: null,
        source: record.source,
        resourceType: 'climatological_historical_point',
      };
    }

    return {
      available: true,
      month,
      hour,
      year,
      radiationValue: record.radiationValue,
      irradianceWm2: record.irradianceWm2,
      source: record.source,
      resourceType: 'climatological_historical_point',
    };
  }

  // 2. Default Climatological Normal: Multi-year aggregate for (month, hour)
  const records = await prisma.solarRadiationClimatology.findMany({
    where: {
      month,
      hour,
    },
    select: {
      radiationValue: true,
      irradianceWm2: true,
      year: true,
    },
  });

  if (!records || records.length === 0) {
    return {
      available: false,
      reason: 'SOLAR_RESOURCE_UNAVAILABLE',
      month,
      hour,
      radiationValue: null,
      irradianceWm2: null,
      source: 'solar_climatology',
      resourceType: 'climatological_estimate',
    };
  }

  const validRecords = records.filter(
    (r) => r.radiationValue !== null && r.irradianceWm2 !== null
  );

  if (validRecords.length === 0) {
    const isPolarNight = month === 6;
    return {
      available: false,
      reason: isPolarNight
        ? 'POLAR_NIGHT_HORIZON_OBSCURATION'
        : 'SOLAR_RESOURCE_UNAVAILABLE',
      month,
      hour,
      radiationValue: null,
      irradianceWm2: null,
      observationsCount: records.length,
      validObservationsCount: 0,
      source: 'solar_climatology',
      resourceType: 'climatological_estimate',
    };
  }

  const sumRadiation = validRecords.reduce((acc, r) => acc + r.radiationValue, 0);
  const sumIrradiance = validRecords.reduce((acc, r) => acc + r.irradianceWm2, 0);
  const avgRadiation = sumRadiation / validRecords.length;
  const avgIrradiance = sumIrradiance / validRecords.length;

  return {
    available: true,
    month,
    hour,
    radiationValue: parseFloat(avgRadiation.toFixed(4)),
    irradianceWm2: parseFloat(avgIrradiance.toFixed(2)),
    validObservationsCount: validRecords.length,
    totalObservationsCount: records.length,
    source: 'solar_climatology',
    resourceType: 'climatological_estimate',
  };
};

module.exports = {
  estimateSolarIrradiance,
};
