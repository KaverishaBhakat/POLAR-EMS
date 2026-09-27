/**
 * CLI Script: Generate Historical Solar Generation Time Series
 * 
 * Maps real meteorological observation timestamps against the 1985-2000 solar radiation
 * climatological prior to generate a scientifically segregated historical PV output series.
 * 
 * Usage:
 *   node scripts/generate-historical-solar.js [stationCode] [customCsvPath]
 *   Example: node scripts/generate-historical-solar.js MAITRI
 */

const { prisma } = require('../src/config/database');
const {
  generateHistoricalSolarSeries,
  resolveMaitri2019DatasetPath,
} = require('../src/services/solar-generation-history.service');

async function main() {
  const targetStationCode = process.argv[2] || 'MAITRI';
  const customCsvPath = process.argv[3] || null;

  console.log('====================================================');
  console.log(' POLAR-EMS — Historical Solar Generation Pipeline   ');
  console.log('====================================================\n');

  const station = await prisma.station.findUnique({
    where: { code: targetStationCode.toUpperCase() },
    include: { pvConfig: true },
  });

  if (!station) {
    console.error(`[ERROR] Station code '${targetStationCode}' not found in database.`);
    process.exit(1);
  }

  console.log(`Target Station: ${station.name} (${station.code}) [ID: ${station.id}]`);
  console.log(`PV Capacity:    ${station.pvConfig?.capacityKw || 50.0} kW ${station.pvConfig ? '(Configured in DB)' : '(Default Scenario Fallback)'}`);
  console.log(`Performance PR: ${station.pvConfig?.performanceRatio || 0.80}`);
  
  const datasetPath = customCsvPath || resolveMaitri2019DatasetPath();
  console.log(`Source Dataset: ${datasetPath || 'Database WeatherData Rows'}\n`);

  console.log('Executing historical solar modeling...');
  const startTime = Date.now();

  const result = await generateHistoricalSolarSeries({
    stationId: station.id,
    datasetPath,
    dryRun: false,
  });

  const durationMs = Date.now() - startTime;

  console.log('\nHistorical Solar Generation Summary');
  console.log('-----------------------------------');
  console.log(`Station:                      ${result.stationName} (${result.stationCode})`);
  console.log(`Source dataset:               ${result.sourceDataset}`);
  console.log(`Date range:                   ${result.dateRange.start} -> ${result.dateRange.end}`);
  console.log(`Weather timestamps processed: ${result.timestampsProcessed}`);
  console.log(`Solar estimates generated:    ${result.availablePoints}`);
  console.log(`Unavailable solar points:     ${result.unavailablePoints}`);
  console.log(`Inserted / Updated in DB:     ${result.insertedOrUpdated}`);
  console.log(`Model version:                ${result.modelVersion}`);
  console.log(`Execution time:               ${durationMs}ms\n`);

  console.log('Source:');
  console.log('SolarRadiationClimatology 1985–2000 (Monthly-Hourly Climatological Prior)\n');

  console.log('Provenance:');
  console.log('CLIMATOLOGICAL_ESTIMATE (Scientifically Segregated in solar_generation_history)\n');
  console.log('====================================================');
}

main()
  .catch((err) => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
