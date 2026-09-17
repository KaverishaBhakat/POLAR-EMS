const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');
const { calculateRenewablePenetration } = require('../utils/calculations');

class StationService {
  /**
   * Helper to resolve station by UUID id or code (case-insensitive, e.g. 'maitri', 'MAITRI')
   */
  async findStationByIdOrCode(identifier) {
    if (!identifier) return null;
    return await prisma.station.findFirst({
      where: {
        OR: [
          { id: identifier },
          { code: identifier.toUpperCase() },
          { name: { equals: identifier, mode: 'insensitive' } },
        ],
      },
    });
  }

  /**
   * List all stations
   */
  async getAllStations() {
    return await prisma.station.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get single station by ID or code
   */
  async getStationById(id) {
    const station = await this.findStationByIdOrCode(id);
    if (!station) {
      throw ApiError.notFound(`Station not found with identifier: ${id}`, 'STATION_NOT_FOUND');
    }
    return station;
  }

  /**
   * Create a new station
   */
  async createStation(data) {
    const existing = await prisma.station.findUnique({
      where: { code: data.code.toUpperCase() },
    });
    if (existing) {
      throw ApiError.conflict(`Station with code ${data.code} already exists`, 'STATION_CODE_EXISTS');
    }

    return await prisma.station.create({
      data: {
        ...data,
        code: data.code.toUpperCase(),
      },
    });
  }

  /**
   * Update station
   */
  async updateStation(id, data) {
    const station = await this.getStationById(id);
    return await prisma.station.update({
      where: { id: station.id },
      data,
    });
  }

  /**
   * Delete station
   */
  async deleteStation(id) {
    const station = await this.getStationById(id);
    return await prisma.station.delete({
      where: { id: station.id },
    });
  }

  /**
   * Consolidated station summary
   */
  async getStationSummary(id) {
    const station = await this.getStationById(id);

    const [
      latestWeather,
      latestEnergy,
      latestRenewable,
      batteries,
      generators,
      activeAlerts,
    ] = await Promise.all([
      prisma.weatherData.findFirst({
        where: { stationId: station.id },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.energyLoad.findFirst({
        where: { stationId: station.id },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.renewableGeneration.findFirst({
        where: { stationId: station.id },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.battery.findMany({
        where: { stationId: station.id },
        select: {
          id: true,
          name: true,
          capacity: true,
          currentSOC: true,
          status: true,
          maxChargePower: true,
          maxDischargePower: true,
        },
      }),
      prisma.generator.findMany({
        where: { stationId: station.id },
        select: {
          id: true,
          name: true,
          capacity: true,
          status: true,
          fuelLevel: true,
          efficiency: true,
          totalRuntime: true,
        },
      }),
      prisma.alert.findMany({
        where: { stationId: station.id, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalRenewableKW = latestRenewable ? latestRenewable.totalRenewable : 0;
    const totalLoadKW = latestEnergy ? latestEnergy.totalLoad : 0;
    const renewablePenetration = calculateRenewablePenetration(totalRenewableKW, totalLoadKW);

    return {
      station,
      latestWeather: latestWeather || null,
      latestEnergy: latestEnergy || null,
      latestRenewable: latestRenewable || null,
      batteries,
      generators,
      activeAlerts,
      calculated: {
        renewablePenetration,
        activeAlertCount: activeAlerts.length,
      },
    };
  }
}

module.exports = new StationService();
