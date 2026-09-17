const { prisma } = require('../config/database');
const stationService = require('./station.service');
const { runRuleBasedSimulation } = require('../utils/calculations');
const ApiError = require('../utils/ApiError');

class SimulationService {
  /**
   * Executes a deterministic rule-based what-if scenario simulation and persists inputs/outputs
   */
  async runSimulation(userId, params) {
    const station = await stationService.getStationById(params.stationId);

    // Run deterministic mathematical simulation
    const simOutput = runRuleBasedSimulation(params, {
      baseLoadKW: 65,
      installedSolarKW: 45,
      installedWindKW: 60,
      batteryCapacityKWh: 300,
      generatorCapacityKW: 140,
      criticalLoadKW: 42,
    });

    // Persist simulation scenario and its 1:1 result
    const simulation = await prisma.simulation.create({
      data: {
        userId,
        stationId: station.id,
        name: params.name,
        temperature: params.temperature,
        windSpeed: params.windSpeed,
        solarAvailability: params.solarAvailability,
        occupancy: params.occupancy,
        batterySOC: params.batterySOC,
        renewableForecastError: params.renewableForecastError || 0,
        generatorFailure: params.generatorFailure || false,
        result: {
          create: {
            predictedLoad: simOutput.predictedLoad,
            renewableGeneration: simOutput.renewableGeneration,
            batterySOC: simOutput.batterySOC,
            fuelConsumption: simOutput.fuelConsumption,
            generatorRequirement: simOutput.generatorRequirement,
            energyStress: simOutput.energyStress,
            criticalLoadRisk: simOutput.criticalLoadRisk,
            recommendation: simOutput.recommendation,
          },
        },
      },
      include: {
        result: true,
        station: {
          select: { id: true, name: true, code: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      simulation,
      metadata: {
        engine: 'Rule-Based Simulation',
        modelType: 'Deterministic Thermodynamic & Aerodynamic Model',
        status: 'COMPLETE',
      },
    };
  }

  /**
   * Get simulation details by ID
   */
  async getSimulationById(id) {
    const simulation = await prisma.simulation.findUnique({
      where: { id },
      include: {
        result: true,
        station: {
          select: { id: true, name: true, code: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!simulation) {
      throw ApiError.notFound(`Simulation not found with id: ${id}`, 'SIMULATION_NOT_FOUND');
    }

    return simulation;
  }

  /**
   * Get simulation history for a station
   */
  async getSimulationHistory(stationId, { limit = 20, page = 1 } = {}) {
    const station = await stationService.getStationById(stationId);
    const skip = (page - 1) * limit;

    const [total, records] = await Promise.all([
      prisma.simulation.count({ where: { stationId: station.id } }),
      prisma.simulation.findMany({
        where: { stationId: station.id },
        include: {
          result: true,
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
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
}

module.exports = new SimulationService();
