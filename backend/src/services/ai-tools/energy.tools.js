/**
 * Energy & Load AI Tools for POLAR-EMS
 * 
 * Provides validated, read-only tools for electrical demand breakdowns,
 * historical load series, and critical life-support priorities.
 */

const energyService = require('../energy.service');
const criticalLoadService = require('../criticalLoad.service');
const stationService = require('../station.service');
const ApiError = require('../../utils/ApiError');

/**
 * Tool: get_current_energy
 */
async function getCurrentEnergy({ stationId }) {
  if (!stationId || typeof stationId !== 'string' || !stationId.trim()) {
    throw ApiError.badRequest('Parameter "stationId" is required.', 'MISSING_STATION_ID');
  }

  const station = await stationService.getStationById(stationId.trim());
  const energy = await energyService.getLatestEnergy(station.id);

  return {
    success: true,
    tool: 'get_current_energy',
    station: {
      id: station.id,
      code: station.code,
      name: station.name,
    },
    data: {
      totalLoadKW: energy.totalLoad,
      heatingLoadKW: energy.heatingLoad,
      waterLoadKW: energy.waterLoad,
      communicationLoadKW: energy.communicationLoad,
      laboratoryLoadKW: energy.laboratoryLoad,
      refrigerationLoadKW: energy.refrigerationLoad,
      flexibleLoadKW: energy.flexibleLoad,
    },
    provenance: 'MODELED / SCENARIO',
    timestamp: energy.timestamp.toISOString(),
    source: 'POSTGRESQL',
  };
}

/**
 * Tool: get_energy_history
 */
async function getEnergyHistory({ stationId, start, end, limit = 24 }) {
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
  const records = await energyService.getEnergyRange(station.id, {
    start: startDate,
    end: endDate,
    limit: limitNum,
  });

  return {
    success: true,
    tool: 'get_energy_history',
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
      totalLoadKW: r.totalLoad,
      heatingLoadKW: r.heatingLoad,
      waterLoadKW: r.waterLoad,
      communicationLoadKW: r.communicationLoad,
      laboratoryLoadKW: r.laboratoryLoad,
      refrigerationLoadKW: r.refrigerationLoad,
      flexibleLoadKW: r.flexibleLoad,
    })),
    provenance: 'MODELED / SCENARIO',
    source: 'POSTGRESQL',
  };
}

/**
 * Tool: get_critical_loads
 */
async function getCriticalLoads({ stationId }) {
  if (!stationId || typeof stationId !== 'string' || !stationId.trim()) {
    throw ApiError.badRequest('Parameter "stationId" is required.', 'MISSING_STATION_ID');
  }

  const station = await stationService.getStationById(stationId.trim());
  const loads = await criticalLoadService.getStationCriticalLoads(station.id);

  const totalCriticalPowerKW = loads.reduce((sum, l) => sum + (l.currentPower || l.ratedPower || 0), 0);

  return {
    success: true,
    tool: 'get_critical_loads',
    station: {
      id: station.id,
      code: station.code,
      name: station.name,
    },
    totalCriticalLoads: loads.length,
    totalCriticalPowerKW: parseFloat(totalCriticalPowerKW.toFixed(1)),
    data: loads.map((l) => ({
      id: l.id,
      name: l.name,
      category: l.category,
      priority: l.priority,
      ratedPowerKW: l.ratedPower,
      currentPowerKW: l.currentPower,
      status: l.status,
    })),
    provenance: 'ENGINEERING ASSUMPTION',
    source: 'POSTGRESQL',
  };
}

module.exports = {
  getCurrentEnergy,
  getEnergyHistory,
  getCriticalLoads,
};
