/**
 * Resilience Simulation AI Tools for POLAR-EMS
 * 
 * Provides validated, read-only tools for executing registered what-if contingency scenarios
 * via the Python resilience simulation engine.
 */

const simulationService = require('../simulation.service');
const stationService = require('../station.service');
const ApiError = require('../../utils/ApiError');

const ALLOWED_SCENARIOS = new Set([
  'polar-night',
  'generator-failure',
  'low-battery',
  'renewable-drop',
  'severe-blizzard',
  'high-demand',
]);

/**
 * Tool: run_resilience_scenario
 */
async function runResilienceScenarioTool({ stationId, scenarioId, horizonHours = 24, initialSoc = 75.0 }) {
  if (!stationId || typeof stationId !== 'string' || !stationId.trim()) {
    throw ApiError.badRequest('Parameter "stationId" is required.', 'MISSING_STATION_ID');
  }

  if (!scenarioId || typeof scenarioId !== 'string' || !scenarioId.trim()) {
    throw ApiError.badRequest('Parameter "scenarioId" is required.', 'MISSING_SCENARIO_ID');
  }

  const normScenarioId = scenarioId.trim().toLowerCase().replace(/_/g, '-');
  if (!ALLOWED_SCENARIOS.has(normScenarioId)) {
    throw ApiError.badRequest(
      `Invalid scenarioId: "${scenarioId}". Allowed scenarios are: ${Array.from(ALLOWED_SCENARIOS).join(', ')}`,
      'INVALID_SCENARIO_ID'
    );
  }

  const horizon = parseInt(horizonHours, 10) || 24;
  const soc = Math.min(100, Math.max(0, parseFloat(initialSoc) || 75.0));

  const station = await stationService.getStationById(stationId.trim());
  const simResult = await simulationService.runResilienceSimulation(station.code, normScenarioId, {
    horizonHours: horizon,
    initialSoc: soc,
  });

  if (simResult.status === 'ERROR' || simResult.status === 'DEGRADED') {
    throw ApiError.badRequest(simResult.message || 'Simulation execution failed on ML service.', 'SIMULATION_FAILED');
  }

  return {
    success: true,
    tool: 'run_resilience_scenario',
    station: {
      id: station.id,
      code: station.code,
      name: station.name,
    },
    scenarioId: normScenarioId,
    scenarioName: simResult.scenarioName || normScenarioId,
    description: simResult.description || '',
    category: simResult.category || 'RESILIENCE',
    horizonHours: horizon,
    summaryMetrics: simResult.summaryMetrics || simResult.metrics || {},
    assumptions: simResult.assumptions || {},
    provenanceDetails: simResult.provenance || {},
    dispatchSchedule: simResult.dispatch || simResult.dispatchSchedule || [],
    provenance: 'MODELED / SCENARIO',
    source: 'ML_MICROSERVICE',
  };
}

module.exports = {
  ALLOWED_SCENARIOS,
  runResilienceScenarioTool,
};
