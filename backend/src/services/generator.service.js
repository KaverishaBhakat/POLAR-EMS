const { prisma } = require('../config/database');
const stationService = require('./station.service');
const ApiError = require('../utils/ApiError');

class GeneratorService {
  /**
   * Get all generators for a station
   */
  async getStationGenerators(stationId) {
    const station = await stationService.getStationById(stationId);
    return await prisma.generator.findMany({
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
   * Get single generator by ID
   */
  async getGeneratorById(id) {
    const generator = await prisma.generator.findUnique({
      where: { id },
      include: {
        station: {
          select: { id: true, name: true, code: true },
        },
        readings: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
      },
    });

    if (!generator) {
      throw ApiError.notFound(`Generator not found with id: ${id}`, 'GENERATOR_NOT_FOUND');
    }

    return generator;
  }

  /**
   * Create new generator
   */
  async createGenerator(data) {
    const station = await stationService.getStationById(data.stationId);
    return await prisma.generator.create({
      data: {
        ...data,
        stationId: station.id,
      },
    });
  }

  /**
   * Update generator details
   */
  async updateGenerator(id, data) {
    await this.getGeneratorById(id);
    return await prisma.generator.update({
      where: { id },
      data,
    });
  }

  /**
   * Patch generator operational status
   */
  async updateGeneratorStatus(id, status) {
    await this.getGeneratorById(id);
    return await prisma.generator.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Get generator readings history
   */
  async getGeneratorReadings(id, { limit = 50, page = 1 }) {
    await this.getGeneratorById(id);
    const skip = (page - 1) * limit;

    const [total, records] = await Promise.all([
      prisma.generatorReading.count({ where: { generatorId: id } }),
      prisma.generatorReading.findMany({
        where: { generatorId: id },
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
   * Post reading for generator
   */
  async addGeneratorReading(generatorId, data) {
    const generator = await this.getGeneratorById(generatorId);

    const reading = await prisma.generatorReading.create({
      data: {
        generatorId: generator.id,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        powerOutput: data.powerOutput,
        fuelConsumed: data.fuelConsumed,
        efficiency: data.efficiency !== undefined ? data.efficiency : generator.efficiency,
        runtime: data.runtime,
      },
    });

    // Automatically update cumulative generator runtime and fuel level
    const hoursRan = (data.runtime || 0) / 60;
    const fuelDepletion = (data.fuelConsumed || 0) / 50; // approximate % drop for tank
    const newFuelLevel = Math.max(0, generator.fuelLevel - fuelDepletion);

    await prisma.generator.update({
      where: { id: generator.id },
      data: {
        totalRuntime: generator.totalRuntime + hoursRan,
        fuelLevel: Math.round(newFuelLevel * 10) / 10,
        status: data.powerOutput > 0 ? 'RUNNING' : generator.status,
      },
    });

    return reading;
  }
}

module.exports = new GeneratorService();
