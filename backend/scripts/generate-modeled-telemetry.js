/**
 * Modeled Telemetry Generator & Physical Coupling Validator
 * 
 * Generates 30 days (720 hours: 2019-01-01 00:00 UTC -> 2019-01-30 23:00 UTC)
 * of physically coupled modeled microgrid operational telemetry for MAITRI Station:
 * 
 * 1. energy_loads (heating, water, comms, lab, cryo, flex, total)
 * 2. renewable_generation (solarPower, windPower, totalRenewable)
 * 3. battery_readings (soc, chargePower, dischargePower)
 * 4. generator_readings (powerOutput, fuelConsumed, efficiency, runtime)
 * 
 * SCIENTIFIC PROVENANCE:
 * - Meteorological drivers: Maitri 2019 AWS observation series (temperature, wind speed).
 * - Solar PV: IEC-61724-1 PV model derived from 1985–2000 Climatological normals.
 * - Wind: Aerodynamic piecewise turbine power curve (50 kW, 0.90 availability).
 * - BESS & Gensets: Deterministic dispatch matching physical energy balance.
 * - Explicitly labeled as MODELED / SCENARIO.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { prisma } = require('../src/config/database');

const MAITRI_CODE = 'MAITRI';
const CSV_REL_PATH = '../../ml-service/datasets/processed/weather/maitri_2019_hourly.csv';

// Wind turbine physical parameters
const WIND_CAPACITY_KW = 50.0;
const WIND_CUT_IN = 3.5;
const WIND_RATED = 12.0;
const WIND_CUT_OUT = 25.0;
const WIND_AVAILABILITY = 0.90;

// BESS parameters
const BESS_CAPACITY_KWH = 350.0;
const BESS_MIN_SOC = 20.0;
const BESS_MAX_SOC = 95.0;
const BESS_MAX_CHARGE_KW = 80.0;
const BESS_MAX_DISCHARGE_KW = 80.0;
const BESS_ROUND_TRIP_EFF = 0.95;

function computeWindPower(windSpeedMs) {
  if (windSpeedMs === null || windSpeedMs === undefined || isNaN(windSpeedMs)) return 0.0;
  const v = Math.max(0, parseFloat(windSpeedMs));
  if (v < WIND_CUT_IN || v >= WIND_CUT_OUT) return 0.0;
  if (v >= WIND_RATED) return parseFloat((WIND_CAPACITY_KW * WIND_AVAILABILITY).toFixed(2));
  const normalized = (v - WIND_CUT_IN) / (WIND_RATED - WIND_CUT_IN);
  const power = WIND_CAPACITY_KW * Math.pow(normalized, 3) * WIND_AVAILABILITY;
  return parseFloat(Math.min(WIND_CAPACITY_KW * WIND_AVAILABILITY, Math.max(0, power)).toFixed(2));
}

async function loadWeatherRows(maxHours = 720) {
  const csvPath = path.resolve(__dirname, CSV_REL_PATH);
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Weather CSV not found at: ${csvPath}`);
  }

  const rows = [];
  const fileStream = fs.createReadStream(csvPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let isHeader = true;
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (isHeader) {
      isHeader = false;
      continue;
    }
    const parts = trimmed.split(',');
    const tsStr = parts[0]?.trim();
    const temp = parseFloat(parts[1]);
    const humidity = parseFloat(parts[2]);
    const windDir = parseFloat(parts[3]);
    const windSpeed = parseFloat(parts[4]);
    const pressure = parseFloat(parts[5]);

    const isoStr = tsStr.includes('T') ? tsStr : `${tsStr.replace(' ', 'T')}Z`;
    const dateObj = new Date(isoStr);

    rows.push({
      timestamp: dateObj,
      temperature: isNaN(temp) ? -5.0 : temp,
      humidity: isNaN(humidity) ? 65.0 : humidity,
      windSpeed: isNaN(windSpeed) ? 5.0 : windSpeed,
      windDirection: isNaN(windDir) ? 120.0 : windDir,
      pressure: isNaN(pressure) ? 980.0 : pressure,
    });

    if (rows.length >= maxHours) break;
  }
  return rows;
}

async function generateModeledTelemetry(options = { dryRun: true }) {
  console.log('--- POLAR-EMS Modeled Telemetry Generator ---');
  console.log(`Dry Run Mode: ${options.dryRun ? 'YES (No DB Writes)' : 'NO (Writing to Database)'}\n`);

  // 1. Resolve Maitri Station
  const station = await prisma.station.findUnique({
    where: { code: MAITRI_CODE },
    include: {
      batteries: true,
      generators: { orderBy: { name: 'asc' } },
      pvConfig: true,
    },
  });

  if (!station) {
    throw new Error(`Maitri station '${MAITRI_CODE}' not found in database.`);
  }

  const primaryBattery = station.batteries[0];
  const primaryGen = station.generators.find((g) => g.name.includes('GEN-01')) || station.generators[0];
  const auxGen = station.generators.find((g) => g.name.includes('GEN-02')) || station.generators[1];

  console.log(`Station: ${station.name} (${station.id})`);
  console.log(`BESS Container: ${primaryBattery.name} (${primaryBattery.id}) [${primaryBattery.capacity} kWh]`);
  console.log(`Primary Genset: ${primaryGen.name} (${primaryGen.id}) [${primaryGen.capacity} kW]`);
  console.log(`Auxiliary Genset: ${auxGen?.name} (${auxGen?.id}) [${auxGen?.capacity} kW]\n`);

  // 2. Load 720 hours of 2019 AWS weather observations
  const weatherRows = await loadWeatherRows(720);
  console.log(`Loaded ${weatherRows.length} meteorological observation hours (Start: ${weatherRows[0].timestamp.toISOString()} -> End: ${weatherRows[weatherRows.length - 1].timestamp.toISOString()})`);

  // 3. Query existing modeled solar generation records for matching timestamps
  const startDate = weatherRows[0].timestamp;
  const endDate = weatherRows[weatherRows.length - 1].timestamp;

  const solarRecords = await prisma.solarGenerationHistory.findMany({
    where: {
      stationId: station.id,
      timestamp: { gte: startDate, lte: endDate },
    },
    orderBy: { timestamp: 'asc' },
  });

  const solarMap = new Map();
  for (const s of solarRecords) {
    solarMap.set(s.timestamp.toISOString(), s.solarPowerKW || 0.0);
  }
  console.log(`Mapped ${solarRecords.length} historical solar generation estimates from database.\n`);

  // 4. Generate Coupled Hourly Telemetry
  let currentSoc = 75.0; // Start at 75% SOC
  let balanceErrors = 0;
  let maxBalanceError = 0;

  const energyLoadRecords = [];
  const renewableRecords = [];
  const batteryRecords = [];
  const gen1Records = [];
  const gen2Records = [];

  for (let i = 0; i < weatherRows.length; i++) {
    const w = weatherRows[i];
    const tsIso = w.timestamp.toISOString();
    const hour = w.timestamp.getUTCHours();

    // A. Solar & Wind Generation
    const solarKw = solarMap.has(tsIso) ? solarMap.get(tsIso) : 0.0;
    const windKw = computeWindPower(w.windSpeed);
    const totalRenewableKw = parseFloat((solarKw + windKw).toFixed(2));

    // B. Subsystem Loads
    const heatingKw = parseFloat((24.0 + Math.max(0, -w.temperature * 0.55) + 1.8 * Math.cos((2 * Math.PI * (hour - 14)) / 24)).toFixed(2));
    const waterKw = parseFloat((hour >= 8 && hour <= 18 ? 12.5 + 2.0 * Math.sin((Math.PI * (hour - 8)) / 10) : 4.0).toFixed(2));
    const commsKw = parseFloat((6.0 + ([0, 6, 12, 18].includes(hour) ? 1.5 : 0.4 * Math.sin((2 * Math.PI * hour) / 24))).toFixed(2));
    const labKw = parseFloat((hour >= 7 && hour <= 20 ? 14.0 + 1.5 * Math.cos((Math.PI * (hour - 13)) / 8) : 6.0).toFixed(2));
    const refrigKw = parseFloat((4.8 + 0.4 * Math.sin((4 * Math.PI * hour) / 24)).toFixed(2));
    const flexKw = parseFloat((hour >= 10 && hour <= 16 ? 3.5 : 1.0).toFixed(2));
    const totalLoadKw = parseFloat((heatingKw + waterKw + commsKw + labKw + refrigKw + flexKw).toFixed(2));

    // C. Microgrid Dispatch
    const netDeficit = totalLoadKw - totalRenewableKw;
    let chargeKw = 0.0;
    let dischargeKw = 0.0;
    let gen1Kw = 0.0;
    let gen2Kw = 0.0;

    if (netDeficit <= 0) {
      // Surplus renewable power
      const surplus = -netDeficit;
      const roomInBat = Math.max(0, (BESS_MAX_SOC - currentSoc) * BESS_CAPACITY_KWH / 100.0);
      chargeKw = Math.min(surplus, BESS_MAX_CHARGE_KW, roomInBat / BESS_ROUND_TRIP_EFF);
      chargeKw = parseFloat(chargeKw.toFixed(2));
      dischargeKw = 0.0;
      gen1Kw = 0.0;
      gen2Kw = 0.0;

      // Update SOC
      currentSoc += (chargeKw * BESS_ROUND_TRIP_EFF / BESS_CAPACITY_KWH) * 100.0;
    } else {
      // Deficit
      const energyInBat = Math.max(0, (currentSoc - BESS_MIN_SOC) * BESS_CAPACITY_KWH / 100.0);
      const maxDischargePossible = Math.min(BESS_MAX_DISCHARGE_KW, energyInBat * BESS_ROUND_TRIP_EFF);

      if (currentSoc > 25.0 && maxDischargePossible >= netDeficit) {
        // Battery covers entire deficit
        dischargeKw = parseFloat(netDeficit.toFixed(2));
        chargeKw = 0.0;
        gen1Kw = 0.0;
        gen2Kw = 0.0;
        currentSoc -= (dischargeKw / (BESS_ROUND_TRIP_EFF * BESS_CAPACITY_KWH)) * 100.0;
      } else {
        // Battery covers partial deficit, genset covers rest
        if (currentSoc > 25.0 && maxDischargePossible > 0) {
          dischargeKw = parseFloat(Math.min(maxDischargePossible, netDeficit * 0.5).toFixed(2));
          currentSoc -= (dischargeKw / (BESS_ROUND_TRIP_EFF * BESS_CAPACITY_KWH)) * 100.0;
        } else {
          dischargeKw = 0.0;
        }

        const remDeficit = netDeficit - dischargeKw;
        if (remDeficit <= primaryGen.capacity) {
          gen1Kw = parseFloat(Math.max(primaryGen.minimumOutput, remDeficit).toFixed(2));
          if (gen1Kw > remDeficit) {
            // Surplus from min genset output charges battery
            const genSurplus = gen1Kw - remDeficit;
            chargeKw = parseFloat(Math.min(genSurplus, BESS_MAX_CHARGE_KW).toFixed(2));
            currentSoc += (chargeKw * BESS_ROUND_TRIP_EFF / BESS_CAPACITY_KWH) * 100.0;
          }
          gen2Kw = 0.0;
        } else {
          gen1Kw = primaryGen.capacity;
          gen2Kw = parseFloat(Math.min(auxGen?.capacity || 80.0, remDeficit - primaryGen.capacity).toFixed(2));
        }
      }
    }

    currentSoc = parseFloat(Math.min(BESS_MAX_SOC, Math.max(BESS_MIN_SOC, currentSoc)).toFixed(2));

    // D. Energy Balance Verification
    const totalGen = parseFloat((totalRenewableKw + gen1Kw + gen2Kw + dischargeKw - chargeKw).toFixed(2));
    const err = Math.abs(totalGen - totalLoadKw);
    if (err > maxBalanceError) maxBalanceError = err;
    if (err > 0.05) balanceErrors++;

    // E. Fuel & Efficiency
    const gen1FuelRate = gen1Kw > 0 ? (0.05 * primaryGen.capacity + 0.22 * gen1Kw) : 0.0;
    const gen1Efficiency = gen1Kw > 0 ? primaryGen.efficiency * (0.88 + 0.12 * (gen1Kw / primaryGen.capacity)) : primaryGen.efficiency;

    const gen2FuelRate = gen2Kw > 0 ? (0.05 * (auxGen?.capacity || 80) + 0.22 * gen2Kw) : 0.0;
    const gen2Efficiency = gen2Kw > 0 ? (auxGen?.efficiency || 38) * (0.88 + 0.12 * (gen2Kw / (auxGen?.capacity || 80))) : (auxGen?.efficiency || 38);

    // Build data objects
    energyLoadRecords.push({
      stationId: station.id,
      timestamp: w.timestamp,
      totalLoad: totalLoadKw,
      heatingLoad: heatingKw,
      waterLoad: waterKw,
      communicationLoad: commsKw,
      laboratoryLoad: labKw,
      refrigerationLoad: refrigKw,
      flexibleLoad: flexKw,
    });

    renewableRecords.push({
      stationId: station.id,
      timestamp: w.timestamp,
      solarPower: solarKw,
      windPower: windKw,
      totalRenewable: totalRenewableKw,
    });

    batteryRecords.push({
      batteryId: primaryBattery.id,
      timestamp: w.timestamp,
      soc: currentSoc,
      chargePower: chargeKw,
      dischargePower: dischargeKw,
    });

    gen1Records.push({
      generatorId: primaryGen.id,
      timestamp: w.timestamp,
      powerOutput: gen1Kw,
      fuelConsumed: parseFloat(gen1FuelRate.toFixed(2)),
      efficiency: parseFloat(gen1Efficiency.toFixed(2)),
      runtime: gen1Kw > 0 ? 60.0 : 0.0,
    });

    if (auxGen) {
      gen2Records.push({
        generatorId: auxGen.id,
        timestamp: w.timestamp,
        powerOutput: gen2Kw,
        fuelConsumed: parseFloat(gen2FuelRate.toFixed(2)),
        efficiency: parseFloat(gen2Efficiency.toFixed(2)),
        runtime: gen2Kw > 0 ? 60.0 : 0.0,
      });
    }
  }

  console.log('--- Physical Balance & Integrity Verification ---');
  console.log(`Total Hours Processed:  ${weatherRows.length}`);
  console.log(`Max Energy Balance Err: ${maxBalanceError.toFixed(4)} kW`);
  console.log(`Balance Outliers (>50W): ${balanceErrors}`);
  console.log(`Final Battery SOC:      ${currentSoc.toFixed(1)}% (Range: 20% - 95%)`);

  // Sample 3 representative hours
  console.log('\n--- Sample Records (Austral Summer Daytime vs Night vs High Wind) ---');
  for (const idx of [12, 23, 150]) {
    const el = energyLoadRecords[idx];
    const rn = renewableRecords[idx];
    const bt = batteryRecords[idx];
    const g1 = gen1Records[idx];
    console.log(`[Hour ${idx}] ${el.timestamp.toISOString()}`);
    console.log(`   Load: ${el.totalLoad} kW (Heat: ${el.heatingLoad}, Water: ${el.waterLoad}, Comms: ${el.communicationLoad}, Lab: ${el.laboratoryLoad})`);
    console.log(`   Renewable: ${rn.totalRenewable} kW (Solar: ${rn.solarPower} kW, Wind: ${rn.windPower} kW)`);
    console.log(`   BESS: SOC ${bt.soc}%, Charge: ${bt.chargePower} kW, Discharge: ${bt.dischargePower} kW`);
    console.log(`   GEN-01: ${g1.powerOutput} kW, Fuel: ${g1.fuelConsumed} L/h, Efficiency: ${g1.efficiency}%`);
  }

  if (!options.dryRun) {
    console.log('\n💾 Inserting records into PostgreSQL...');

    // Clean any prior 2019 generated records for this station to allow clean idempotency
    await prisma.energyLoad.deleteMany({
      where: { stationId: station.id, timestamp: { gte: startDate, lte: endDate } },
    });
    await prisma.renewableGeneration.deleteMany({
      where: { stationId: station.id, timestamp: { gte: startDate, lte: endDate } },
    });
    await prisma.batteryReading.deleteMany({
      where: { batteryId: primaryBattery.id, timestamp: { gte: startDate, lte: endDate } },
    });
    await prisma.generatorReading.deleteMany({
      where: { generatorId: primaryGen.id, timestamp: { gte: startDate, lte: endDate } },
    });
    if (auxGen) {
      await prisma.generatorReading.deleteMany({
        where: { generatorId: auxGen.id, timestamp: { gte: startDate, lte: endDate } },
      });
    }

    const [eRes, rRes, bRes, g1Res, g2Res] = await Promise.all([
      prisma.energyLoad.createMany({ data: energyLoadRecords }),
      prisma.renewableGeneration.createMany({ data: renewableRecords }),
      prisma.batteryReading.createMany({ data: batteryRecords }),
      prisma.generatorReading.createMany({ data: gen1Records }),
      auxGen ? prisma.generatorReading.createMany({ data: gen2Records }) : Promise.resolve({ count: 0 }),
    ]);

    console.log(`   ✓ Inserted ${eRes.count} records into energy_loads`);
    console.log(`   ✓ Inserted ${rRes.count} records into renewable_generation`);
    console.log(`   ✓ Inserted ${bRes.count} records into battery_readings`);
    console.log(`   ✓ Inserted ${g1Res.count} records into generator_readings (GEN-01)`);
    if (auxGen) {
      console.log(`   ✓ Inserted ${g2Res.count} records into generator_readings (GEN-02)`);
    }

    // Sync latest state on battery and generators
    const lastBat = batteryRecords[batteryRecords.length - 1];
    await prisma.battery.update({
      where: { id: primaryBattery.id },
      data: {
        currentSOC: lastBat.soc,
        status: lastBat.chargePower > 0 ? 'CHARGING' : lastBat.dischargePower > 0 ? 'DISCHARGING' : 'IDLE',
      },
    });

    console.log('\n✅ Modeled Telemetry Generation & Seeding Complete!');
  }

  return {
    hoursGenerated: weatherRows.length,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    energyLoadsCount: energyLoadRecords.length,
    renewableCount: renewableRecords.length,
    batteryReadingsCount: batteryRecords.length,
    generatorReadingsCount: gen1Records.length + (auxGen ? gen2Records.length : 0),
    maxBalanceError,
  };
}

module.exports = {
  generateModeledTelemetry,
};

if (require.main === module) {
  const isLive = process.argv.includes('--live') || process.argv.includes('--write');
  generateModeledTelemetry({ dryRun: !isLive })
    .catch((err) => {
      console.error('Fatal error generating modeled telemetry:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
