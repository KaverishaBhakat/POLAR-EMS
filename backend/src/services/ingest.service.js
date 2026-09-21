const { prisma } = require('../config/database');
const stationService = require('./station.service');
const ApiError = require('../utils/ApiError');
const {
  calculateRenewablePenetration,
  calculateEnergyBalance,
  evaluateSystemRisk,
} = require('../utils/calculations');

class IngestService {
  /**
   * Ingests a single real-time multi-subsystem SCADA telemetry reading
   */
  async ingestTelemetry(stationIdentifier, telemetry) {
    const station = await stationService.getStationById(stationIdentifier);
    const timestamp = telemetry.timestamp ? new Date(telemetry.timestamp) : new Date();

    const results = {};

    // 1. Ingest Weather Data
    if (telemetry.weather) {
      const {
        temperature = -15.0,
        pressure = 985.0,
        humidity = 65.0,
        windSpeed = 12.0,
        windDirection = 'SSW',
        solarRadiation = 0.0,
      } = telemetry.weather;

      results.weather = await prisma.weatherData.create({
        data: {
          stationId: station.id,
          timestamp,
          temperature: parseFloat(temperature),
          pressure: parseFloat(pressure),
          humidity: parseFloat(humidity),
          windSpeed: parseFloat(windSpeed),
          windDirection: String(windDirection),
          solarRadiation: parseFloat(solarRadiation),
        },
      });

      // Katabatic storm alert trigger
      if (parseFloat(windSpeed) > 25.0) {
        await prisma.alert.create({
          data: {
            stationId: station.id,
            type: 'WEATHER',
            severity: parseFloat(windSpeed) > 35 ? 'CRITICAL' : 'WARNING',
            title: 'Katabatic High-Wind Warning',
            message: `Blizzard-grade wind velocity detected at ${windSpeed} m/s. Secure outdoor scientific rigs.`,
            source: 'METEOROLOGY_SCADA',
          },
        });
      }
    }

    // 2. Ingest Electrical Demand Load
    if (telemetry.load) {
      const {
        totalLoad = 50.0,
        heatingLoad = 25.0,
        waterLoad = 10.0,
        communicationLoad = 5.0,
        laboratoryLoad = 7.0,
        refrigerationLoad = 2.0,
        flexibleLoad = 1.0,
      } = telemetry.load;

      results.load = await prisma.energyLoad.create({
        data: {
          stationId: station.id,
          timestamp,
          totalLoad: parseFloat(totalLoad),
          heatingLoad: parseFloat(heatingLoad),
          waterLoad: parseFloat(waterLoad),
          communicationLoad: parseFloat(communicationLoad),
          laboratoryLoad: parseFloat(laboratoryLoad),
          refrigerationLoad: parseFloat(refrigerationLoad),
          flexibleLoad: parseFloat(flexibleLoad),
        },
      });
    }

    // 3. Ingest Renewable Generation
    if (telemetry.renewable) {
      const solarPower = parseFloat(telemetry.renewable.solarPower || 0);
      const windPower = parseFloat(telemetry.renewable.windPower || 0);
      const totalRenewable = parseFloat(
        telemetry.renewable.totalRenewable !== undefined
          ? telemetry.renewable.totalRenewable
          : solarPower + windPower
      );

      results.renewable = await prisma.renewableGeneration.create({
        data: {
          stationId: station.id,
          timestamp,
          solarPower,
          windPower,
          totalRenewable,
        },
      });
    }

    // 4. Ingest Battery Telemetry
    if (telemetry.battery) {
      let battery = await prisma.battery.findFirst({
        where: { stationId: station.id },
      });

      if (!battery) {
        battery = await prisma.battery.create({
          data: {
            stationId: station.id,
            name: `${station.name} Primary BESS`,
            capacity: 500,
            currentSOC: parseFloat(telemetry.battery.soc || 50),
            maxChargePower: 150,
            maxDischargePower: 150,
            status: 'ONLINE',
          },
        });
      } else if (telemetry.battery.soc !== undefined) {
        await prisma.battery.update({
          where: { id: battery.id },
          data: {
            currentSOC: parseFloat(telemetry.battery.soc),
            status: telemetry.battery.status || 'ONLINE',
          },
        });
      }

      results.battery = await prisma.batteryReading.create({
        data: {
          batteryId: battery.id,
          timestamp,
          soc: parseFloat(telemetry.battery.soc || battery.currentSOC),
          chargePower: parseFloat(telemetry.battery.chargePower || 0),
          dischargePower: parseFloat(telemetry.battery.dischargePower || 0),
        },
      });

      // Battery low SOC alert
      if (parseFloat(telemetry.battery.soc) < 25) {
        await prisma.alert.create({
          data: {
            stationId: station.id,
            type: 'BATTERY',
            severity: parseFloat(telemetry.battery.soc) < 15 ? 'CRITICAL' : 'WARNING',
            title: 'BESS State-of-Charge Depleted',
            message: `Station battery reserve is down to ${telemetry.battery.soc}%. Initiate diesel genset or shed non-critical loads.`,
            source: 'BESS_BMS',
          },
        });
      }
    }

    // 5. Ingest Generator Telemetry
    if (telemetry.generator) {
      let generator = await prisma.generator.findFirst({
        where: { stationId: station.id },
      });

      if (!generator) {
        generator = await prisma.generator.create({
          data: {
            stationId: station.id,
            name: `${station.name} Primary Genset #1`,
            capacity: 120,
            minimumOutput: 20,
            efficiency: 38.5,
            fuelType: 'diesel',
            fuelLevel: parseFloat(telemetry.generator.fuelLevel || 85),
            status: telemetry.generator.powerOutput > 0 ? 'RUNNING' : 'STANDBY',
          },
        });
      } else if (telemetry.generator.fuelLevel !== undefined) {
        await prisma.generator.update({
          where: { id: generator.id },
          data: {
            fuelLevel: parseFloat(telemetry.generator.fuelLevel),
            status:
              telemetry.generator.powerOutput > 0
                ? 'RUNNING'
                : telemetry.generator.status || generator.status,
          },
        });
      }

      results.generator = await prisma.generatorReading.create({
        data: {
          generatorId: generator.id,
          timestamp,
          powerOutput: parseFloat(telemetry.generator.powerOutput || 0),
          fuelConsumed: parseFloat(telemetry.generator.fuelConsumed || 0),
          efficiency: parseFloat(telemetry.generator.efficiency || 38.0),
          runtime: parseFloat(telemetry.generator.runtime || 1),
        },
      });
    }

    return {
      station: { id: station.id, code: station.code, name: station.name },
      timestamp,
      data: results,
    };
  }

