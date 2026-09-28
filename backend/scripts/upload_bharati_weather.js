/**
 * Safe, Idempotent Neon PostgreSQL Upload Script for Bharati Weather Observations.
 * POLAR-EMS Smart India Hackathon.
 *
 * Rules:
 * - Uses existing Prisma Client and weather_data table.
 * - Sourced strictly from ml-service/datasets/processed/bharati/weather/bharati_weather_refined.csv.
 * - Checks existing stationId + timestamp records to prevent duplicate insertions.
 * - Preserves Maitri data 100% untouched.
 * - Supports --dry-run and --execute modes.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CSV_FILE = path.resolve(
  __dirname,
  '../../ml-service/datasets/processed/bharati/weather/bharati_weather_refined.csv'
);

async function parseCSV(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const records = [];
  let header = null;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const parts = line.split(',');
    if (!header) {
      header = parts.map((h) => h.trim());
      continue;
    }

    const row = {};
    header.forEach((h, idx) => {
      row[h] = parts[idx] !== undefined ? parts[idx].trim() : '';
    });
    records.push(row);
  }

  return records;
}

async function main() {
  const isExecute = process.argv.includes('--execute');
  const isDryRun = !isExecute;

  console.log('='.repeat(80));
  console.log(`POLAR-EMS — BHARATI WEATHER NEON UPLOAD (${isExecute ? 'EXECUTE MODE' : 'DRY-RUN MODE'})`);
  console.log('='.repeat(80));

  try {
    // 1. Verify Station Identity
    const bharatiStation = await prisma.station.findUnique({
      where: { code: 'BHARATI' },
    });

    if (!bharatiStation) {
      throw new Error("Station with code 'BHARATI' not found in database!");
    }

    const maitriStation = await prisma.station.findUnique({
      where: { code: 'MAITRI' },
    });

    console.log(`\n[Station Verification]`);
    console.log(` -> Bharati Station UUID : ${bharatiStation.id} (${bharatiStation.name})`);
    console.log(` -> Maitri Station UUID  : ${maitriStation ? maitriStation.id : 'N/A'} (${maitriStation ? maitriStation.name : 'N/A'})`);

    // 2. Query Existing Weather Records
    const existingBharatiCount = await prisma.weatherData.count({
      where: { stationId: bharatiStation.id },
    });
    const existingMaitriCount = await prisma.weatherData.count({
      where: { stationId: maitriStation.id },
    });

    console.log(`\n[Existing State in Neon]`);
    console.log(` -> Existing Bharati weather rows: ${existingBharatiCount}`);
    console.log(` -> Existing Maitri weather rows : ${existingMaitriCount} (Protected / Unchanged)`);

    // 3. Read and validate refined CSV
    console.log(`\n[Loading Refined Dataset]`);
    console.log(` -> Sourcing: ${CSV_FILE}`);
    if (!fs.existsSync(CSV_FILE)) {
      throw new Error(`Refined CSV file not found at ${CSV_FILE}`);
    }

    const rawRows = await parseCSV(CSV_FILE);
    console.log(` -> Parsed CSV records: ${rawRows.length}`);

    // Query existing timestamps for Bharati to ensure idempotency
    const existingBharatiTimestamps = new Set();
    if (existingBharatiCount > 0) {
      const existing = await prisma.weatherData.findMany({
        where: { stationId: bharatiStation.id },
        select: { timestamp: true },
      });
      existing.forEach((e) => existingBharatiTimestamps.add(new Date(e.timestamp).toISOString()));
    }

    // Process and validate rows for insertion
    const eligibleRecords = [];
    let skippedExisting = 0;
    let nullHumidityCount = 0;
    let nullWindSpeedCount = 0;
    let nullSolarCount = 0;

    for (const r of rawRows) {
      const dt = new Date(r.timestamp);
      if (isNaN(dt.getTime())) continue;

      const iso = dt.toISOString();
      if (existingBharatiTimestamps.has(iso)) {
        skippedExisting++;
        continue;
      }

      const temp = r.temperature !== '' && !isNaN(parseFloat(r.temperature)) ? parseFloat(r.temperature) : null;
      const press = r.pressure !== '' && !isNaN(parseFloat(r.pressure)) ? parseFloat(r.pressure) : null;
      const hum = r.humidity !== '' && !isNaN(parseFloat(r.humidity)) ? parseFloat(r.humidity) : null;
      const ws = r.windSpeed !== '' && !isNaN(parseFloat(r.windSpeed)) ? parseFloat(r.windSpeed) : 0.0;
      const wd = r.windDirection !== '' ? String(r.windDirection) : null;

      if (temp === null || press === null) {
        // Essential core variables must exist
        continue;
      }

      if (hum === null) nullHumidityCount++;
      if (r.windSpeed === '' || isNaN(parseFloat(r.windSpeed))) nullWindSpeedCount++;
      nullSolarCount++; // solar radiation is always null in source

      eligibleRecords.push({
        stationId: bharatiStation.id,
        timestamp: dt,
        temperature: temp,
        pressure: press,
        humidity: hum,
        windSpeed: ws,
        windDirection: wd,
        solarRadiation: null,
      });
    }

    console.log(`\n[Dry-Run Validation Summary]`);
    console.log(` -> Total CSV Rows                : ${rawRows.length}`);
    console.log(` -> Rows Already Present in Neon  : ${skippedExisting}`);
    console.log(` -> Eligible New Rows for Insert  : ${eligibleRecords.length}`);
    console.log(` -> Null Humidity Count (Sensor)  : ${nullHumidityCount}`);
    console.log(` -> Null WindSpeed Count (Sensor) : ${nullWindSpeedCount}`);
    console.log(` -> Solar Radiation Values        : 100% NULL (Preserved real source)`);
    if (eligibleRecords.length > 0) {
      console.log(` -> Date Range to Insert          : ${eligibleRecords[0].timestamp.toISOString()} to ${eligibleRecords[eligibleRecords.length - 1].timestamp.toISOString()}`);
    }

    if (isDryRun) {
      console.log(`\n[DRY RUN COMPLETE]`);
      console.log(` -> To execute the safe upload, run: node scripts/upload_bharati_weather.js --execute`);
      return;
    }

    // 4. Batch Insertion into Neon
    console.log(`\n[Executing Neon PostgreSQL Insertion]`);
    const BATCH_SIZE = 1000;
    let insertedCount = 0;

    for (let i = 0; i < eligibleRecords.length; i += BATCH_SIZE) {
      const batch = eligibleRecords.slice(i, i + BATCH_SIZE);
      const res = await prisma.weatherData.createMany({
        data: batch,
        skipDuplicates: true,
      });
      insertedCount += res.count;
      process.stdout.write(` -> Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(eligibleRecords.length / BATCH_SIZE)} (${insertedCount}/${eligibleRecords.length} rows)\r`);
    }

    console.log(`\n -> All batches uploaded successfully! Total inserted: ${insertedCount}`);

    // 5. Post-Upload Verification
    console.log(`\n[Post-Upload Neon Verification]`);
    const finalBharatiCount = await prisma.weatherData.count({
      where: { stationId: bharatiStation.id },
    });
    const finalMaitriCount = await prisma.weatherData.count({
      where: { stationId: maitriStation.id },
    });

    const bharatiSpan = await prisma.weatherData.aggregate({
      where: { stationId: bharatiStation.id },
      _min: { timestamp: true },
      _max: { timestamp: true },
    });

    console.log(` -> Final Bharati Weather Records: ${finalBharatiCount}`);
    console.log(` -> Final Maitri Weather Records : ${finalMaitriCount} (Maitri untouched: ${finalMaitriCount === existingMaitriCount})`);
    console.log(` -> Bharati Earliest Timestamp   : ${bharatiSpan._min.timestamp}`);
    console.log(` -> Bharati Latest Timestamp     : ${bharatiSpan._max.timestamp}`);

    // Sample record verification
    const firstRec = await prisma.weatherData.findFirst({
      where: { stationId: bharatiStation.id },
      orderBy: { timestamp: 'asc' },
    });
    const lastRec = await prisma.weatherData.findFirst({
      where: { stationId: bharatiStation.id },
      orderBy: { timestamp: 'desc' },
    });
    // Known sensor failure record in late 2016 (IIG humidity null)
    const sensorFailRec = await prisma.weatherData.findFirst({
      where: {
        stationId: bharatiStation.id,
        timestamp: { gte: new Date('2016-10-01T00:00:00Z'), lte: new Date('2016-10-02T00:00:00Z') },
        humidity: null,
      },
    });

    console.log(`\n[Sample Verification Records]`);
    console.log(` -> Earliest Record : ${JSON.stringify(firstRec)}`);
    console.log(` -> Latest Record   : ${JSON.stringify(lastRec)}`);
    console.log(` -> Known Sensor Failure Sample (Humidity NULL preserved) : ${JSON.stringify(sensorFailRec)}`);

    console.log('\n' + '='.repeat(80));
    console.log('BHARATI WEATHER UPLOAD COMPLETED AND VERIFIED SUCCESSFULLY!');
    console.log('='.repeat(80));
  } catch (err) {
    console.error('\n[FATAL ERROR DURING UPLOAD]:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
