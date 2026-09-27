/**
 * Telemetry & Alerts AI Tools for POLAR-EMS
 * 
 * Provides validated, read-only tools for active station operational alerts,
 * severity thresholds, and system alarms.
 */

const alertService = require('../alert.service');
const stationService = require('../station.service');
const ApiError = require('../../utils/ApiError');

/**
 * Tool: get_current_alerts
 */
async function getCurrentAlerts({ stationId, severity, status = 'ACTIVE' }) {
  let station = null;
  if (stationId && stationId.toUpperCase() !== 'ALL') {
    station = await stationService.getStationById(stationId.trim());
  }

  const alerts = await alertService.getActiveStationAlerts(station ? station.id : 'ALL');

  let filtered = alerts;
  if (severity && severity.toUpperCase() !== 'ALL') {
    filtered = filtered.filter((a) => a.severity.toUpperCase() === severity.toUpperCase());
  }

  return {
    success: true,
    tool: 'get_current_alerts',
    station: station ? {
      id: station.id,
      code: station.code,
      name: station.name,
    } : { id: 'ALL', code: 'ALL', name: 'All Stations' },
    activeAlertsCount: filtered.length,
    data: filtered.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      type: a.type,
      severity: a.severity,
      status: a.status,
      source: a.source,
      timestamp: a.createdAt.toISOString(),
      stationCode: a.station?.code || station?.code || 'UNKNOWN',
    })),
    provenance: 'REAL / MEASURED',
    source: 'POSTGRESQL',
  };
}

module.exports = {
  getCurrentAlerts,
};