  /**
   * Batch ingest rows parsed from CSV or JSON
   */
  async ingestBatch(stationIdentifier, datasetType, records) {
    const station = await stationService.getStationById(stationIdentifier);

    if (!Array.isArray(records) || records.length === 0) {
      throw ApiError.badRequest('Batch records must be a non-empty array', 'INVALID_BATCH');
    }

    let insertedCount = 0;

    switch (datasetType.toLowerCase()) {
      case 'weather': {
        const rows = records.map((r) => ({
          stationId: station.id,
          timestamp: r.timestamp ? new Date(r.timestamp) : new Date(),
          temperature: parseFloat(r.temperature || 0),
          pressure: parseFloat(r.pressure || 980),
          humidity: parseFloat(r.humidity || 60),
          windSpeed: parseFloat(r.windSpeed || 0),
          windDirection: String(r.windDirection || 'S'),
          solarRadiation: parseFloat(r.solarRadiation || 0),
        }));

        const res = await prisma.weatherData.createMany({ data: rows });
        insertedCount = res.count;
        break;
      }

      case 'energy':
      case 'load': {
        const rows = records.map((r) => {
          const totalLoad = parseFloat(r.totalLoad || 0);
          return {
            stationId: station.id,
            timestamp: r.timestamp ? new Date(r.timestamp) : new Date(),
            totalLoad,
            heatingLoad: parseFloat(r.heatingLoad !== undefined ? r.heatingLoad : totalLoad * 0.45),
            waterLoad: parseFloat(r.waterLoad !== undefined ? r.waterLoad : totalLoad * 0.18),
            communicationLoad: parseFloat(r.communicationLoad !== undefined ? r.communicationLoad : totalLoad * 0.1),
            laboratoryLoad: parseFloat(r.laboratoryLoad !== undefined ? r.laboratoryLoad : totalLoad * 0.15),
            refrigerationLoad: parseFloat(r.refrigerationLoad !== undefined ? r.refrigerationLoad : totalLoad * 0.08),
            flexibleLoad: parseFloat(r.flexibleLoad !== undefined ? r.flexibleLoad : totalLoad * 0.04),
          };
        });

        const res = await prisma.energyLoad.createMany({ data: rows });
        insertedCount = res.count;
        break;
      }

      case 'renewable': {
        const rows = records.map((r) => {
          const solarPower = parseFloat(r.solarPower || 0);
          const windPower = parseFloat(r.windPower || 0);
          const totalRenewable = parseFloat(
            r.totalRenewable !== undefined ? r.totalRenewable : solarPower + windPower
          );
          return {
            stationId: station.id,
            timestamp: r.timestamp ? new Date(r.timestamp) : new Date(),
            solarPower,
            windPower,
            totalRenewable,
          };
        });

        const res = await prisma.renewableGeneration.createMany({ data: rows });
        insertedCount = res.count;
        break;
      }

      default:
        throw ApiError.badRequest(
          `Unknown datasetType '${datasetType}'. Allowed: 'weather', 'energy', 'renewable'`,
          'INVALID_DATASET_TYPE'
        );
    }

    return {
      station: { id: station.id, code: station.code, name: station.name },
      datasetType,
      insertedCount,
    };
  }

