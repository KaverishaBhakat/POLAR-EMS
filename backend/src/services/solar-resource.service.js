/**
 * Solar Resource Climatology Service
 * 
 * Provides domain logic and database access for historical climatological
 * monthly/hourly solar radiation baseline datasets (e.g. 1985-2000 IMD archives).
 * 
 * Note: These values represent climatological solar resource normals / diurnal profiles,
 * NOT instantaneous real-time station weather telemetry.
 */

const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * Returns summary metadata for the solar radiation climatology dataset.
 * Aggregates statistics dynamically from the database.
 */
const getClimatologyMetadata = async () => {
  const totalRecords = await prisma.solarRadiationClimatology.count();
  const numericRecords = await prisma.solarRadiationClimatology.count({
    where: { radiationValue: { not: null } },
  });
  const missingRecords = await prisma.solarRadiationClimatology.count({
    where: { radiationValue: null },
  });

  const aggregates = await prisma.solarRadiationClimatology.aggregate({
    _min: { year: true },
    _max: { year: true, source: true },
  });

  return {
    datasetType: 'monthly_hourly_climatology',
    description: 'Historical monthly mean diurnal global solar radiation climatology for Maitri/Dakshin Gangotri Station, Antarctica',
    startYear: aggregates._min.year ?? 1985,
    endYear: aggregates._max.year ?? 2000,
    totalRecords,
    numericRecords,
    missingRecords,
    hoursPerDay: 24,
    source: aggregates._max.source ?? 'radiation(2).txt',
  };
};

/**
 * Retrieves a single climatology observation by year, month, and hour.
 * 
 * @param {number} year - Calendar year (e.g. 1995)
 * @param {number} month - Calendar month (1-12)
 * @param {number} hour - Diurnal hour (1-24)
 */
const getClimatologyByPoint = async (year, month, hour) => {
  const record = await prisma.solarRadiationClimatology.findUnique({
    where: {
      year_month_hour: {
        year,
        month,
        hour,
      },
    },
    select: {
      year: true,
      month: true,
      hour: true,
      radiationValue: true,
      irradianceWm2: true,
      source: true,
    },
  });

  if (!record) {
    throw ApiError.notFound(
      `Climatological solar resource record not found for year=${year}, month=${month}, hour=${hour}`
    );
  }

  return record;
};

/**
 * Retrieves historical climatological values across multiple years for a specific month and/or hour.
 * 
 * @param {Object} query
 * @param {number} [query.month] - Month filter (1-12)
 * @param {number} [query.hour] - Hour filter (1-24)
 */
const getClimatologyProfile = async ({ month, hour }) => {
  const where = {};
  if (month !== undefined) where.month = month;
  if (hour !== undefined) where.hour = hour;

  const records = await prisma.solarRadiationClimatology.findMany({
    where,
    orderBy: [{ year: 'asc' }, { month: 'asc' }, { hour: 'asc' }],
    select: {
      year: true,
      month: true,
      hour: true,
      radiationValue: true,
      irradianceWm2: true,
      source: true,
    },
  });

  return records;
};

/**
 * Retrieves the 24-hour diurnal climatological profile for a given calendar month.
 * Computes multi-year hourly averages, ranges, and includes all 24 diurnal hours.
 * 
 * @param {number} month - Calendar month (1-12)
 */
const getMonthClimatologyProfile = async (month) => {
  const records = await prisma.solarRadiationClimatology.findMany({
    where: { month },
    orderBy: [{ hour: 'asc' }, { year: 'asc' }],
    select: {
      year: true,
      month: true,
      hour: true,
      radiationValue: true,
      irradianceWm2: true,
    },
  });

  if (!records || records.length === 0) {
    throw ApiError.notFound(`No climatological solar resource data available for month=${month}`);
  }

  // Aggregate by hour (1 to 24) across all available years
  const hourMap = new Map();
  for (let h = 1; h <= 24; h++) {
    hourMap.set(h, {
      hour: h,
      month,
      observationsCount: 0,
      validObservationsCount: 0,
      missingObservationsCount: 0,
      averageRadiationValue: null,
      averageIrradianceWm2: null,
      minIrradianceWm2: null,
      maxIrradianceWm2: null,
      yearlyValues: [],
    });
  }

  for (const r of records) {
    const entry = hourMap.get(r.hour);
    if (!entry) continue;

    entry.observationsCount++;
    if (r.radiationValue !== null && r.radiationValue !== undefined) {
      entry.validObservationsCount++;
      entry.yearlyValues.push({
        year: r.year,
        radiationValue: r.radiationValue,
        irradianceWm2: r.irradianceWm2,
      });
    } else {
      entry.missingObservationsCount++;
    }
  }

  // Calculate averages and bounds for each hour
  const profile24Hours = [];
  for (let h = 1; h <= 24; h++) {
    const entry = hourMap.get(h);
    if (entry.validObservationsCount > 0) {
      const sumRad = entry.yearlyValues.reduce((acc, curr) => acc + curr.radiationValue, 0);
      const sumIrr = entry.yearlyValues.reduce((acc, curr) => acc + curr.irradianceWm2, 0);
      const irrValues = entry.yearlyValues.map((v) => v.irradianceWm2);

      entry.averageRadiationValue = parseFloat((sumRad / entry.validObservationsCount).toFixed(4));
      entry.averageIrradianceWm2 = parseFloat((sumIrr / entry.validObservationsCount).toFixed(2));
      entry.minIrradianceWm2 = parseFloat(Math.min(...irrValues).toFixed(2));
      entry.maxIrradianceWm2 = parseFloat(Math.max(...irrValues).toFixed(2));
    }

    profile24Hours.push({
      hour: entry.hour,
      month: entry.month,
      averageRadiationValue: entry.averageRadiationValue,
      averageIrradianceWm2: entry.averageIrradianceWm2,
      minIrradianceWm2: entry.minIrradianceWm2,
      maxIrradianceWm2: entry.maxIrradianceWm2,
      validObservations: entry.validObservationsCount,
      missingObservations: entry.missingObservationsCount,
      totalObservations: entry.observationsCount,
    });
  }

  return profile24Hours;
};

/**
 * Retrieves all monthly/hourly climatology records for a specific year.
 * Sorted by month ASC, hour ASC.
 * 
 * @param {number} year - Calendar year (e.g. 1995)
 */
const getYearClimatology = async (year) => {
  const records = await prisma.solarRadiationClimatology.findMany({
    where: { year },
    orderBy: [{ month: 'asc' }, { hour: 'asc' }],
    select: {
      year: true,
      month: true,
      hour: true,
      radiationValue: true,
      irradianceWm2: true,
      source: true,
    },
  });

  if (!records || records.length === 0) {
    throw ApiError.notFound(`No climatological solar resource data available for year=${year}`);
  }

  return records;
};

module.exports = {
  getClimatologyMetadata,
  getClimatologyByPoint,
  getClimatologyProfile,
  getMonthClimatologyProfile,
  getYearClimatology,
};
