const { PrismaClient } = require('@prisma/client');
const dashboardService = require('../src/services/dashboard.service');
const pvGenerationService = require('../src/services/pv-generation.service');

const prisma = new PrismaClient();

async function runTests() {
  console.log('====================================================');
  console.log('   HYBRID SOLAR DASHBOARD INTEGRATION VERIFICATION  ');
  console.log('====================================================\n');

  const stations = await prisma.station.findMany();
  const maitriStation = stations.find((s) => s.code === 'MAITRI');
  const bharatiStation = stations.find((s) => s.code === 'BHARATI');

  let passedAll = true;

  // ----------------------------------------------------
  // TEST A — MEASURED TELEMETRY
  // ----------------------------------------------------
  console.log('--- TEST A: MEASURED TELEMETRY ---');
  const latestRen = await prisma.renewableGeneration.findFirst({
    where: { stationId: maitriStation.id },
    orderBy: { timestamp: 'desc' },
  });
  console.log('Latest renewable record for Maitri:', latestRen);

  const resA = await dashboardService.resolveSolarPowerForDashboard(
    maitriStation.id,
    latestRen.timestamp,
    latestRen
  );
  console.log('resolveSolarPowerForDashboard Result:', resA);

  const testAPass =
    resA.solarSource === 'MEASURED' &&
    resA.isTelemetryLive === true &&
    resA.solarAvailable === true &&
    resA.solarPowerKW === latestRen.solarPower;

  console.log(`TEST A Result: ${testAPass ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  if (!testAPass) passedAll = false;

  // ----------------------------------------------------
  // TEST B — CLIMATOLOGICAL FALLBACK
  // ----------------------------------------------------
  console.log('--- TEST B: CLIMATOLOGICAL FALLBACK (Dec 15, 13:00 UTC) ---');
  const testTimestampB = '1995-12-15T13:00:00Z';
  const pvEstimateB = await pvGenerationService.estimatePvGeneration({
    stationId: maitriStation.id,
    timestamp: testTimestampB,
  });
  console.log('PV Generation Service direct estimate:', pvEstimateB);

  // Call dashboard resolver without measured telemetry record
  const resB = await dashboardService.resolveSolarPowerForDashboard(
    maitriStation.id,
    testTimestampB,
    null // no measured telemetry
  );
  console.log('resolveSolarPowerForDashboard Result (no telemetry):', resB);

  const testBPass =
    resB.solarSource === 'CLIMATOLOGICAL_ESTIMATE' &&
    resB.isTelemetryLive === false &&
    resB.solarAvailable === true &&
    resB.solarPowerKW > 0 &&
    resB.solarPowerKW === pvEstimateB.estimatedPvPowerKw;

  console.log(`TEST B Result: ${testBPass ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  if (!testBPass) passedAll = false;

  // ----------------------------------------------------
  // TEST C — POLAR NIGHT / NULL (1985-06-12T12:00:00Z)
  // ----------------------------------------------------
  console.log('--- TEST C: POLAR NIGHT / NULL (1985-06-12T12:00:00Z) ---');
  const testTimestampC = '1985-06-12T12:00:00Z';
  const pvEstimateC = await pvGenerationService.estimatePvGeneration({
    stationId: maitriStation.id,
    timestamp: testTimestampC,
  });
  console.log('PV Generation Service polar night estimate:', pvEstimateC);

  const resC = await dashboardService.resolveSolarPowerForDashboard(
    maitriStation.id,
    testTimestampC,
    null // no measured telemetry
  );
  console.log('resolveSolarPowerForDashboard Result (polar night):', resC);

  const testCPass =
    resC.solarSource === 'UNAVAILABLE' &&
    resC.isTelemetryLive === false &&
    resC.solarAvailable === false &&
    resC.solarPowerKW === null;

  console.log(`TEST C Result: ${testCPass ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  if (!testCPass) passedAll = false;

  // ----------------------------------------------------
  // TEST D — MEASURED ZERO (solarPower = 0)
  // ----------------------------------------------------
  console.log('--- TEST D: MEASURED ZERO (solarPower = 0.0) ---');
  const syntheticMeasuredZero = {
    stationId: maitriStation.id,
    timestamp: new Date(),
    solarPower: 0,
    windPower: 15,
    totalRenewable: 15,
  };

  const resD = await dashboardService.resolveSolarPowerForDashboard(
    maitriStation.id,
    syntheticMeasuredZero.timestamp,
    syntheticMeasuredZero
  );
  console.log('resolveSolarPowerForDashboard Result (measured 0):', resD);

  const testDPass =
    resD.solarSource === 'MEASURED' &&
    resD.isTelemetryLive === true &&
    resD.solarAvailable === true &&
    resD.solarPowerKW === 0;

  console.log(`TEST D Result: ${testDPass ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  if (!testDPass) passedAll = false;

  // ----------------------------------------------------
  // TEST D2 — FULL DASHBOARD DATA FETCH (MAITRI & BHARATI)
  // ----------------------------------------------------
  console.log('--- TEST D2: FULL GET DASHBOARD DATA CALLS ---');
  const maitriDashboard = await dashboardService.getDashboardData(maitriStation.id);
  console.log('Maitri Dashboard top-level solar:', {
    solarPowerKW: maitriDashboard.solarPowerKW,
    solarSource: maitriDashboard.solarSource,
    isTelemetryLive: maitriDashboard.isTelemetryLive,
    solarAvailable: maitriDashboard.solarAvailable,
  });
  console.log('Maitri Dashboard summary solar:', {
    solarPowerKW: maitriDashboard.summary.solarPowerKW,
    solarSource: maitriDashboard.summary.solarSource,
    isTelemetryLive: maitriDashboard.summary.isTelemetryLive,
    solarAvailable: maitriDashboard.summary.solarAvailable,
  });
  console.log(`Maitri points count: ${maitriDashboard.points.length}`);
  if (maitriDashboard.points.length > 0) {
    console.log('Sample Maitri point:', maitriDashboard.points[0]);
  }

  const bharatiDashboard = await dashboardService.getDashboardData(bharatiStation.id);
  console.log('Bharati Dashboard top-level solar:', {
    solarPowerKW: bharatiDashboard.solarPowerKW,
    solarSource: bharatiDashboard.solarSource,
    isTelemetryLive: bharatiDashboard.isTelemetryLive,
    solarAvailable: bharatiDashboard.solarAvailable,
  });
  console.log('Bharati Dashboard summary solar:', {
    solarPowerKW: bharatiDashboard.summary.solarPowerKW,
    solarSource: bharatiDashboard.summary.solarSource,
    isTelemetryLive: bharatiDashboard.summary.isTelemetryLive,
    solarAvailable: bharatiDashboard.summary.solarAvailable,
  });
  console.log(`Bharati points count: ${bharatiDashboard.points.length}\n`);

  // ----------------------------------------------------
  // TEST E — DATABASE INTEGRITY
  // ----------------------------------------------------
  console.log('--- TEST E: DATABASE INTEGRITY VERIFICATION ---');
  const weatherCount = await prisma.weatherData.count();
  const climatologyCount = await prisma.solarRadiationClimatology.count();
  const renewableCount = await prisma.renewableGeneration.count();

  console.log(`weather_data count: ${weatherCount} (Expected: 701)`);
  console.log(`solar_radiation_climatology count: ${climatologyCount} (Expected: 4607)`);
  console.log(`renewable_generation count: ${renewableCount} (Expected: 2)`);

  const testEPass =
    weatherCount === 701 &&
    climatologyCount === 4607 &&
    renewableCount === 2;

  console.log(`TEST E Result: ${testEPass ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  if (!testEPass) passedAll = false;

  console.log('====================================================');
  console.log(`OVERALL RESULT: ${passedAll ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
  console.log('====================================================');
}

runTests()
  .catch((err) => {
    console.error('Test execution error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
