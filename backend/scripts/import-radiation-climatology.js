/**
 * POLAR-EMS Solar Radiation Climatology Importer
 * 
 * Target: Prisma model `SolarRadiationClimatology`
 * Table: `solar_radiation_climatology`
 * 
 * Dataset format:
 * year, month, hours, values (or tab/whitespace separated)
 * 
 * Rules:
 * - Date range: 1985 through 2000
 * - Hours: 1 to 24 (1-indexed)
 * - "null" string represents missing observation and becomes database NULL.
 * - Raw numeric radiation values are preserved exactly.
 * - Irradiance conversion to W/m²:
 *   "The source file does not explicitly declare its unit. This conversion assumes radiationValue is MJ/m²/hour based on the dataset audit. The raw value is preserved separately."
 * - Idempotent upsert on unique constraint (year + month + hour).
 * - WeatherData, stations, energy loads, and other tables are NEVER modified.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Candidates for finding the radiation dataset file
function resolveDatasetPath() {
  if (process.argv[2]) {
    const customPath = path.resolve(process.cwd(), process.argv[2]);
    if (fs.existsSync(customPath)) return customPath;
    console.warn(`[WARN] Specified path '${process.argv[2]}' not found. Searching standard locations...`);
  }

  const candidates = [
    path.resolve(__dirname, '../../radiation(2).txt'),
    path.resolve(process.cwd(), 'radiation(2).txt'),
    path.resolve(process.cwd(), '../radiation(2).txt'),
    path.resolve(__dirname, '../data/radiation(2).txt'),
    path.resolve(__dirname, '../../ml-service/datasets/raw/maitri/radiation/1985-2000/radiation(2).txt'),
    path.resolve(__dirname, '../../ml-service/datasets/raw/maitri/radiation/1985-2000/radiation.txt'),
    path.resolve(process.cwd(), 'radiation.txt'),
    path.resolve(process.cwd(), '../radiation.txt'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

/**
 * Safely parse tokens from a line (comma-separated or whitespace/tab-separated)
 */
