/**
 * Generator Fleet AI Tools for POLAR-EMS
 * 
 * Provides validated, read-only tools for diesel generator operational status,
 * power output, fuel levels, efficiency, and historical generation telemetry.
 */

const generatorService = require('../generator.service');
const stationService = require('../station.service');
const { prisma } = require('../../config/database');
const ApiError = require('../../utils/ApiError');

/**
 * Tool: get_current_generators
 */
async function getCurrentGenerators({ stationId }) {
  if (!stationId || typeof stationId !== 'string' || !stationId.trim()) {
    throw ApiError.badRequest('Parameter "stationId" is required.', 'MISSING_STATION_ID');
  }

  const station = await stationService.getStationById(stationId.trim());
  const generators = await generatorService.getStationGenerators(station.id);

  const totalCapacityKW = generators.reduce((s, g) => s + g.capacity, 0);
  const totalPowerKW = generators.reduce((s, g) => s + (g.readings?.[0]?.powerOutput || 0), 0);

  return {
    success: true,
    tool: 'get_current_generators',
    station: {
      id: station.id,
      code: station.code,
      name: station.name,
    },
    totalGenerators: generators.length,
    totalCapacityKW,
    totalOutputPowerKW: parseFloat(totalPowerKW.toFixed(1)),
    data: generators.map((g) => {
      const reading = g.readings?.[0] || null;
      return {
        id: g.id,
        name: g.name,
        capacityKW: g.capacity,
        minimumOutputKW: g.minimumOutput,
        status: g.status,
        fuelLevelPercent: g.fuelLevel,
        efficiencyPercent: g.efficiency,
        totalRuntimeHours: g.totalRuntime,
        currentOutputKW: reading?.powerOutput ?? 0,
        currentFuelConsumedL: reading?.fuelConsumed ?? 0,
        timestamp: reading?.timestamp?.toISOString() || g.updatedAt.toISOString(),
      };
    }),
    provenance: 'MODELED / SCENARIO',
    source: 'POSTGRESQL',
  };
}

/**
 * Tool: get_generator_history
 */
async function getGeneratorHistory({ stationId, generatorId, start, end, limit = 24 }) {
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
  let targetGenId = generatorId;

  if (!targetGenId) {
    const gens = await generatorService.getStationGenerators(station.id);
    if (gens.length > 0) targetGenId = gens[0].id;
  }

  if (!targetGenId) {
    throw ApiError.notFound('No generators found for station.', 'GENERATOR_NOT_FOUND');
  }

  const where = { generatorId: targetGenId };
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }

  const records = await prisma.generatorReading.findMany({
    where,
    orderBy: { timestamp: 'asc' },
    take: limitNum,
  });

  return {
    success: true,
    tool: 'get_generator_history',
    station: {
      id: station.id,
      code: station.code,
      name: station.name,
    },
    generatorId: targetGenId,
    count: records.length,
    range: {
      start: startDate ? startDate.toISOString() : (records[0]?.timestamp?.toISOString() || null),
      end: endDate ? endDate.toISOString() : (records[records.length - 1]?.timestamp?.toISOString() || null),
    },
    data: records.map((r) => ({
      timestamp: r.timestamp.toISOString(),
      powerOutputKW: r.powerOutput,
      fuelConsumedL: r.fuelConsumed,
      efficiencyPercent: r.efficiency,
      runtimeMin: r.runtime,
    })),
    provenance: 'MODELED / SCENARIO',
    source: 'POSTGRESQL',
  };
}

module.exports = {
  getCurrentGenerators,
  getGeneratorHistory,
};
