const { prisma } = require('../config/database');
const stationService = require('./station.service');
const ApiError = require('../utils/ApiError');

class CriticalLoadService {
  /**
   * Get all critical loads for a station
   */
  async getStationCriticalLoads(stationId) {
    const station = await stationService.getStationById(stationId);
    return await prisma.criticalLoad.findMany({
      where: { stationId: station.id },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get single critical load by ID
   */
  async getCriticalLoadById(id) {
    const load = await prisma.criticalLoad.findUnique({
      where: { id },
    });

    if (!load) {
      throw ApiError.notFound(`Critical load not found with id: ${id}`, 'CRITICAL_LOAD_NOT_FOUND');
    }

    return load;
  }

  /**
   * Create critical load
   */
  async createCriticalLoad(data) {
    const station = await stationService.getStationById(data.stationId);
    return await prisma.criticalLoad.create({
      data: {
        ...data,
        stationId: station.id,
      },
    });
  }

  /**
   * Update critical load
   */
  async updateCriticalLoad(id, data) {
    await this.getCriticalLoadById(id);
    return await prisma.criticalLoad.update({
      where: { id },
      data,
    });
  }

  /**
   * Patch load operational status (e.g., ONLINE, SHED, STANDBY)
   */
  async updateCriticalLoadStatus(id, status) {
    await this.getCriticalLoadById(id);
    return await prisma.criticalLoad.update({
      where: { id },
      data: { status },
    });
  }
}

module.exports = new CriticalLoadService();
