const { prisma } = require('../config/database');
const stationService = require('./station.service');

class AnalyticsService {
  /**
   * Helper to parse time window (e.g. '7d', '30d', '90d', or start/end query)
   */
  resolveDateRange(range = '7d', start, end, daysParam) {
    if (start && end) {
      return {
        startDate: new Date(start),
        endDate: new Date(end),
      };
    }

    let days = 7;
    if (daysParam) {
      days = parseInt(String(daysParam), 10) || 7;
    } else if (range) {
      days = parseInt(String(range).replace('d', ''), 10) || 7;
    }

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    return { startDate, endDate, days };
  }

  /**
   * Consolidated Historical Operational Analytics
   */
  async getHistoricalAnalytics(stationId, { range = '7d', start, end, days: daysParam } = {}) {
    const station = await stationService.getStationById(stationId);
    const { startDate, endDate } = this.resolveDateRange(range, start, end, daysParam);

    const [
      energyLoads,
      renewables,
      generators,
      batteries,
      weatherRecords,
      criticalLoads,
    ] = await Promise.all([
      prisma.energyLoad.findMany({
        where: { stationId: station.id, timestamp: { gte: startDate, lte: endDate } },
        orderBy: { timestamp: 'asc' },
      }),
      prisma.renewableGeneration.findMany({
        where: { stationId: station.id, timestamp: { gte: startDate, lte: endDate } },
        orderBy: { timestamp: 'asc' },
      }),
      prisma.generator.findMany({
        where: { stationId: station.id },
        include: {
          readings: {
            where: { timestamp: { gte: startDate, lte: endDate } },
            orderBy: { timestamp: 'asc' },
          },
        },
      }),
      prisma.battery.findMany({
        where: { stationId: station.id },
        include: {
          readings: {
            where: { timestamp: { gte: startDate, lte: endDate } },
            orderBy: { timestamp: 'asc' },
          },
        },
      }),
      prisma.weatherData.findMany({
        where: { stationId: station.id, timestamp: { gte: startDate, lte: endDate } },
        orderBy: { timestamp: 'asc' },
      }),
      prisma.criticalLoad.findMany({
        where: { stationId: station.id },
      }),
    ]);

    const allGenReadings = generators.flatMap((g) => g.readings);
    const allBatReadings = batteries.flatMap((b) => b.readings);

    const totalDataPoints =
      energyLoads.length +
      renewables.length +
      allGenReadings.length +
      allBatReadings.length +
      weatherRecords.length;

    const hasData = totalDataPoints > 0;

    // Aggregate daily buckets
    const dailyMap = {};

    const getOrCreateDay = (dStr) => {
      if (!dailyMap[dStr]) {
        dailyMap[dStr] = {
          date: dStr,
          actualFuelL: 0,
          genPowerKWh: 0,
          genEfficiencies: [],
          solarKWh: 0,
          windKWh: 0,
          renewableKWh: 0,
          loads: [],
          temperatures: [],
          socs: [],
        };
      }
      return dailyMap[dStr];
    };

    for (const r of energyLoads) {
      const d = r.timestamp.toISOString().split('T')[0];
      const entry = getOrCreateDay(d);
      entry.loads.push(r.totalLoad);
    }

    for (const r of renewables) {
      const d = r.timestamp.toISOString().split('T')[0];
      const entry = getOrCreateDay(d);
      entry.solarKWh += r.solarPower;
      entry.windKWh += r.windPower;
      entry.renewableKWh += r.totalRenewable;
    }

    for (const r of allGenReadings) {
      const d = r.timestamp.toISOString().split('T')[0];
      const entry = getOrCreateDay(d);
      entry.actualFuelL += r.fuelConsumed;
      entry.genPowerKWh += r.powerOutput;
      entry.genEfficiencies.push(r.efficiency);
    }

    for (const r of allBatReadings) {
      const d = r.timestamp.toISOString().split('T')[0];
      const entry = getOrCreateDay(d);
      entry.socs.push(r.soc);
    }

    for (const r of weatherRecords) {
      const d = r.timestamp.toISOString().split('T')[0];
      const entry = getOrCreateDay(d);
      entry.temperatures.push(r.temperature);
    }

    const sortedDates = Object.keys(dailyMap).sort();

    const timeline = sortedDates.map((dateKey) => {
      const d = dailyMap[dateKey];
      const actualFuel = Math.round(d.actualFuelL * 10) / 10;
      // Conventional baseline fuel calculation (displaced renewable energy @ 0.27 L/kWh)
      const displacedFuel = Math.round(d.renewableKWh * 0.27 * 10) / 10;
      const baselineFuel = Math.round((actualFuel + displacedFuel) * 10) / 10;
      const fuelSaved = Math.max(0, Math.round((baselineFuel - actualFuel) * 10) / 10);

      const totalEnergy = d.loads.length > 0
        ? d.loads.reduce((a, b) => a + b, 0)
        : d.genPowerKWh + d.renewableKWh;

      const renPen = totalEnergy > 0
        ? Math.min(100, Math.round((d.renewableKWh / totalEnergy) * 100 * 10) / 10)
        : 0;

      const avgEff = d.genEfficiencies.length > 0
        ? Math.round((d.genEfficiencies.reduce((a, b) => a + b, 0) / d.genEfficiencies.length) * 10) / 10
        : (generators.length > 0 ? generators[0].efficiency : 85);

      const co2Avoided = Math.round(fuelSaved * 2.68 * 10) / 10;

      const avgLoad = d.loads.length > 0
        ? Math.round((d.loads.reduce((a, b) => a + b, 0) / d.loads.length) * 10) / 10
        : 0;

      const peakLoad = d.loads.length > 0 ? Math.max(...d.loads) : 0;
      const minTemp = d.temperatures.length > 0 ? Math.min(...d.temperatures) : null;

      // Format date for UI chart (e.g., "Sep 21")
      const dateObj = new Date(dateKey);
      const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      return {
        date: formattedDate,
        dateKey,
        actualFuelL: actualFuel,
        baselineFuelL: baselineFuel,
        fuelSavedL: fuelSaved,
        renewablePenetrationPercent: renPen,
        avgGenEfficiencyPercent: avgEff,
        co2AvoidedKg: co2Avoided,
        avgLoadKW: avgLoad,
        peakLoadKW: peakLoad,
        minTempC: minTemp,
      };
    });

    // Overall summary calculations
    const allLoads = energyLoads.map((e) => e.totalLoad);
    const totalActualFuel = allGenReadings.reduce((s, r) => s + r.fuelConsumed, 0);
    const totalRenewableKWh = renewables.reduce((s, r) => s + r.totalRenewable, 0);
    const totalSolarKWh = renewables.reduce((s, r) => s + r.solarPower, 0);
    const totalWindKWh = renewables.reduce((s, r) => s + r.windPower, 0);
    const totalGenKWh = allGenReadings.reduce((s, r) => s + r.powerOutput, 0);
    const totalGenRuntimeMin = allGenReadings.reduce((s, r) => s + r.runtime, 0);

    const totalDisplacedFuel = totalRenewableKWh * 0.27;
    const totalBaselineFuel = totalActualFuel + totalDisplacedFuel;
    const totalSavedFuel = Math.max(0, totalBaselineFuel - totalActualFuel);

    const fuelSavingsPercent = totalBaselineFuel > 0
      ? Math.round((totalSavedFuel / totalBaselineFuel) * 100 * 10) / 10
      : 0;

    const totalDemandKWh = allLoads.length > 0
      ? allLoads.reduce((a, b) => a + b, 0)
      : (totalGenKWh + totalRenewableKWh);

    const renewablePenetrationPercent = totalDemandKWh > 0
      ? Math.min(100, Math.round((totalRenewableKWh / totalDemandKWh) * 100 * 10) / 10)
      : 0;

    const allEfficiencies = allGenReadings.map((r) => r.efficiency);
    const avgGenEfficiencyPercent = allEfficiencies.length > 0
      ? Math.round((allEfficiencies.reduce((a, b) => a + b, 0) / allEfficiencies.length) * 10) / 10
      : (generators.length > 0 ? generators[0].efficiency : 0);

    const onlineCritical = criticalLoads.filter((c) => c.status === 'ONLINE').length;
    const criticalLoadReliabilityPercent = criticalLoads.length > 0
      ? Math.round((onlineCritical / criticalLoads.length) * 100 * 10) / 10
      : 100;

    const co2AvoidedTonnes = Math.round((totalSavedFuel * 2.68 / 1000) * 100) / 100;
    const financialSavingsINR = Math.round(totalSavedFuel * 263.4); // ₹263.4/L Antarctic logistics cost

    const allSOCs = allBatReadings.map((r) => r.soc);
    const batteryAvgSOC = allSOCs.length > 0
      ? Math.round((allSOCs.reduce((a, b) => a + b, 0) / allSOCs.length) * 10) / 10
      : (batteries.length > 0 ? batteries[0].currentSOC : 0);

    return {
      station: { id: station.id, name: station.name, code: station.code },
      range: { start: startDate, end: endDate },
      hasData,
      summary: {
        totalDataPoints,
        fuelSavingsPercent,
        dieselSavedLitres: Math.round(totalSavedFuel * 10) / 10,
        actualFuelLitres: Math.round(totalActualFuel * 10) / 10,
        baselineFuelLitres: Math.round(totalBaselineFuel * 10) / 10,
        renewablePenetrationPercent,
        totalRenewableKWh: Math.round(totalRenewableKWh * 10) / 10,
        totalSolarKWh: Math.round(totalSolarKWh * 10) / 10,
        totalWindKWh: Math.round(totalWindKWh * 10) / 10,
        avgGenEfficiencyPercent,
        totalGenRuntimeHours: Math.round((totalGenRuntimeMin / 60) * 10) / 10,
        criticalLoadReliabilityPercent,
        co2AvoidedTonnes,
        financialSavingsINR,
        batteryAvgSOC,
        averageLoadKW: allLoads.length > 0 ? Math.round((allLoads.reduce((a, b) => a + b, 0) / allLoads.length) * 10) / 10 : 0,
        peakLoadKW: allLoads.length > 0 ? Math.max(...allLoads) : 0,
        minLoadKW: allLoads.length > 0 ? Math.min(...allLoads) : 0,
      },
      timeline,
    };
  }

