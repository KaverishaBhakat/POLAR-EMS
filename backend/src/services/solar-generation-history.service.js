/**
 * Historical Solar Generation Time Series Service
 * 
 * Generates and serves modeled historical photovoltaic power generation time series
 * derived from real meteorological observation timestamps mapped against the
 * 1985–2000 monthly-hourly solar radiation climatological prior.
 * 
 * SCIENTIFIC GOVERNANCE:
 * - Real timestamps from physical AWS observation streams (e.g. 2019 Maitri AWS).
 * - Climatology provides the month/hour radiation prior (not daily measurements).
 * - Strictly segregated in `solar_generation_history` (never written to `renewable_generation`).
 * - Polar night and missing climatology observations remain NULL (never converted to fake 0).
 * - Solar source provenance is always explicitly flagged as "CLIMATOLOGICAL_ESTIMATE" or "UNAVAILABLE".
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { prisma } = require('../config/database');
const { estimateSolarIrradiance } = require('./solar-resource-estimation.service');
const { resolveStationPvConfig } = require('./pv-generation.service');
const ApiError = require('../utils/ApiError');

const MODEL_VERSION = 'IEC-61724-1-CLIMATOLOGY-V1';
const GSTC_WM2 = 1000.0;

/**
 * Resolves the path to the 2019 Maitri AWS hourly dataset.
 */
