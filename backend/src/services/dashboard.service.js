const { prisma } = require('../config/database');
const stationService = require('./station.service');
const pvGenerationService = require('./pv-generation.service');
const {
  calculateRenewablePenetration,
  calculateEnergyBalance,
  evaluateSystemRisk,
} = require('../utils/calculations');

class DashboardService {
  /**
   * Resolves hybrid solar power value with explicit provenance.
   * Priority:
   * 1. Measured telemetry (MEASURED)
   * 2. Climatological PV generation estimate (CLIMATOLOGICAL_ESTIMATE)
   * 3. Solar resource unavailable / polar night null (UNAVAILABLE)
   *
   * @param {string} stationId
   * @param {string|Date} timestamp
   * @param {Object} [measuredRecord] - renewableGeneration record if found
   * @returns {Promise<{solarPowerKW: number|null, solarSource: 'MEASURED'|'CLIMATOLOGICAL_ESTIMATE'|'UNAVAILABLE', isTelemetryLive: boolean, solarAvailable: boolean}>}
   */
  async resolveSolarPowerForDashboard(stationId, timestamp, measuredRecord) {
    // 1. MEASURED PRIORITY:
    // Check explicitly for null / undefined, because 0 is a valid measured solar reading
    if (
      measuredRecord &&
      measuredRecord.solarPower !== null &&
      measuredRecord.solarPower !== undefined
    ) {
      return {
        solarPowerKW: measuredRecord.solarPower,
        solarSource: 'MEASURED',
        isTelemetryLive: true,
        solarAvailable: true,
      };
    }

    // 2. CLIMATOLOGICAL FALLBACK:
    if (stationId) {
      try {
        const targetTimestamp = timestamp || (measuredRecord && measuredRecord.timestamp) || new Date();
        const pvEstimate = await pvGenerationService.estimatePvGeneration({
          stationId,
          timestamp: targetTimestamp,
        });

        if (pvEstimate && pvEstimate.available && pvEstimate.estimatedPvPowerKw !== null) {
          return {
            solarPowerKW: pvEstimate.estimatedPvPowerKw,
            solarSource: 'CLIMATOLOGICAL_ESTIMATE',
            isTelemetryLive: false,
            solarAvailable: true,
          };
        }
      } catch (err) {
        // Fall through to UNAVAILABLE if station has no solar resource or error
      }
    }

    // 3. UNAVAILABLE:
    return {
      solarPowerKW: null,
      solarSource: 'UNAVAILABLE',
      isTelemetryLive: false,
      solarAvailable: false,
    };
  }

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

    // Resolve hybrid solar snapshot with explicit provenance
    const solarInfo = await this.resolveSolarPowerForDashboard(
      station.id,
      latestRenewable?.timestamp || latestEnergy?.timestamp || latestWeather?.timestamp || new Date(),
      latestRenewable
    );

    // Compute key metrics dynamically
    const currentLoad = latestEnergy ? latestEnergy.totalLoad : 0;
    const renewableGeneration = latestRenewable
      ? latestRenewable.totalRenewable
      : (solarInfo.solarPowerKW || 0);
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
    const hourlyPoints = await Promise.all(
      recentEnergy.slice().reverse().map(async (e, idx) => {
        const ren = recentRenewable.find((r) => r.timestamp.getTime() === e.timestamp.getTime()) || recentRenewable[idx];
        const w = recentWeather.find((w) => w.timestamp.getTime() === e.timestamp.getTime()) || recentWeather[idx];
        const d = new Date(e.timestamp);
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const pointSolar = await this.resolveSolarPowerForDashboard(
          station.id,
          e.timestamp,
          ren
        );

        const windVal = ren && ren.windPower !== null && ren.windPower !== undefined ? ren.windPower : 0;
        const totalRenVal = ren && ren.totalRenewable !== null && ren.totalRenewable !== undefined
          ? ren.totalRenewable
          : ((pointSolar.solarPowerKW || 0) + windVal);

        return {
          hour: `${d.getHours()}:00`,
          time: timeStr,
          timestamp: e.timestamp,
          actualLoadKW: e.totalLoad,
          predictedLoadKW: e.totalLoad,
          lowerConfidenceKW: Math.round(e.totalLoad * 0.92 * 10) / 10,
          upperConfidenceKW: Math.round(e.totalLoad * 1.08 * 10) / 10,
          solarForecastKW: pointSolar.solarPowerKW,
          solarSource: pointSolar.solarSource,
          windForecastKW: windVal,
          totalRenewableKW: totalRenVal,
          temperatureC: w ? w.temperature : -15.0,
          windSpeedMs: w ? w.windSpeed : 10.0,
          solarRadiationWm2: w ? w.solarRadiation : 0,
        };
      })
    );

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
        priority: c.priority,
        ratedPower: c.ratedPower,
        currentPower: c.currentPower,
        powerKW: c.currentPower != null ? c.currentPower : c.ratedPower,
        percentage: c.ratedPower > 0 ? Math.min(100, Math.round(((c.currentPower != null ? c.currentPower : c.ratedPower) / c.ratedPower) * 100)) : 100,
        status: c.status || 'ONLINE',
        subsystem: c.name,
      })),
      alerts: activeAlerts,
      points: hourlyPoints,
      solarPowerKW: solarInfo.solarPowerKW,
      solarSource: solarInfo.solarSource,
      isTelemetryLive: solarInfo.isTelemetryLive,
      solarAvailable: solarInfo.solarAvailable,
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
        solarPowerKW: solarInfo.solarPowerKW,
        solarSource: solarInfo.solarSource,
        isTelemetryLive: solarInfo.isTelemetryLive,
        solarAvailable: solarInfo.solarAvailable,
      },
    };
  }
}

module.exports = new DashboardService();

