/**
 * Battery Storage (BESS) AI Tools for POLAR-EMS
 * 
 * Provides validated, read-only tools for battery bank status, State of Charge (SOC),
 * charge/discharge powers, and historical energy storage telemetry.
 */

const batteryService = require('../battery.service');
const stationService = require('../station.service');
const { prisma } = require('../../config/database');
const ApiError = require('../../utils/ApiError');

/**
 * Tool: get_current_battery
 */
async function getCurrentBattery({ stationId }) {
  if (!stationId || typeof stationId !== 'string' || !stationId.trim()) {
    throw ApiError.badRequest('Parameter "stationId" is required.', 'MISSING_STATION_ID');
  }

  const station = await stationService.getStationById(stationId.trim());

  if (station.code === 'BHARATI') {
    throw ApiError.notFound('Measured battery storage telemetry is not available for Bharati Station.', 'BATTERY_UNAVAILABLE');
  }

  const batteries = await batteryService.getStationBatteries(station.id);

  if (!batteries || batteries.length === 0) {
    throw ApiError.notFound('No battery storage system found for this station.', 'BATTERY_NOT_FOUND');
  }

  const primaryBattery = batteries[0];
  const latestReading = primaryBattery.readings?.[0] || null;

  return {
    success: true,
    tool: 'get_current_battery',
    station: {
      id: station.id,
      code: station.code,
      name: station.name,
    },
    data: {
      batteryId: primaryBattery.id,
      name: primaryBattery.name,
      capacityKWh: primaryBattery.capacity,
      currentSOCPercent: primaryBattery.currentSOC,
      status: primaryBattery.status,
      minimumSOCPercent: primaryBattery.minimumSOC,
      maximumSOCPercent: primaryBattery.maximumSOC,
      maxChargePowerKW: primaryBattery.maxChargePower,
      maxDischargePowerKW: primaryBattery.maxDischargePower,
      currentChargePowerKW: latestReading?.chargePower ?? 0,
      currentDischargePowerKW: latestReading?.dischargePower ?? 0,
    },
    provenance: 'MODELED / SCENARIO',
    timestamp: latestReading?.timestamp?.toISOString() || primaryBattery.updatedAt.toISOString(),
    source: 'POSTGRESQL',
  };
}

/**
 * Tool: get_battery_history
 */
async function getBatteryHistory({ stationId, batteryId, start, end, limit = 24 }) {
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
  let targetBatteryId = batteryId;

  if (!targetBatteryId) {
    const batteries = await batteryService.getStationBatteries(station.id);
    if (batteries.length > 0) targetBatteryId = batteries[0].id;
  }

  if (!targetBatteryId) {
    throw ApiError.notFound('No batteries found for station.', 'BATTERY_NOT_FOUND');
  }

  const where = { batteryId: targetBatteryId };
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }

  const records = await prisma.batteryReading.findMany({
    where,
    orderBy: { timestamp: 'asc' },
    take: limitNum,
  });

  return {
    success: true,
    tool: 'get_battery_history',
    station: {
      id: station.id,
      code: station.code,
      name: station.name,
    },
    batteryId: targetBatteryId,
    count: records.length,
    range: {
      start: startDate ? startDate.toISOString() : (records[0]?.timestamp?.toISOString() || null),
      end: endDate ? endDate.toISOString() : (records[records.length - 1]?.timestamp?.toISOString() || null),
    },
    data: records.map((r) => ({
      timestamp: r.timestamp.toISOString(),
      socPercent: r.soc,
      chargePowerKW: r.chargePower,
      dischargePowerKW: r.dischargePower,
    })),
    provenance: 'MODELED / SCENARIO',
    source: 'POSTGRESQL',
  };
}

module.exports = {
  getCurrentBattery,
  getBatteryHistory,
};
