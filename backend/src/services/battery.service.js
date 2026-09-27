const { prisma } = require('../config/database');
const stationService = require('./station.service');
const ApiError = require('../utils/ApiError');

class BatteryService {
  /**
   * Get all batteries for a station
   */
  async getStationBatteries(stationId) {
    const station = await stationService.getStationById(stationId);
    return await prisma.battery.findMany({
      where: { stationId: station.id },
      include: {
        readings: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get battery by ID
   */
  async getBatteryById(id) {
    const battery = await prisma.battery.findUnique({
      where: { id },
      include: {
        station: {
          select: { id: true, name: true, code: true },
        },
        readings: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });

    if (!battery) {
      throw ApiError.notFound(`Battery not found with id: ${id}`, 'BATTERY_NOT_FOUND');
    }

    return battery;
  }

  /**
   * Update battery parameters
   */
  async updateBattery(id, data) {
    await this.getBatteryById(id);
    return await prisma.battery.update({
      where: { id },
      data,
    });
  }

  /**
   * Get battery telemetry readings
   */
  async getBatteryReadings(id, { limit = 50, page = 1 } = {}) {
    await this.getBatteryById(id);
    const limitNum = parseInt(limit, 10) || 50;
    const pageNum = parseInt(page, 10) || 1;
    const skip = (pageNum - 1) * limitNum;

    const [total, records] = await Promise.all([
      prisma.batteryReading.count({ where: { batteryId: id } }),
      prisma.batteryReading.findMany({
        where: { batteryId: id },
        orderBy: { timestamp: 'desc' },
        take: limitNum,
        skip,
      }),
    ]);

    return {
      records,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Add battery reading and sync currentSOC/status on the battery model
   */
  async addBatteryReading(batteryId, data) {
    const battery = await this.getBatteryById(batteryId);

    const reading = await prisma.batteryReading.create({
      data: {
        batteryId: battery.id,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        soc: data.soc,
        chargePower: data.chargePower || 0,
        dischargePower: data.dischargePower || 0,
      },
    });

    let status = 'IDLE';
    if ((data.chargePower || 0) > 0) status = 'CHARGING';
    else if ((data.dischargePower || 0) > 0) status = 'DISCHARGING';

    await prisma.battery.update({
      where: { id: battery.id },
      data: {
        currentSOC: data.soc,
        status,
      },
    });

    return reading;
  }
}

module.exports = new BatteryService();
