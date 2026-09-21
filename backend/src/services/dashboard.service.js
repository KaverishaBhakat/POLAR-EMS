const { prisma } = require('../config/database');
const stationService = require('./station.service');
const {
  calculateRenewablePenetration,
  calculateEnergyBalance,
  evaluateSystemRisk,
} = require('../utils/calculations');

class DashboardService {
  /**
   * Builds the consolidated real-time dashboard telemetry for a station
   */
  async getDashboardData(stationId) {
    const station = await stationService.getStationById(stationId);

    // Parallel fetch of latest snapshot across all microgrid subsystems
    const [
      latestWeather,
      latestEnergy,
      latestRenewable,
      batteries,
      generators,
      criticalLoads,
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
        include: {
          readings: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.generator.findMany({
        where: { stationId: station.id },
        include: {
          readings: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.criticalLoad.findMany({
        where: { stationId: station.id },
        orderBy: [{ priority: 'asc' }],
      }),
      prisma.alert.findMany({
        where: { stationId: station.id, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Compute key metrics dynamically
    const currentLoad = latestEnergy ? latestEnergy.totalLoad : 0;
    const renewableGeneration = latestRenewable ? latestRenewable.totalRenewable : 0;
    const renewablePercentage = calculateRenewablePenetration(renewableGeneration, currentLoad);

    // Primary battery summary
    const primaryBattery = batteries[0] || null;
    const batterySOC = primaryBattery ? primaryBattery.currentSOC : 0;
    const batteryReading = primaryBattery?.readings[0] || null;
    const batteryDischarge = batteryReading ? batteryReading.dischargePower : 0;
    const batteryCharge = batteryReading ? batteryReading.chargePower : 0;

    // Generators summary
    const totalGenOutput = generators.reduce((sum, g) => {
      const lastR = g.readings[0];
      return sum + (lastR ? lastR.powerOutput : 0);
    }, 0);
    const avgFuelLevel = generators.length > 0
      ? Math.round((generators.reduce((sum, g) => sum + g.fuelLevel, 0) / generators.length) * 10) / 10
      : 0;

    // Critical loads summary
    const totalCriticalPower = criticalLoads.reduce((sum, c) => sum + c.currentPower, 0);

    // Energy balance & stress evaluation
    const balance = calculateEnergyBalance(
      renewableGeneration,
      totalGenOutput,
      batteryDischarge,
      batteryCharge,
      currentLoad
    );

    const totalAvailableSupply = renewableGeneration + totalGenOutput + (batterySOC > 20 ? (primaryBattery?.maxDischargePower || 0) : 0);
    const riskAssessment = evaluateSystemRisk(totalAvailableSupply, currentLoad, totalCriticalPower);

    return {
      station,
      weather: latestWeather || null,
      energy: latestEnergy || null,
      renewable: latestRenewable || null,
      battery: primaryBattery
        ? {
            id: primaryBattery.id,
            name: primaryBattery.name,
            capacity: primaryBattery.capacity,
            currentSOC: primaryBattery.currentSOC,
            status: primaryBattery.status,
            flowKW: batteryReading ? (batteryReading.chargePower - batteryReading.dischargePower) : 0,
            allBatteries: batteries,
          }
        : null,
      generators: generators.map((g) => ({
        id: g.id,
        name: g.name,
        capacity: g.capacity,
        status: g.status,
        fuelLevel: g.fuelLevel,
        currentOutputKW: g.readings[0] ? g.readings[0].powerOutput : 0,
        efficiency: g.efficiency,
        totalRuntime: g.totalRuntime,
      })),
      criticalLoads,
      alerts: activeAlerts,
      summary: {
        currentLoad,
        renewableGeneration,
        batterySOC,
        fuelLevel: avgFuelLevel,
        generatorCount: generators.length,
        activeAlerts: activeAlerts.length,
        criticalLoadCount: criticalLoads.length,
        totalCriticalPowerKW: Math.round(totalCriticalPower * 10) / 10,
        renewablePercentage,
        energyBalance: balance,
        riskAssessment,
        hasTelemetryData: Boolean(latestWeather || latestEnergy || latestRenewable),
      },
    };
  }
}

module.exports = new DashboardService();
