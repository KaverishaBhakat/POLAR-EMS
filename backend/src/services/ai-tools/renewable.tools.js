/**
 * Renewable Generation & Solar Resource AI Tools for POLAR-EMS
 * 
 * Provides validated, read-only tools for renewable solar/wind generation,
 * climatological solar resource archives, and modeled historical PV time-series.
 */

const renewableService = require('../renewable.service');
const solarResourceService = require('../solar-resource.service');
const solarGenHistoryService = require('../solar-generation-history.service');
const stationService = require('../station.service');
const ApiError = require('../../utils/ApiError');

/**
 * Tool: get_current_renewable
 */
async function getCurrentRenewable({ stationId }) {
  if (!stationId || typeof stationId !== 'string' || !stationId.trim()) {
    throw ApiError.badRequest('Parameter "stationId" is required.', 'MISSING_STATION_ID');
  }

  const station = await stationService.getStationById(stationId.trim());
  const renewable = await renewableService.getLatestRenewable(station.id);

  return {
    success: true,
    tool: 'get_current_renewable',
    station: {
      id: station.id,
      code: station.code,
      name: station.name,
    },
    data: {
      solarPowerKW: renewable.solarPower,
      windPowerKW: renewable.windPower,
      totalRenewableKW: renewable.totalRenewable,
    },
    provenance: 'MODELED / SCENARIO',
    timestamp: renewable.timestamp.toISOString(),
    source: 'POSTGRESQL',
  };
}

/**
 * Tool: get_renewable_history
 */
async function getRenewableHistory({ stationId, start, end, limit = 24 }) {
  if (!stationId || typeof stationId !== 'string' || !stationId.trim()) {
    throw ApiError.badRequest('Parameter "stationId" is required.', 'MISSING_STATION_ID');
  }

  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 24));
  let startDate = null;
  let endDate = null;

  if (start) {
    startDate = new Date(start);
    if (isNaN(startDate.getTime())) {
      throw ApiError.badRequest(`Invalid "start" timestamp format: ${start}`, 'INVALID_DATE');
    }
  }

  if (end) {
    endDate = new Date(end);
    if (isNaN(endDate.getTime())) {
      throw ApiError.badRequest(`Invalid "end" timestamp format: ${end}`, 'INVALID_DATE');
    }
  }

  if (startDate && endDate && endDate < startDate) {
    throw ApiError.badRequest('"end" timestamp cannot be earlier than "start" timestamp.', 'INVALID_DATE_RANGE');
  }

  const station = await stationService.getStationById(stationId.trim());
  const records = await renewableService.getRenewableRange(station.id, {
    start: startDate,
    end: endDate,
    limit: limitNum,
  });

  return {
    success: true,
    tool: 'get_renewable_history',
    station: {
      id: station.id,
      code: station.code,
      name: station.name,
    },
    count: records.length,
    range: {
      start: startDate ? startDate.toISOString() : (records[0]?.timestamp?.toISOString() || null),
      end: endDate ? endDate.toISOString() : (records[records.length - 1]?.timestamp?.toISOString() || null),
    },
    data: records.map((r) => ({
      timestamp: r.timestamp.toISOString(),
      solarPowerKW: r.solarPower,
      windPowerKW: r.windPower,
      totalRenewableKW: r.totalRenewable,
    })),
    provenance: 'MODELED / SCENARIO',
    source: 'POSTGRESQL',
  };
}

/**
 * Tool: get_solar_resource
 * Retrieves long-term global solar radiation climatology baseline (1985–2000 IMD archives).
 */
async function getSolarResource({ month, hour, year }) {
  if (month !== undefined) {
    const monthNum = parseInt(month, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw ApiError.badRequest('Month parameter must be an integer between 1 and 12.', 'INVALID_MONTH');
    }
  }

  if (hour !== undefined) {
    const hourNum = parseInt(hour, 10);
    if (isNaN(hourNum) || hourNum < 1 || hourNum > 24) {
      throw ApiError.badRequest('Hour parameter must be an integer between 1 and 24.', 'INVALID_HOUR');
    }
  }

  if (year !== undefined && month !== undefined && hour !== undefined) {
    const point = await solarResourceService.getClimatologyByPoint(parseInt(year, 10), parseInt(month, 10), parseInt(hour, 10));
    return {
      success: true,
      tool: 'get_solar_resource',
      query: { year: parseInt(year, 10), month: parseInt(month, 10), hour: parseInt(hour, 10) },
      data: point,
      provenance: 'REAL CLIMATOLOGY',
      source: 'POSTGRESQL',
    };
  }

  if (month !== undefined) {
    const profile = await solarResourceService.getMonthClimatologyProfile(parseInt(month, 10));
    return {
      success: true,
      tool: 'get_solar_resource',
      month: parseInt(month, 10),
      data: profile,
      provenance: 'REAL CLIMATOLOGY',
      source: 'POSTGRESQL',
    };
  }

  const metadata = await solarResourceService.getClimatologyMetadata();
  return {
    success: true,
    tool: 'get_solar_resource',
    data: metadata,
    provenance: 'REAL CLIMATOLOGY',
    source: 'POSTGRESQL',
  };
}

/**
 * Tool: get_historical_solar_generation
 * Retrieves modeled 8,760 hourly PV generation time-series derived from real timestamps
 * and climatological radiation priors.
 */
async function getHistoricalSolarGeneration({ stationId, start, end, limit = 24 }) {
  if (!stationId || typeof stationId !== 'string' || !stationId.trim()) {
    throw ApiError.badRequest('Parameter "stationId" is required.', 'MISSING_STATION_ID');
  }

  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 24));
  let startDate = null;
  let endDate = null;

  if (start) {
    startDate = new Date(start);
    if (isNaN(startDate.getTime())) {
      throw ApiError.badRequest(`Invalid "start" timestamp format: ${start}`, 'INVALID_DATE');
    }
  }

  if (end) {
    endDate = new Date(end);
    if (isNaN(endDate.getTime())) {
      throw ApiError.badRequest(`Invalid "end" timestamp format: ${end}`, 'INVALID_DATE');
    }
  }

  if (startDate && endDate && endDate < startDate) {
    throw ApiError.badRequest('"end" timestamp cannot be earlier than "start" timestamp.', 'INVALID_DATE_RANGE');
  }

  const station = await stationService.getStationById(stationId.trim());
  const history = await solarGenHistoryService.getHistoricalSolarSeries(station.id, {
    start: startDate ? startDate.toISOString() : undefined,
    end: endDate ? endDate.toISOString() : undefined,
    limit: limitNum,
  });

  return {
    success: true,
    tool: 'get_historical_solar_generation',
    station: {
      id: station.id,
      code: station.code,
      name: station.name,
    },
    count: history.records?.length || 0,
    totalRecordsAvailable: history.pagination?.total || 0,
    data: (history.records || []).map((r) => ({
      timestamp: r.timestamp.toISOString(),
      irradianceWm2: r.irradianceWm2,
      solarPowerKW: r.solarPowerKW,
      solarSource: r.solarSource,
      pvCapacityKw: r.pvCapacityKw,
      performanceRatio: r.performanceRatio,
    })),
    provenance: 'MODELED / SCENARIO',
    source: 'POSTGRESQL',
  };
}

module.exports = {
  getCurrentRenewable,
  getRenewableHistory,
  getSolarResource,
  getHistoricalSolarGeneration,
};
