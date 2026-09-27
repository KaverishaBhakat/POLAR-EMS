/**
 * Optimization AI Tools for POLAR-EMS
 * 
 * Provides validated, read-only tools for 24-hour Google OR-Tools MILP unit commitment
 * and economic dispatch schedules.
 */

const optimizationService = require('../optimization.service');
const stationService = require('../station.service');
const ApiError = require('../../utils/ApiError');

/**
 * Tool: get_optimization_dispatch
 */
async function getOptimizationDispatch({ stationId, horizonHours = 24 }) {
  if (!stationId || typeof stationId !== 'string' || !stationId.trim()) {
    throw ApiError.badRequest('Parameter "stationId" is required.', 'MISSING_STATION_ID');
  }

  const horizon = parseInt(horizonHours, 10) || 24;
  if (horizon !== 24) {
    throw ApiError.badRequest('Parameter "horizonHours" must be 24.', 'INVALID_HORIZON');
  }

  const station = await stationService.getStationById(stationId.trim());
  const optResult = await optimizationService.getOptimalDispatch(station.code, horizon);

  if (optResult.status !== 'SUCCESS') {
    throw ApiError.badRequest(optResult.message || 'Optimization solver dispatch unavailable.', 'OPTIMIZATION_UNAVAILABLE');
  }

  return {
    success: true,
    tool: 'get_optimization_dispatch',
    station: {
      id: station.id,
      code: station.code,
      name: station.name,
    },
    horizonHours: horizon,
    solverEngine: optResult.solverEngine || 'Google OR-Tools (MILP/SCIP)',
    solverStatus: optResult.metrics?.solverStatus || 'OPTIMAL',
    objectiveValue: optResult.objectiveValue,
    metrics: optResult.metrics,
    scenarioMetadata: optResult.scenarioMetadata,
    dispatchSchedule: optResult.dispatchSchedule || [],
    recommendation: optResult.recommendation,
    provenance: 'OPTIMIZATION',
    source: 'ML_MICROSERVICE',
  };
}

module.exports = {
  getOptimizationDispatch,
};
