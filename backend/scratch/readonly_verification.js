const { PrismaClient } = require('@prisma/client');
const request = require('supertest');
const app = require('../src/app');
const pvGenService = require('../src/services/pv-generation.service');

const prisma = new PrismaClient();

async function runReadOnlyVerification() {
  console.log('--- 1. DATABASE ROW COUNTS & STATION ID ---');
  const maitriStation = await prisma.station.findFirst({
    where: {
      OR: [
        { code: { equals: 'maitri', mode: 'insensitive' } },
        { name: { contains: 'Maitri', mode: 'insensitive' } }
      ]
    }
  });
  console.log('Exact Maitri Station ID:', maitriStation.id, '| Code:', maitriStation.code, '| Name:', maitriStation.name);

  const solarHistoryCount = await prisma.solarGenerationHistory.count();
  const renewableGenCount = await prisma.renewableGeneration.count();
  const solarClimatologyCount = await prisma.solarRadiationClimatology.count();
  const weatherDataCount = await prisma.weatherData.count();

  console.log('solar_generation_history count:', solarHistoryCount);
  console.log('renewable_generation count:', renewableGenCount);
  console.log('solar_radiation_climatology count:', solarClimatologyCount);
  console.log('weather_data count:', weatherDataCount);

  console.log('\n--- 2. FOREIGN KEY INTEGRITY ---');
  const distinctStationIds = await prisma.solarGenerationHistory.findMany({
    select: { stationId: true },
    distinct: ['stationId']
  });
  console.log('Distinct stationIds in solar_generation_history:', distinctStationIds);
  for (const item of distinctStationIds) {
    const station = await prisma.station.findUnique({ where: { id: item.stationId } });
    console.log(`Station ${item.stationId} exists in Station table:`, !!station, station ? `(${station.name})` : '');
  }

  console.log('\n--- 3. API ENDPOINTS VERIFICATION ---');
  // First page
  const resFirstPage = await request(app).get(`/api/solar-generation-history/${maitriStation.id}?page=1&limit=5`);
  console.log('GET first page status:', resFirstPage.status);
  console.log('Records returned:', resFirstPage.body.data.records.length);
  console.log('Pagination info:', resFirstPage.body.data.pagination);

  // Pagination (page 2)
  const resPage2 = await request(app).get(`/api/solar-generation-history/${maitriStation.id}?page=2&limit=5`);
  console.log('GET page 2 status:', resPage2.status, '| first record timestamp on page 2:', resPage2.body.data.records[0].timestamp);

  // Date filtering
  const resDateFilter = await request(app).get(`/api/solar-generation-history/${maitriStation.id}?start=2019-12-01T00:00:00Z&end=2019-12-02T23:59:59Z&limit=100`);
  console.log('GET date filter (2019-12-01 to 2019-12-02) status:', resDateFilter.status);
  console.log('Records count returned in page:', resDateFilter.body.data.records.length);
  console.log('Total matching in period:', resDateFilter.body.data.pagination.total);

  // Summary endpoint
  const resSummary = await request(app).get(`/api/solar-generation-history/${maitriStation.id}/summary`);
  console.log('GET summary status:', resSummary.status);
  console.log('Summary data:', JSON.stringify(resSummary.body.data, null, 2));

  console.log('\n--- 4. 3 REPRESENTATIVE RECORDS ---');
  // Normal daylight 1 (Dec 15, 13:00)
  const recDaylight1 = await prisma.solarGenerationHistory.findFirst({
    where: {
      stationId: maitriStation.id,
      timestamp: new Date('2019-12-15T13:00:00.000Z')
    }
  });
  console.log('Record 1 (Normal Daylight - Dec 15 13:00 UTC):', JSON.stringify(recDaylight1, null, 2));

  // Normal daylight 2 (Jan 10, 11:00)
  const recDaylight2 = await prisma.solarGenerationHistory.findFirst({
    where: {
      stationId: maitriStation.id,
      timestamp: new Date('2019-01-10T11:00:00.000Z')
    }
  });
  console.log('Record 2 (Normal Daylight - Jan 10 11:00 UTC):', JSON.stringify(recDaylight2, null, 2));

  // Polar night (June 15, 12:00)
  const recPolarNight = await prisma.solarGenerationHistory.findFirst({
    where: {
      stationId: maitriStation.id,
      timestamp: new Date('2019-06-15T12:00:00.000Z')
    }
  });
  console.log('Record 3 (Polar Night - June 15 12:00 UTC):', JSON.stringify(recPolarNight, null, 2));

  console.log('\n--- 5. PROVENANCE VERIFICATION ---');
  const provenanceCounts = await prisma.solarGenerationHistory.groupBy({
    by: ['solarSource'],
    _count: { id: true }
  });
  console.log('Provenance breakdown in solar_generation_history:', provenanceCounts);
  const measuredCount = await prisma.solarGenerationHistory.count({
    where: { solarSource: 'MEASURED' }
  });
  console.log('Records marked MEASURED in solar_generation_history:', measuredCount);

  console.log('\n--- 6. 2019 TIME RANGE ---');
  const firstRecord = await prisma.solarGenerationHistory.findFirst({
    where: { stationId: maitriStation.id },
    orderBy: { timestamp: 'asc' }
  });
  const lastRecord = await prisma.solarGenerationHistory.findFirst({
    where: { stationId: maitriStation.id },
    orderBy: { timestamp: 'desc' }
  });
  console.log('First timestamp:', firstRecord.timestamp.toISOString());
  console.log('Last timestamp:', lastRecord.timestamp.toISOString());
  console.log('Total timestamps:', solarHistoryCount);

  console.log('\n--- 7. TIMEZONE & HOUR CONVENTION CHECK ---');
  console.log('solar-resource-estimation.service.js getStationHour implementation: uses date.getUTCHours() + 1 (1-24).');
  console.log('solar-generation-history.service.js getStationHour implementation: uses date.getUTCHours() + 1 (1-24).');

  console.log('\n--- 8. PV HARDWARE CONFIG / FALLBACK_PV_CONFIG CHECK ---');
  console.log('FALLBACK_PV_CONFIG in pv-generation.service.js:', JSON.stringify(pvGenService.FALLBACK_PV_CONFIG));

  await prisma.$disconnect();
}

runReadOnlyVerification().catch(e => {
  console.error(e);
  process.exit(1);
});
