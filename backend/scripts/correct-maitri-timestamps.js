/**
 * Safe Timestamp Correction Script for Maitri Historical Weather Data
 * 
 * Adjusts the 699 historical Maitri records by +5 hours 30 minutes to align with
 * the literal source timestamps in imd_maitri.txt (1985-01-01 00:00:00 to 2016-12-19 12:00:00).
 * 
 * Guarantees:
 * 1. Zero database resets / deletions.
 * 2. 2026 demo records are strictly excluded and untouched.
 * 3. Atomic transaction execution.
 * 4. Comprehensive post-update validation and duplicate checks.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== MAITRI HISTORICAL TIMESTAMP CORRECTION ===\n');

  const maitri = await prisma.station.findUnique({
    where: { code: 'MAITRI' }
  });

  if (!maitri) {
    throw new Error('Maitri station (code: MAITRI) not found in database.');
  }
  console.log(`Station found: ${maitri.name} (ID: ${maitri.id})`);

  // 1. Pre-check counts
  const totalBefore = await prisma.weatherData.count({ where: { stationId: maitri.id } });
  const historicalBefore = await prisma.weatherData.count({
    where: {
      stationId: maitri.id,
      timestamp: { lt: new Date('2026-01-01T00:00:00.000Z') }
    }
  });
  const demoBefore = await prisma.weatherData.count({
    where: {
      stationId: maitri.id,
      timestamp: { gte: new Date('2026-01-01T00:00:00.000Z') }
    }
  });

  console.log(`Pre-update Status:`);
  console.log(`  - Total records: ${totalBefore}`);
  console.log(`  - Historical records (< 2026): ${historicalBefore}`);
  console.log(`  - 2026 Demo records: ${demoBefore}`);

  if (historicalBefore === 0) {
    console.log('No historical records found to update.');
    return;
  }

  // 2. Execute atomic SQL update
  console.log('\nApplying SQL timestamp correction (+ INTERVAL \'5 hours 30 minutes\')...');
  const rowsUpdated = await prisma.$executeRaw`
    UPDATE weather_data
    SET "timestamp" = "timestamp" + INTERVAL '5 hours 30 minutes'
    WHERE "stationId" = ${maitri.id}
      AND "timestamp" < '2026-01-01 00:00:00';
  `;

  console.log(`Update complete. Rows affected: ${rowsUpdated}`);

  // 3. Post-update verification
  const totalAfter = await prisma.weatherData.count({ where: { stationId: maitri.id } });
  const firstHistorical = await prisma.weatherData.findFirst({
    where: { stationId: maitri.id, timestamp: { lt: new Date('2026-01-01T00:00:00.000Z') } },
    orderBy: { timestamp: 'asc' }
  });
  const lastHistorical = await prisma.weatherData.findFirst({
    where: { stationId: maitri.id, timestamp: { lt: new Date('2026-01-01T00:00:00.000Z') } },
    orderBy: { timestamp: 'desc' }
  });
  const demoAfter = await prisma.weatherData.findFirst({
    where: { stationId: maitri.id, timestamp: { gte: new Date('2026-01-01T00:00:00.000Z') } }
  });

  // 4. Duplicate check
  const duplicateCheck = await prisma.$queryRaw`
    SELECT "timestamp", COUNT(*)::int as count
    FROM weather_data
    WHERE "stationId" = ${maitri.id}
    GROUP BY "timestamp"
    HAVING COUNT(*) > 1;
  `;

  console.log('\n=== POST-CORRECTION VERIFICATION ===');
  console.log(`Total records in DB: ${totalAfter} (Expected: 700)`);
  console.log(`Duplicates detected: ${duplicateCheck.length} (Expected: 0)`);
  console.log(`First historical timestamp: ${firstHistorical.timestamp.toISOString()} (Expected: 1985-01-01T00:00:00.000Z)`);
  console.log(`Last historical timestamp:  ${lastHistorical.timestamp.toISOString()} (Expected: 2016-12-19T12:00:00.000Z)`);
  console.log(`Preserved 2026 demo record: Timestamp=${demoAfter.timestamp.toISOString()}, Temp=${demoAfter.temperature}°C, Solar=${demoAfter.solarRadiation} W/m²`);
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('Correction failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { main };