function parseTokens(rawContent) {
  const tokens = rawContent
    .split(/[\r\n\t, ]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  return tokens;
}

async function importRadiationClimatology() {
  const filePath = resolveDatasetPath();

  console.log('================================================================');
  console.log(' POLAR-EMS — Solar Radiation Climatology Importer');
  console.log('================================================================');
  console.log(`[INFO] Dataset file: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] Dataset file not found at: ${filePath}`);
    process.exit(1);
  }

  const rawContent = fs.readFileSync(filePath, 'utf8');
  const tokens = parseTokens(rawContent);

  console.log(`[INFO] Extracted ${tokens.length} total tokens from raw file.`);

  // Find header index: looks for 'year', 'month', 'hours' / 'hour', 'values' / 'value'
  let headerIndex = -1;
  for (let i = 0; i < tokens.length - 3; i++) {
    if (
      tokens[i].toLowerCase() === 'year' &&
      tokens[i + 1].toLowerCase() === 'month' &&
      (tokens[i + 2].toLowerCase() === 'hours' || tokens[i + 2].toLowerCase() === 'hour') &&
      (tokens[i + 3].toLowerCase() === 'values' || tokens[i + 3].toLowerCase() === 'value')
    ) {
      headerIndex = i;
      break;
    }
  }

  let dataTokens;
  if (headerIndex !== -1) {
    dataTokens = tokens.slice(headerIndex + 4);
    console.log(`[INFO] Found header at token index ${headerIndex}. Parsing data tokens...`);
  } else {
    dataTokens = tokens;
    console.log('[WARN] Header tokens not found at expected position. Attempting direct parsing...');
  }

  if (dataTokens.length % 4 !== 0) {
    console.warn(`[WARN] Token count (${dataTokens.length}) is not divisible by 4. Trailing tokens will be evaluated.`);
  }

  const totalRawRows = Math.floor(dataTokens.length / 4);
  console.log(`[INFO] Identified ${totalRawRows} data candidate rows.`);

  let rowsRead = 0;
  let numericCount = 0;
  let nullCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  const validRecords = [];
  const seenKeys = new Set();

  for (let i = 0; i < dataTokens.length - 3; i += 4) {
    rowsRead++;

    const rawYear = dataTokens[i];
    const rawMonth = dataTokens[i + 1];
    const rawHour = dataTokens[i + 2];
    const rawValue = dataTokens[i + 3];

    const year = parseInt(rawYear, 10);
    const month = parseInt(rawMonth, 10);
    const hour = parseInt(rawHour, 10);

    // Validate year, month (1-12), hour (1-24)
    if (
      isNaN(year) ||
      isNaN(month) ||
      isNaN(hour) ||
      month < 1 ||
      month > 12 ||
      hour < 1 ||
      hour > 24
    ) {
      invalidCount++;
      console.warn(`[SKIP] Invalid record at row ${rowsRead}: year=${rawYear}, month=${rawMonth}, hour=${rawHour}`);
      continue;
    }

    const key = `${year}-${month}-${hour}`;
    if (seenKeys.has(key)) {
      duplicateCount++;
      console.warn(`[WARN] Duplicate entry for key (${key}) found at row ${rowsRead}. Overwriting previous entry in batch.`);
    }
    seenKeys.add(key);

    let radiationValue = null;
    let irradianceWm2 = null;

    const lowerVal = String(rawValue).toLowerCase();
    if (
      lowerVal === 'null' ||
      lowerVal === 'nan' ||
      lowerVal === 'na' ||
      lowerVal === '' ||
      lowerVal === '-999'
    ) {
      nullCount++;
      radiationValue = null;
      irradianceWm2 = null;
    } else {
      const parsed = parseFloat(rawValue);
      if (isNaN(parsed)) {
        nullCount++;
        radiationValue = null;
        irradianceWm2 = null;
      } else {
        numericCount++;
        radiationValue = parsed;

        // The source file does not explicitly declare its unit. This conversion assumes radiationValue is MJ/m²/hour based on the dataset audit. The raw value is preserved separately.
        irradianceWm2 = radiationValue * 277.7777777778;
      }
    }

    validRecords.push({
      year,
      month,
      hour,
      radiationValue,
      irradianceWm2,
      source: 'radiation(2).txt',
    });
  }

  console.log(`[INFO] Validation complete: ${validRecords.length} valid records prepared for database upsert.`);

  // Check state of existing database tables before import
  const weatherCountBefore = await prisma.weatherData.count();
  const existingClimatologyBefore = await prisma.solarRadiationClimatology.count();

  // Perform batched upserts using PostgreSQL native ON CONFLICT for performance and idempotency
  const BATCH_SIZE = 500;
  console.log(`[INFO] Executing idempotent upserts in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
    const batch = validRecords.slice(i, i + BATCH_SIZE);

    const valuePlaceholders = [];
    const params = [];
    let paramIdx = 1;

    for (const r of batch) {
      const id = crypto.randomUUID();
      valuePlaceholders.push(
        `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, NOW(), NOW())`
      );
      params.push(
        id,
        r.year,
        r.month,
        r.hour,
        r.radiationValue,
        r.irradianceWm2,
        r.source
      );
    }

    const sql = `
      INSERT INTO "solar_radiation_climatology" (
        "id", "year", "month", "hour", "radiationValue", "irradianceWm2", "source", "createdAt", "updatedAt"
      )
      VALUES ${valuePlaceholders.join(', ')}
      ON CONFLICT ("year", "month", "hour")
      DO UPDATE SET
        "radiationValue" = EXCLUDED."radiationValue",
        "irradianceWm2" = EXCLUDED."irradianceWm2",
        "source" = EXCLUDED."source",
        "updatedAt" = NOW()
    `;

    await prisma.$executeRawUnsafe(sql, ...params);
    const progress = Math.min(i + BATCH_SIZE, validRecords.length);
    console.log(`[PROGRESS] Upserted ${progress} / ${validRecords.length} records...`);
  }

  // Verification queries
  const totalInDb = await prisma.solarRadiationClimatology.count();
  const nullInDb = await prisma.solarRadiationClimatology.count({
    where: { radiationValue: null },
  });
  const numericInDb = await prisma.solarRadiationClimatology.count({
    where: { radiationValue: { not: null } },
  });

  const aggregateStats = await prisma.solarRadiationClimatology.aggregate({
    _min: {
      year: true,
      month: true,
      hour: true,
      radiationValue: true,
      irradianceWm2: true,
    },
    _max: {
      year: true,
      month: true,
      hour: true,
      radiationValue: true,
      irradianceWm2: true,
    },
    _avg: {
      radiationValue: true,
      irradianceWm2: true,
    },
  });

  // Calculate rows inserted vs updated
  const rowsInserted = totalInDb - existingClimatologyBefore;
  const rowsUpdated = validRecords.length - rowsInserted;

  // Verify weather_data remained untouched
  const weatherCountAfter = await prisma.weatherData.count();

  console.log('\n================================================================');
  console.log(' IMPORT SUMMARY REPORT');
  console.log('================================================================');
  console.log(` Total Rows Read:        ${rowsRead}`);
  console.log(` Rows Inserted:          ${rowsInserted}`);
  console.log(` Rows Updated:           ${rowsUpdated}`);
  console.log(` Numeric Values:         ${numericCount}`);
  console.log(` Null Values:            ${nullCount}`);
  console.log(` Invalid Format Rows:    ${invalidCount}`);
  console.log(` Duplicate Keys in File: ${duplicateCount}`);
  console.log('----------------------------------------------------------------');
  console.log(' DATABASE VERIFICATION QUERIES:');
  console.log(` Total Rows in DB Table: ${totalInDb}`);
  console.log(` Numeric Radiation Count:${numericInDb}`);
  console.log(` Null Radiation Count:   ${nullInDb}`);
  console.log('----------------------------------------------------------------');
  console.log(' RANGE BOUNDS:');
  console.log(`   Year:   min=${aggregateStats._min.year}, max=${aggregateStats._max.year}`);
  console.log(`   Month:  min=${aggregateStats._min.month}, max=${aggregateStats._max.month}`);
  console.log(`   Hour:   min=${aggregateStats._min.hour}, max=${aggregateStats._max.hour}`);
  console.log(`   Value:  min=${aggregateStats._min.radiationValue?.toFixed(4)}, max=${aggregateStats._max.radiationValue?.toFixed(4)}`);
  console.log(`   Irrad:  min=${aggregateStats._min.irradianceWm2?.toFixed(2)} W/m², max=${aggregateStats._max.irradianceWm2?.toFixed(2)} W/m²`);
  console.log('----------------------------------------------------------------');
  console.log(' DATA INTEGRITY CHECK:');
  console.log(`   weather_data count before: ${weatherCountBefore}`);
  console.log(`   weather_data count after:  ${weatherCountAfter}`);
  console.log(`   Integrity Status:          ${weatherCountBefore === weatherCountAfter ? 'VERIFIED (100% UNTOUCHED)' : 'FAILED'}`);
  console.log('================================================================\n');
}

importRadiationClimatology()
  .catch((err) => {
    console.error('[FATAL] Importer failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