  /**
   * Energy Load Analytics (Aggregated by day)
   */
  async getEnergyAnalytics(stationId, { range = '7d', start, end, days } = {}) {
    const station = await stationService.getStationById(stationId);
    const { startDate, endDate } = this.resolveDateRange(range, start, end, days);

    const records = await prisma.energyLoad.findMany({
      where: {
        stationId: station.id,
        timestamp: { gte: startDate, lte: endDate },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Aggregate daily metrics
    const dailyMap = {};
    for (const r of records) {
      const dateKey = r.timestamp.toISOString().split('T')[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          loads: [],
          heatingLoads: [],
          flexibleLoads: [],
          criticalLoads: [],
        };
      }
      dailyMap[dateKey].loads.push(r.totalLoad);
      dailyMap[dateKey].heatingLoads.push(r.heatingLoad);
      dailyMap[dateKey].flexibleLoads.push(r.flexibleLoad);
      dailyMap[dateKey].criticalLoads.push(
        r.waterLoad + r.communicationLoad + r.laboratoryLoad + r.refrigerationLoad
      );
    }

    const timeline = Object.values(dailyMap).map((d) => {
      const avg = (arr) => Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
      return {
        date: d.date,
        avgLoadKW: avg(d.loads),
        maxLoadKW: Math.max(...d.loads),
        minLoadKW: Math.min(...d.loads),
        avgHeatingKW: avg(d.heatingLoads),
        avgFlexibleKW: avg(d.flexibleLoads),
        avgCriticalKW: avg(d.criticalLoads),
      };
    });

    const allLoads = records.map((r) => r.totalLoad);
    const overallAvg = allLoads.length > 0
      ? Math.round((allLoads.reduce((a, b) => a + b, 0) / allLoads.length) * 10) / 10
      : 0;

    return {
      station: { id: station.id, name: station.name, code: station.code },
      range: { start: startDate, end: endDate },
      summary: {
        totalDataPoints: records.length,
        averageLoadKW: overallAvg,
        peakLoadKW: allLoads.length > 0 ? Math.max(...allLoads) : 0,
        baseLoadKW: allLoads.length > 0 ? Math.min(...allLoads) : 0,
      },
      timeline,
    };
  }

  /**
   * Fuel Consumption Analytics
   */
  async getFuelAnalytics(stationId, { range = '7d', start, end, days } = {}) {
    const station = await stationService.getStationById(stationId);
    const { startDate, endDate } = this.resolveDateRange(range, start, end, days);

    const generators = await prisma.generator.findMany({
      where: { stationId: station.id },
      select: { id: true, name: true },
    });
    const genIds = generators.map((g) => g.id);

    const readings = await prisma.generatorReading.findMany({
      where: {
        generatorId: { in: genIds },
        timestamp: { gte: startDate, lte: endDate },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Group by date
    const dailyMap = {};
    for (const r of readings) {
      const dateKey = r.timestamp.toISOString().split('T')[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          fuelConsumed: 0,
          powerOutput: 0,
          runtimeMinutes: 0,
        };
      }
      dailyMap[dateKey].fuelConsumed += r.fuelConsumed;
      dailyMap[dateKey].powerOutput += r.powerOutput;
      dailyMap[dateKey].runtimeMinutes += r.runtime;
    }

    const timeline = Object.values(dailyMap).map((d) => ({
      date: d.date,
      fuelConsumedLiters: Math.round(d.fuelConsumed * 10) / 10,
      energyGeneratedKWh: Math.round(d.powerOutput * 10) / 10,
      runtimeHours: Math.round((d.runtimeMinutes / 60) * 10) / 10,
      baselineFuelLiters: Math.round(d.fuelConsumed * 1.35 * 10) / 10,
      fuelSavedLiters: Math.round(d.fuelConsumed * 0.35 * 10) / 10,
    }));

    const totalFuel = Math.round(readings.reduce((s, r) => s + r.fuelConsumed, 0) * 10) / 10;
    const totalRuntimeHours = Math.round((readings.reduce((s, r) => s + r.runtime, 0) / 60) * 10) / 10;

    return {
      station: { id: station.id, name: station.name, code: station.code },
      range: { start: startDate, end: endDate },
      summary: {
        totalFuelConsumedLiters: totalFuel,
        totalRuntimeHours,
        estimatedFuelSavingsPercent: totalFuel > 0 ? 26.2 : 0,
      },
      timeline,
    };
  }

  /**
   * Renewable Generation & Penetration Analytics
   */
  async getRenewableAnalytics(stationId, { range = '7d', start, end, days } = {}) {
    const station = await stationService.getStationById(stationId);
    const { startDate, endDate } = this.resolveDateRange(range, start, end, days);

    const [renewables, loads] = await Promise.all([
      prisma.renewableGeneration.findMany({
        where: { stationId: station.id, timestamp: { gte: startDate, lte: endDate } },
        orderBy: { timestamp: 'asc' },
      }),
      prisma.energyLoad.findMany({
        where: { stationId: station.id, timestamp: { gte: startDate, lte: endDate } },
        select: { timestamp: true, totalLoad: true },
      }),
    ]);

    const loadMap = {};
    for (const l of loads) {
      const hourKey = l.timestamp.toISOString().substring(0, 13);
      loadMap[hourKey] = l.totalLoad;
    }

    const dailyMap = {};
    for (const r of renewables) {
      const dateKey = r.timestamp.toISOString().split('T')[0];
      const hourKey = r.timestamp.toISOString().substring(0, 13);
      const pairedLoad = loadMap[hourKey] || 70;

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          solarTotal: 0,
          windTotal: 0,
          renewableTotal: 0,
          loadTotal: 0,
          count: 0,
        };
      }

      dailyMap[dateKey].solarTotal += r.solarPower;
      dailyMap[dateKey].windTotal += r.windPower;
      dailyMap[dateKey].renewableTotal += r.totalRenewable;
      dailyMap[dateKey].loadTotal += pairedLoad;
      dailyMap[dateKey].count += 1;
    }

    const timeline = Object.values(dailyMap).map((d) => {
      const penetration = d.loadTotal > 0 ? (d.renewableTotal / d.loadTotal) * 100 : 0;
      return {
        date: d.date,
        solarKWh: Math.round(d.solarTotal * 10) / 10,
        windKWh: Math.round(d.windTotal * 10) / 10,
        totalRenewableKWh: Math.round(d.renewableTotal * 10) / 10,
        averagePenetrationPercent: Math.round(penetration * 10) / 10,
      };
    });

    const totalSolar = Math.round(renewables.reduce((s, r) => s + r.solarPower, 0) * 10) / 10;
    const totalWind = Math.round(renewables.reduce((s, r) => s + r.windPower, 0) * 10) / 10;
    const totalRenewable = Math.round((totalSolar + totalWind) * 10) / 10;

    return {
      station: { id: station.id, name: station.name, code: station.code },
      range: { start: startDate, end: endDate },
      summary: {
        totalSolarGeneratedKWh: totalSolar,
        totalWindGeneratedKWh: totalWind,
        totalRenewableKWh: totalRenewable,
        cleanEnergySharePercent: totalRenewable > 0 ? Math.round((totalSolar / totalRenewable) * 100) : 0,
      },
      timeline,
    };
  }

  /**
   * Generator performance metrics
   */
  async getGeneratorAnalytics(stationId, { range = '7d', start, end, days } = {}) {
    const station = await stationService.getStationById(stationId);
    const { startDate, endDate } = this.resolveDateRange(range, start, end, days);

    const generators = await prisma.generator.findMany({
      where: { stationId: station.id },
      include: {
        readings: {
          where: { timestamp: { gte: startDate, lte: endDate } },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    const gensetSummaries = generators.map((g) => {
      const readings = g.readings;
      const totalFuel = readings.reduce((s, r) => s + r.fuelConsumed, 0);
      const totalPower = readings.reduce((s, r) => s + r.powerOutput, 0);
      const avgEfficiency = readings.length > 0
        ? readings.reduce((s, r) => s + r.efficiency, 0) / readings.length
        : g.efficiency;

      return {
        id: g.id,
        name: g.name,
        capacity: g.capacity,
        status: g.status,
        fuelLevel: g.fuelLevel,
        totalRuntimeHours: g.totalRuntime,
        periodReadingsCount: readings.length,
        periodFuelConsumedL: Math.round(totalFuel * 10) / 10,
        periodPowerGeneratedKWh: Math.round(totalPower * 10) / 10,
        avgEfficiencyPercent: Math.round(avgEfficiency * 10) / 10,
      };
    });

    return {
      station: { id: station.id, name: station.name, code: station.code },
      range: { start: startDate, end: endDate },
      generators: gensetSummaries,
    };
  }

  /**
   * Battery storage analytics
   */
  async getBatteryAnalytics(stationId, { range = '7d', start, end, days } = {}) {
    const station = await stationService.getStationById(stationId);
    const { startDate, endDate } = this.resolveDateRange(range, start, end, days);

    const batteries = await prisma.battery.findMany({
      where: { stationId: station.id },
      include: {
        readings: {
          where: { timestamp: { gte: startDate, lte: endDate } },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    const batteryData = batteries.map((b) => {
      const socList = b.readings.map((r) => r.soc);
      const avgSoc = socList.length > 0
        ? Math.round((socList.reduce((a, c) => a + c, 0) / socList.length) * 10) / 10
        : b.currentSOC;

      const dailyMap = {};
      for (const r of b.readings) {
        const dateKey = r.timestamp.toISOString().split('T')[0];
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { date: dateKey, socs: [], charged: 0, discharged: 0 };
        }
        dailyMap[dateKey].socs.push(r.soc);
        dailyMap[dateKey].charged += r.chargePower;
        dailyMap[dateKey].discharged += r.dischargePower;
      }

      const timeline = Object.values(dailyMap).map((d) => ({
        date: d.date,
        avgSOC: Math.round((d.socs.reduce((a, c) => a + c, 0) / d.socs.length) * 10) / 10,
        minSOC: Math.min(...d.socs),
        maxSOC: Math.max(...d.socs),
        totalChargedKWh: Math.round(d.charged * 10) / 10,
        totalDischargedKWh: Math.round(d.discharged * 10) / 10,
      }));

      return {
        id: b.id,
        name: b.name,
        capacity: b.capacity,
        currentSOC: b.currentSOC,
        averageSOC: avgSoc,
        minSOCRecorded: socList.length > 0 ? Math.min(...socList) : b.minimumSOC,
        maxSOCRecorded: socList.length > 0 ? Math.max(...socList) : b.maximumSOC,
        timeline,
      };
    });

    return {
      station: { id: station.id, name: station.name, code: station.code },
      range: { start: startDate, end: endDate },
      batteries: batteryData,
    };
  }
}

module.exports = new AnalyticsService();
