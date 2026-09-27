/**
 * POLAR-EMS Maitri Weather Data Importer
 * 
 * Target: Prisma model `WeatherData`
 * Target Station: `Station.code = "MAITRI"`
 * 
 * Dataset columns in exact order:
 * 1. timestamp
 * 2. temperature
 * 3. pressure
 * 4. windSpeed
 * 5. windDirection
 * 6. humidity
 * 
 * Rules:
 * - '-999' means missing data and becomes null.
 * - 'solarRadiation' is set to null (no solar radiation column in this dataset).
 * - Existing records are preserved (idempotent matching on stationId + timestamp).
 * - Database is NEVER reset.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Candidate paths for the weather dataset
function resolveDatasetPath() {
  if (process.argv[2]) {
    const customPath = path.resolve(process.cwd(), process.argv[2]);
    if (fs.existsSync(customPath)) return customPath;
    console.warn(`[WARN] Specified path '${process.argv[2]}' not found. Searching standard locations...`);
  }

  const candidates = [
    path.resolve(__dirname, '../../imd_maitri(2).txt'),
    path.resolve(process.cwd(), 'imd_maitri(2).txt'),
    path.resolve(process.cwd(), '../imd_maitri(2).txt'),
    path.resolve(__dirname, '../data/imd_maitri(2).txt'),
    path.resolve(__dirname, '../../ml-service/datasets/raw/maitri/1985-2016/imd_maitri.txt'),
    path.resolve(process.cwd(), 'imd_maitri.txt'),
    path.resolve(process.cwd(), '../imd_maitri.txt'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0]; // default expected location
}

async function importMaitriWeather() {
  const filePath = resolveDatasetPath();

  console.log('====================================================');
  console.log(' POLAR-EMS — Historical Maitri Weather Importer');
  console.log('====================================================');
  console.log(`[FILE] Target dataset file: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`\n[ERROR] Dataset file not found at: ${filePath}`);
    console.error(`Please place 'imd_maitri(2).txt' in the project root or pass the path as an argument:`);
    console.error(`  node scripts/import-maitri-weather.js <path_to_file>\n`);
    process.exit(1);
  }

  // 1. Find MAITRI station in PostgreSQL
  const station = await prisma.station.findUnique({
    where: { code: 'MAITRI' },
  });

  if (!station) {
    console.error(`\n[ERROR] Station with code 'MAITRI' was not found in PostgreSQL.`);
    console.error(`Please ensure stations are seeded before importing historical weather data.\n`);
    process.exit(1);
  }

  console.log(`[STATION] Found target station: ${station.name} (${station.id}, code: ${station.code})`);

  // 2. Pre-fetch existing timestamps for this station to ensure fast, idempotent skip checks
  console.log(`[SYNC] Querying existing weather timestamps for station ${station.code}...`);
  const existingReadings = await prisma.weatherData.findMany({
    where: { stationId: station.id },
    select: { timestamp: true },
  });

  const existingTimestamps = new Set(
    existingReadings.map((r) => r.timestamp.getTime())
  );
  console.log(`[SYNC] Found ${existingTimestamps.size} existing observation(s) in database.\n`);

  // Statistics counters
  let totalRowsRead = 0;
  let rowsInserted = 0;
  let rowsSkippedExisting = 0;
  let rowsSkippedInvalid = 0;
  let missingHumidityCount = 0;
  let missingWindDirectionCount = 0;

  // 3. Stream file line by line
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const recordsToInsert = [];
  const BATCH_SIZE = 500;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    totalRowsRead++;

    // Split CSV columns: timestamp, temperature, pressure, windSpeed, windDirection, humidity
    const parts = trimmed.split(',').map((p) => p.trim());

    if (parts.length < 4) {
      rowsSkippedInvalid++;
      continue;
    }

    // Skip possible header line
    if (parts[0].toLowerCase().includes('timestamp') || parts[0].toLowerCase().includes('date')) {
      totalRowsRead--; // Do not count header in data rows
      continue;
    }

    // Parse timestamp (explicitly in UTC to preserve literal source clock times)
    const rawTimestamp = parts[0];
    let isoTimestamp = rawTimestamp.trim().replace(' ', 'T');
    if (!isoTimestamp.endsWith('Z') && !isoTimestamp.includes('+')) {
      isoTimestamp += 'Z';
    }
    const timestampDate = new Date(isoTimestamp);
    if (isNaN(timestampDate.getTime())) {
      rowsSkippedInvalid++;
      continue;
    }

    // Check idempotency: skip if observation at this timestamp already exists
    if (existingTimestamps.has(timestampDate.getTime())) {
      rowsSkippedExisting++;
      continue;
    }

    // Parse Temperature (Float)
    const rawTemp = parseFloat(parts[1]);
    if (isNaN(rawTemp) || rawTemp === -999) {
      rowsSkippedInvalid++;
      continue;
    }

    // Parse Pressure (Float)
    const rawPressure = parseFloat(parts[2]);
    if (isNaN(rawPressure) || rawPressure === -999) {
      rowsSkippedInvalid++;
      continue;
    }

    // Parse Wind Speed (Float)
    const rawWindSpeed = parseFloat(parts[3]);
    if (isNaN(rawWindSpeed) || rawWindSpeed === -999) {
      rowsSkippedInvalid++;
      continue;
    }

    // Parse Wind Direction (String?): '-999' or empty => null
    let windDirection = null;
    if (parts[4] !== undefined && parts[4] !== '' && parts[4] !== '-999' && parts[4] !== '-999.0') {
      windDirection = String(parts[4]);
    } else {
      missingWindDirectionCount++;
    }

    // Parse Humidity (Float?): '-999' or empty => null
    let humidity = null;
    if (parts[5] !== undefined && parts[5] !== '' && parts[5] !== '-999' && parts[5] !== '-999.0') {
      const parsedHum = parseFloat(parts[5]);
      if (!isNaN(parsedHum) && parsedHum !== -999) {
        humidity = parsedHum;
      } else {
        missingHumidityCount++;
      }
    } else {
      missingHumidityCount++;
    }

    // Prepare WeatherData record (solarRadiation strictly null as per dataset specifications)
    const record = {
      stationId: station.id,
      timestamp: timestampDate,
      temperature: rawTemp,
      pressure: rawPressure,
      windSpeed: rawWindSpeed,
      windDirection,
      humidity,
      solarRadiation: null,
    };

    recordsToInsert.push(record);
    existingTimestamps.add(timestampDate.getTime()); // prevent intra-file duplicates

    // Batch insertion
    if (recordsToInsert.length >= BATCH_SIZE) {
      const batch = recordsToInsert.splice(0, BATCH_SIZE);
      await prisma.weatherData.createMany({
        data: batch,
      });
      rowsInserted += batch.length;
      process.stdout.write(`\r[PROGRESS] Inserted ${rowsInserted} records...`);
    }
  }

  // Insert remaining records in batch
  if (recordsToInsert.length > 0) {
    const batch = recordsToInsert.splice(0, recordsToInsert.length);
    await prisma.weatherData.createMany({
      data: batch,
    });
    rowsInserted += batch.length;
  }

  console.log(`\n\n====================================================`);
  console.log(` IMPORT SUMMARY — MAITRI HISTORICAL WEATHER`);
  console.log(`====================================================`);
  console.log(`• Total rows read:                       ${totalRowsRead}`);
  console.log(`• Rows successfully inserted:            ${rowsInserted}`);
  console.log(`• Rows skipped (already existed in DB):  ${rowsSkippedExisting}`);
  console.log(`• Rows skipped (invalid / malformed):    ${rowsSkippedInvalid}`);
  console.log(`• Missing humidity values (stored NULL): ${missingHumidityCount}`);
  console.log(`• Missing wind-dir values (stored NULL): ${missingWindDirectionCount}`);
  console.log(`• Solar radiation field:                 Set to NULL (not in dataset)`);
  console.log(`====================================================\n`);
}

// Execute importer if run directly
if (require.main === module) {
  importMaitriWeather()
    .catch((err) => {
      console.error('[FATAL] Weather import failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { importMaitriWeather, resolveDatasetPath };
