const { prisma } = require('../config/database');
const stationService = require('./station.service');
const ApiError = require('../utils/ApiError');

class EnergyService {
  /**
   * Get latest energy load reading
   */
  async getLatestEnergy(stationId) {
    const station = await stationService.getStationById(stationId);
    const latest = await prisma.energyLoad.findFirst({
      where: { stationId: station.id },
      orderBy: { timestamp: 'desc' },
    });

    if (!latest) {
      throw ApiError.notFound('No energy load data found for this station', 'ENERGY_LOAD_NOT_FOUND');
    }

    return latest;
  }

  /**
   * Get energy load history with pagination
   */
  async getEnergyHistory(stationId, { limit = 50, page = 1 }) {
    const station = await stationService.getStationById(stationId);
    const skip = (page - 1) * limit;

    const [total, records] = await Promise.all([
      prisma.energyLoad.count({ where: { stationId: station.id } }),
      prisma.energyLoad.findMany({
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
   * Get energy loads within date range
   */
  async getEnergyRange(stationId, { start, end, limit = 100 }) {
    const station = await stationService.getStationById(stationId);

    const where = { stationId: station.id };
    if (start || end) {
      where.timestamp = {};
      if (start) where.timestamp.gte = new Date(start);
      if (end) where.timestamp.lte = new Date(end);
    }

    return await prisma.energyLoad.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: limit,
    });
  }

  /**
   * Record new energy load telemetry
   */
  async recordEnergy(data) {
    const station = await stationService.getStationById(data.stationId);

    return await prisma.energyLoad.create({
      data: {
        ...data,
        stationId: station.id,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      },
    });
  }
}

module.exports = new EnergyService();