  /**
   * Purges all telemetry readings for a given station (or all stations if empty)
   */
  async purgeTelemetry(stationIdentifier) {
    let whereStation = {};
    if (stationIdentifier && stationIdentifier !== 'all') {
      const station = await stationService.getStationById(stationIdentifier);
      whereStation = { stationId: station.id };
    }

    // Get matching generator & battery IDs
    const generators = await prisma.generator.findMany({
      where: whereStation,
      select: { id: true },
    });
    const genIds = generators.map((g) => g.id);

    const batteries = await prisma.battery.findMany({
      where: whereStation,
      select: { id: true },
    });
    const batIds = batteries.map((b) => b.id);

    const [w, e, r, g, b, a] = await Promise.all([
      prisma.weatherData.deleteMany({ where: whereStation }),
      prisma.energyLoad.deleteMany({ where: whereStation }),
      prisma.renewableGeneration.deleteMany({ where: whereStation }),
      genIds.length ? prisma.generatorReading.deleteMany({ where: { generatorId: { in: genIds } } }) : { count: 0 },
      batIds.length ? prisma.batteryReading.deleteMany({ where: { batteryId: { in: batIds } } }) : { count: 0 },
      prisma.alert.deleteMany({ where: whereStation }),
    ]);

    return {
      purged: {
        weather: w.count,
        energy: e.count,
        renewable: r.count,
        generatorReadings: g.count,
        batteryReadings: b.count,
        alerts: a.count,
      },
      message: 'Station telemetry purged successfully.',
    };
  }

  /**
   * Return telemetry record counts across the system
   */
  async getStatus(stationIdentifier) {
    let whereStation = {};
    if (stationIdentifier && stationIdentifier !== 'all') {
      const station = await stationService.getStationById(stationIdentifier);
      whereStation = { stationId: station.id };
    }

    const [stations, weather, energy, renewable, alerts] = await Promise.all([
      prisma.station.findMany({ select: { id: true, name: true, code: true } }),
      prisma.weatherData.count({ where: whereStation }),
      prisma.energyLoad.count({ where: whereStation }),
      prisma.renewableGeneration.count({ where: whereStation }),
      prisma.alert.count({ where: whereStation }),
    ]);

    return {
      stations,
      counts: {
        weather,
        energy,
        renewable,
        alerts,
        totalTelemetryRecords: weather + energy + renewable,
      },
    };
  }
}

module.exports = new IngestService();
