/**
 * Analytics AI Tools for POLAR-EMS
 * 
 * Provides validated, read-only tools for historical operational performance,
 * fuel savings KPIs, renewable penetration, and energy balance metrics.
 */

const analyticsService = require('../analytics.service');
const stationService = require('../station.service');
const ApiError = require('../../utils/ApiError');

/**
 * Tool: get_energy_analytics
 */
async function getEnergyAnalytics({ stationId, start, end, range = '7d' }) {
  if (!stationId || typeof stationId !== 'string' || !stationId.trim()) {
    throw ApiError.badRequest('Parameter "stationId" is required.', 'MISSING_STATION_ID');
  }

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
  const analytics = await analyticsService.getHistoricalAnalytics(station.id, {
    start: startDate ? startDate.toISOString() : undefined,
    end: endDate ? endDate.toISOString() : undefined,
    range,
  });

  return {
    success: true,
    tool: 'get_energy_analytics',
    station: analytics.station,
    range: {
      start: analytics.range.start.toISOString(),
      end: analytics.range.end.toISOString(),
    },
    hasData: analytics.hasData,
    summary: analytics.summary,
    dailyBreakdown: analytics.dailyChartData || [],
    provenance: ['REAL / MEASURED', 'MODELED / SCENARIO'],
    source: 'POSTGRESQL',
  };
}

module.exports = {
  getEnergyAnalytics,
};