function resolveMaitri2019DatasetPath() {
  const candidates = [
    path.resolve(__dirname, '../../../ml-service/datasets/processed/weather/maitri_2019_hourly.csv'),
    path.resolve(process.cwd(), '../ml-service/datasets/processed/weather/maitri_2019_hourly.csv'),
    path.resolve(process.cwd(), 'datasets/processed/weather/maitri_2019_hourly.csv'),
    path.resolve(__dirname, '../../data/maitri_2019_hourly.csv'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

/**
 * Generates and stores historical modeled PV generation records for a station.
 * 
 * @param {Object} options
 * @param {string} options.stationId - Station UUID
 * @param {string} [options.datasetPath] - Optional custom path to timestamped CSV
 * @param {boolean} [options.dryRun=false] - If true, calculate without writing to DB
 * @returns {Promise<Object>} Generation execution summary
 */
async function generateHistoricalSolarSeries({ stationId, datasetPath, dryRun = false }) {
  const { station, capacityKw, performanceRatio, isConfiguredInDb } =
    await resolveStationPvConfig(stationId);

  let timestamps = [];
  let sourceDatasetName = 'Database WeatherData Records';

  const csvPath = datasetPath || resolveMaitri2019DatasetPath();

  if (csvPath && fs.existsSync(csvPath)) {
    sourceDatasetName = path.basename(csvPath);
    const fileStream = fs.createReadStream(csvPath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let isHeader = true;
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (isHeader) {
        isHeader = false;
        continue;
      }
      const parts = trimmed.split(',');
      const tsStr = parts[0]?.trim();
      if (tsStr) {
        // e.g. "2019-01-01 00:00:00" -> ISO format
        const isoStr = tsStr.includes('T') ? tsStr : `${tsStr.replace(' ', 'T')}Z`;
        const dateObj = new Date(isoStr);
        if (!isNaN(dateObj.getTime())) {
          timestamps.push(dateObj);
        }
      }
    }
  } else {
    // Fallback to existing timestamped WeatherData records in DB
    const weatherRecords = await prisma.weatherData.findMany({
      where: { stationId: station.id },
      select: { timestamp: true },
      orderBy: { timestamp: 'asc' },
    });
    timestamps = weatherRecords.map((w) => w.timestamp);
  }

  if (timestamps.length === 0) {
    throw ApiError.badRequest(
      `No real meteorological observation timestamps found for station ${station.code}.`,
      'NO_TIMESTAMPS_FOUND'
    );
  }

  // 1. Fetch all climatological records in 1 query and index by month_hour
  const allClimatology = await prisma.solarRadiationClimatology.findMany({
    select: {
      month: true,
      hour: true,
      radiationValue: true,
      irradianceWm2: true,
      year: true,
    },
  });

  const climatologyMap = new Map();
  for (const r of allClimatology) {
    const key = `${r.month}_${r.hour}`;
    if (!climatologyMap.has(key)) {
      climatologyMap.set(key, []);
    }
    climatologyMap.get(key).push(r);
  }

  // Pre-calculate aggregate normal for each (month, hour)
  const normalMap = new Map();
  for (let m = 1; m <= 12; m++) {
    for (let h = 1; h <= 24; h++) {
      const key = `${m}_${h}`;
      const recs = climatologyMap.get(key) || [];
      const valid = recs.filter((r) => r.radiationValue !== null && r.irradianceWm2 !== null);
      if (valid.length > 0) {
        const avgIrr = valid.reduce((acc, r) => acc + r.irradianceWm2, 0) / valid.length;
        normalMap.set(key, {
          available: true,
          irradianceWm2: parseFloat(avgIrr.toFixed(2)),
        });
      } else {
        normalMap.set(key, {
          available: false,
          irradianceWm2: null,
        });
      }
    }
  }

  let availableCount = 0;
  let unavailableCount = 0;
  const recordsToInsert = [];

  for (const ts of timestamps) {
    const month = ts.getUTCMonth() + 1; // 1-12
    let hour = ts.getUTCHours();
    if (hour === 0) hour = 24; // Diurnal period convention

    const normal = normalMap.get(`${month}_${hour}`);

    let irradianceWm2 = null;
    let solarPowerKW = null;
    let solarSource = 'UNAVAILABLE';

    if (normal && normal.available && normal.irradianceWm2 !== null) {
      irradianceWm2 = normal.irradianceWm2;
      const rawPower = (irradianceWm2 * capacityKw * performanceRatio) / GSTC_WM2;
      solarPowerKW = parseFloat(Math.max(0, rawPower).toFixed(2));
      solarSource = 'CLIMATOLOGICAL_ESTIMATE';
      availableCount++;
    } else {
      unavailableCount++;
    }

    recordsToInsert.push({
      stationId: station.id,
      timestamp: ts,
      irradianceWm2,
      solarPowerKW,
      solarSource,
      modelVersion: MODEL_VERSION,
      pvCapacityKw: capacityKw,
      performanceRatio,
      sourceRadiationYear: null, // Multi-year climatological normal
      sourceRadiationMonth: month,
      sourceRadiationHour: hour,
    });
  }

  let insertedCount = 0;

  if (!dryRun) {
    // Delete existing records for this station within this date range to ensure full idempotency
    const minTimestamp = timestamps[0];
    const maxTimestamp = timestamps[timestamps.length - 1];

    await prisma.solarGenerationHistory.deleteMany({
      where: {
        stationId: station.id,
        timestamp: {
          gte: minTimestamp,
          lte: maxTimestamp,
        },
      },
    });

    // Bulk insert in chunks of 2,000
    const CHUNK_SIZE = 2000;
    for (let i = 0; i < recordsToInsert.length; i += CHUNK_SIZE) {
      const chunk = recordsToInsert.slice(i, i + CHUNK_SIZE);
      const res = await prisma.solarGenerationHistory.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      insertedCount += res.count;
    }
  }

  const startDate = timestamps[0];
  const endDate = timestamps[timestamps.length - 1];

  return {
    stationId: station.id,
    stationCode: station.code,
    stationName: station.name,
    sourceDataset: sourceDatasetName,
    timestampsProcessed: timestamps.length,
    availablePoints: availableCount,
    unavailablePoints: unavailableCount,
    insertedOrUpdated: dryRun ? 0 : insertedCount,
    pvCapacityKw: capacityKw,
    performanceRatio,
    isPvConfiguredInDb: isConfiguredInDb,
    dateRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    modelVersion: MODEL_VERSION,
    provenance: 'CLIMATOLOGICAL_ESTIMATE',
    dryRun,
  };
}

/**
 * Retrieves paginated historical modeled solar generation records.
 */
async function getHistoricalSolarSeries(stationId, { start, end, limit = 100, page = 1 }) {
  const station = await prisma.station.findUnique({
    where: { id: stationId },
  });

  if (!station) {
    throw ApiError.notFound(`Station with ID '${stationId}' not found`, 'STATION_NOT_FOUND');
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
  const skip = (pageNum - 1) * limitNum;

  const where = { stationId: station.id };
  if (start || end) {
    where.timestamp = {};
    if (start) {
      const startDate = new Date(start);
      if (!isNaN(startDate.getTime())) where.timestamp.gte = startDate;
    }
    if (end) {
      const endDate = new Date(end);
      if (!isNaN(endDate.getTime())) where.timestamp.lte = endDate;
    }
  }

  const [total, records] = await Promise.all([
    prisma.solarGenerationHistory.count({ where }),
    prisma.solarGenerationHistory.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      skip,
      take: limitNum,
    }),
  ]);

  return {
    station: {
      id: station.id,
      code: station.code,
      name: station.name,
    },
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
    records,
  };
}

/**
 * Retrieves summary statistics for the historical modeled solar series.
 */
async function getHistoricalSolarSummary(stationId, { start, end }) {
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    include: { pvConfig: true },
  });

  if (!station) {
    throw ApiError.notFound(`Station with ID '${stationId}' not found`, 'STATION_NOT_FOUND');
  }

  const where = { stationId: station.id };
  if (start || end) {
    where.timestamp = {};
    if (start) {
      const startDate = new Date(start);
      if (!isNaN(startDate.getTime())) where.timestamp.gte = startDate;
    }
    if (end) {
      const endDate = new Date(end);
      if (!isNaN(endDate.getTime())) where.timestamp.lte = endDate;
    }
  }

  const totalPoints = await prisma.solarGenerationHistory.count({ where });

  if (totalPoints === 0) {
    return {
      station: {
        id: station.id,
        code: station.code,
        name: station.name,
      },
      hasData: false,
      totalPoints: 0,
      availablePoints: 0,
      unavailablePoints: 0,
      start: null,
      end: null,
      minSolarPowerKW: null,
      maxSolarPowerKW: null,
      avgSolarPowerKW: null,
      source: 'SolarRadiationClimatology 1985–2000',
      provenance: 'CLIMATOLOGICAL_ESTIMATE',
    };
  }

  const [earliest, latest, availablePoints, aggregates] = await Promise.all([
    prisma.solarGenerationHistory.findFirst({
      where,
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true },
    }),
    prisma.solarGenerationHistory.findFirst({
      where,
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    }),
    prisma.solarGenerationHistory.count({
      where: {
        ...where,
        solarPowerKW: { not: null },
      },
    }),
    prisma.solarGenerationHistory.aggregate({
      where: {
        ...where,
        solarPowerKW: { not: null },
      },
      _min: { solarPowerKW: true, irradianceWm2: true },
      _max: { solarPowerKW: true, irradianceWm2: true },
      _avg: { solarPowerKW: true, irradianceWm2: true },
    }),
  ]);

  const unavailablePoints = totalPoints - availablePoints;

  return {
    station: {
      id: station.id,
      code: station.code,
      name: station.name,
    },
    hasData: true,
    totalPoints,
    availablePoints,
    unavailablePoints,
    start: earliest?.timestamp?.toISOString() || null,
    end: latest?.timestamp?.toISOString() || null,
    minSolarPowerKW: aggregates._min.solarPowerKW ?? null,
    maxSolarPowerKW: aggregates._max.solarPowerKW ?? null,
    avgSolarPowerKW: aggregates._avg.solarPowerKW ? parseFloat(aggregates._avg.solarPowerKW.toFixed(2)) : null,
    minIrradianceWm2: aggregates._min.irradianceWm2 ?? null,
    maxIrradianceWm2: aggregates._max.irradianceWm2 ?? null,
    avgIrradianceWm2: aggregates._avg.irradianceWm2 ? parseFloat(aggregates._avg.irradianceWm2.toFixed(2)) : null,
    source: 'SolarRadiationClimatology 1985–2000 (Monthly-Hourly Climatology)',
    provenance: 'CLIMATOLOGICAL_ESTIMATE',
    pvCapacityKw: station.pvConfig?.capacityKw || 50.0,
    performanceRatio: station.pvConfig?.performanceRatio || 0.80,
  };
}

module.exports = {
  generateHistoricalSolarSeries,
  getHistoricalSolarSeries,
  getHistoricalSolarSummary,
  resolveMaitri2019DatasetPath,
};
