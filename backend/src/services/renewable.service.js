const { prisma } = require('../config/database');
const stationService = require('./station.service');
const ApiError = require('../utils/ApiError');

class RenewableService {
  /**
   * Get latest renewable generation reading
   */
  async getLatestRenewable(stationId) {
    const station = await stationService.getStationById(stationId);
    const latest = await prisma.renewableGeneration.findFirst({
      where: { stationId: station.id },
      orderBy: { timestamp: 'desc' },
    });

    if (!latest) {
      throw ApiError.notFound('No renewable generation data found for this station', 'RENEWABLE_NOT_FOUND');
    }

    return latest;
  }

  /**
   * Get renewable generation history with pagination
   */
  async getRenewableHistory(stationId, { limit = 50, page = 1 }) {
    const station = await stationService.getStationById(stationId);
    const skip = (page - 1) * limit;

    const [total, records] = await Promise.all([
      prisma.renewableGeneration.count({ where: { stationId: station.id } }),
      prisma.renewableGeneration.findMany({
        where: { stationId: station.id },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip,
      }),
    ]);

    return {
      records,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get renewable generation records within date range
   */
  async getRenewableRange(stationId, { start, end, limit = 100 }) {
    const station = await stationService.getStationById(stationId);

    const where = { stationId: station.id };
    if (start || end) {
      where.timestamp = {};
      if (start) where.timestamp.gte = new Date(start);
      if (end) where.timestamp.lte = new Date(end);
    }

    return await prisma.renewableGeneration.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: limit,
    });
  }

  /**
   * Record new renewable generation telemetry
   */
  async recordRenewable(data) {
    const station = await stationService.getStationById(data.stationId);
    const totalRenewable = data.totalRenewable !== undefined
      ? data.totalRenewable
      : (data.solarPower || 0) + (data.windPower || 0);

    return await prisma.renewableGeneration.create({
      data: {
        stationId: station.id,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        solarPower: data.solarPower,
        windPower: data.windPower,
        totalRenewable,
      },
    });
  }
}

module.exports = new RenewableService();
