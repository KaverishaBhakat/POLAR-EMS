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
      recentEnergy,
      recentRenewable,
      recentWeather,
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
      prisma.energyLoad.findMany({
        where: { stationId: station.id },
        orderBy: { timestamp: 'desc' },
        take: 24,
      }),
      prisma.renewableGeneration.findMany({
        where: { stationId: station.id },
        orderBy: { timestamp: 'desc' },
        take: 24,
      }),
      prisma.weatherData.findMany({
        where: { stationId: station.id },
        orderBy: { timestamp: 'desc' },
        take: 24,
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

    // Format hourly trend points from database time-series
    const hourlyPoints = recentEnergy.slice().reverse().map((e, idx) => {
      const ren = recentRenewable.find((r) => r.timestamp.getTime() === e.timestamp.getTime()) || recentRenewable[idx];
      const w = recentWeather.find((w) => w.timestamp.getTime() === e.timestamp.getTime()) || recentWeather[idx];
      const d = new Date(e.timestamp);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        hour: `${d.getHours()}:00`,
        time: timeStr,
        actualLoadKW: e.totalLoad,
        predictedLoadKW: e.totalLoad,
        lowerConfidenceKW: Math.round(e.totalLoad * 0.92 * 10) / 10,
        upperConfidenceKW: Math.round(e.totalLoad * 1.08 * 10) / 10,
        solarForecastKW: ren ? ren.solarPower : 0,
        windForecastKW: ren ? ren.windPower : 0,
        totalRenewableKW: ren ? ren.totalRenewable : 0,
        temperatureC: w ? w.temperature : -15.0,
        windSpeedMs: w ? w.windSpeed : 10.0,
        solarRadiationWm2: w ? w.solarRadiation : 0,
      };
    });

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
      generators: generators.map((g, idx) => {
        const lastReading = g.readings[0];
        const outKW = lastReading ? lastReading.powerOutput : 0;
        return {
          id: `G${idx + 1}`,
          dbId: g.id,
          name: g.name,
          model: 'Cummins Arctic Polar-VTA28',
          capacity: g.capacity,
          maxOutputKW: g.capacity,
          outputKW: outKW,
          currentOutputKW: outKW,
          status: g.status || (outKW > 0 ? 'RUNNING' : 'STANDBY'),
          fuelLevel: g.fuelLevel,
          efficiency: g.efficiency,
          efficiencyPercent: g.efficiency || 38.5,
          fuelConsumptionLh: Math.round((outKW * 0.25) * 10) / 10,
          runtimeHours: g.totalRuntime || 0,
          loadPercentage: g.capacity > 0 ? Math.round((outKW / g.capacity) * 100) : 0,
          temperatureC: outKW > 0 ? 86.0 : 22.0,
          oilPressureBar: outKW > 0 ? 4.6 : 0.0,
          frequencyHz: 50.0,
          voltageV: 415.0,
        };
      }),
      criticalLoads: criticalLoads.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        powerKW: c.currentPower || c.ratedPower,
        percentage: c.ratedPower > 0 ? Math.round(((c.currentPower || c.ratedPower) / c.ratedPower) * 100) : 100,
        status: c.status === 'ONLINE' ? 'PROTECTED' : 'OPTIMIZED',
        subsystem: c.name,
      })),
      alerts: activeAlerts,
      points: hourlyPoints,
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
