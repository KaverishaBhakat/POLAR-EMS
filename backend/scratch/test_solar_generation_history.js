const { PrismaClient } = require('@prisma/client');
const solarGenHistoryService = require('../src/services/solar-generation-history.service');
const pvGenService = require('../src/services/pv-generation.service');

const prisma = new PrismaClient();

async function runValidation() {
  console.log('====================================================');
  console.log(' HISTORICAL SOLAR GENERATION VALIDATION SUITE       ');
  console.log('====================================================\n');

  let passedAll = true;

  const maitriStation = await prisma.station.findUnique({
    where: { code: 'MAITRI' },
    include: { pvConfig: true },
  });

  const capacityKw = maitriStation.pvConfig?.capacityKw || 50.0;
  const performanceRatio = maitriStation.pvConfig?.performanceRatio || 0.80;

  // ----------------------------------------------------
  // TEST A: Normal Solar Period (Dec 15 daytime)
  // ----------------------------------------------------
  console.log('--- TEST A: NORMAL SOLAR PERIOD (December Daytime) ---');
  const sampleDec = await prisma.solarGenerationHistory.findFirst({
    where: {
      stationId: maitriStation.id,
      sourceRadiationMonth: 12,
      sourceRadiationHour: 13,
    },
  });
  console.log('Sample December record:', sampleDec);

  const testAPass =
    sampleDec &&
    sampleDec.irradianceWm2 > 0 &&
    sampleDec.solarPowerKW > 0 &&
    sampleDec.solarSource === 'CLIMATOLOGICAL_ESTIMATE';

  console.log(`TEST A Result: ${testAPass ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  if (!testAPass) passedAll = false;

  // ----------------------------------------------------
  // TEST B: Polar Night / NULL (June timestamp)
  // ----------------------------------------------------
  console.log('--- TEST B: POLAR NIGHT / UNAVAILABLE (June timestamp) ---');
  const sampleJune = await prisma.solarGenerationHistory.findFirst({
    where: {
      stationId: maitriStation.id,
      sourceRadiationMonth: 6,
      sourceRadiationHour: 12,
    },
  });
  console.log('Sample June record:', sampleJune);

  const testBPass =
    sampleJune &&
    sampleJune.irradianceWm2 === null &&
    sampleJune.solarPowerKW === null &&
    sampleJune.solarSource === 'UNAVAILABLE';

  console.log(`TEST B Result: ${testBPass ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  if (!testBPass) passedAll = false;

  // ----------------------------------------------------
  // TEST C: Idempotency (Run generation second time)
  // ----------------------------------------------------
  console.log('--- TEST C: IDEMPOTENCY TEST ---');
  const countBefore = await prisma.solarGenerationHistory.count({
    where: { stationId: maitriStation.id },
  });
  console.log(`Count before re-run: ${countBefore}`);

  const secondRunResult = await solarGenHistoryService.generateHistoricalSolarSeries({
    stationId: maitriStation.id,
    dryRun: false,
  });
  console.log(`Re-run result: Processed ${secondRunResult.timestampsProcessed}, Inserted/Updated ${secondRunResult.insertedOrUpdated}`);

  const countAfter = await prisma.solarGenerationHistory.count({
    where: { stationId: maitriStation.id },
  });
  console.log(`Count after re-run: ${countAfter}`);

  const testCPass = countBefore === 8760 && countAfter === 8760;
  console.log(`TEST C Result: ${testCPass ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  if (!testCPass) passedAll = false;

  // ----------------------------------------------------
  // TEST D: Database Separation
  // ----------------------------------------------------
  console.log('--- TEST D: DATABASE SEPARATION ---');
  const renCount = await prisma.renewableGeneration.count();
  const climCount = await prisma.solarRadiationClimatology.count();
  const weatherCount = await prisma.weatherData.count();
  const solarHistCount = await prisma.solarGenerationHistory.count();

  console.log(`renewable_generation count:     ${renCount} (Expected: 2)`);
  console.log(`solar_radiation_climatology count: ${climCount} (Expected: 4607)`);
  console.log(`weather_data count:                ${weatherCount} (Expected: 701)`);
  console.log(`solar_generation_history count:    ${solarHistCount} (Expected: 8760)`);

  const testDPass =
    renCount === 2 &&
    climCount === 4607 &&
    weatherCount === 701 &&
    solarHistCount === 8760;

  console.log(`TEST D Result: ${testDPass ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  if (!testDPass) passedAll = false;

  // ----------------------------------------------------
  // TEST E: Mathematical Verification
  // ----------------------------------------------------
  console.log('--- TEST E: MATHEMATICAL VERIFICATION ---');
  if (sampleDec && sampleDec.irradianceWm2 !== null) {
    const expectedPower = parseFloat(
      ((sampleDec.irradianceWm2 * capacityKw * performanceRatio) / 1000).toFixed(2)
    );
    console.log(`Calculated: (${sampleDec.irradianceWm2} * ${capacityKw} * ${performanceRatio}) / 1000 = ${expectedPower} kW`);
    console.log(`Stored in DB: ${sampleDec.solarPowerKW} kW`);

    const testEPass = Math.abs(sampleDec.solarPowerKW - expectedPower) < 0.01;
    console.log(`TEST E Result: ${testEPass ? 'PASSED ✅' : 'FAILED ❌'}\n`);
    if (!testEPass) passedAll = false;
  }

  // ----------------------------------------------------
  // TEST F: Provenance Integrity
  // ----------------------------------------------------
  console.log('--- TEST F: PROVENANCE INTEGRITY ---');
  const measuredTaggedCount = await prisma.solarGenerationHistory.count({
    where: { solarSource: 'MEASURED' },
  });
  console.log(`Records tagged as MEASURED in solar_generation_history: ${measuredTaggedCount} (Expected: 0)`);

  const testFPass = measuredTaggedCount === 0;
  console.log(`TEST F Result: ${testFPass ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  if (!testFPass) passedAll = false;

  // ----------------------------------------------------
  // TEST G: Service Summary API
  // ----------------------------------------------------
  console.log('--- TEST G: HISTORICAL SOLAR SUMMARY API ---');
  const summary = await solarGenHistoryService.getHistoricalSolarSummary(maitriStation.id, {});
  console.log('Summary output:', summary);

  const testGPass =
    summary.hasData === true &&
    summary.totalPoints === 8760 &&
    summary.availablePoints === 8040 &&
    summary.unavailablePoints === 720 &&
    summary.maxSolarPowerKW > 0 &&
    summary.provenance === 'CLIMATOLOGICAL_ESTIMATE';

  console.log(`TEST G Result: ${testGPass ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  if (!testGPass) passedAll = false;

  console.log('====================================================');
  console.log(`OVERALL VALIDATION: ${passedAll ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
  console.log('====================================================');
}

runValidation()
  .catch((err) => {
    console.error('Validation error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
