const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const stations = await prisma.station.findMany();
  console.log('STATIONS:', JSON.stringify(stations.map(s => ({ id: s.id, code: s.code, name: s.name })), null, 2));

  for (const s of stations) {
    console.log(`\n=================== Station: ${s.code} (${s.id}) ===================`);

    // WeatherData
    const weatherCount = await prisma.weatherData.count({ where: { stationId: s.id } });
    const weatherFirst = await prisma.weatherData.findFirst({ where: { stationId: s.id }, orderBy: { timestamp: 'asc' } });
    const weatherLast = await prisma.weatherData.findFirst({ where: { stationId: s.id }, orderBy: { timestamp: 'desc' } });
    console.log('WeatherData:', {
      count: weatherCount,
      earliest: weatherFirst?.timestamp,
      latest: weatherLast?.timestamp,
    });

    // EnergyLoad
    const energyCount = await prisma.energyLoad.count({ where: { stationId: s.id } });
    const energyFirst = await prisma.energyLoad.findFirst({ where: { stationId: s.id }, orderBy: { timestamp: 'asc' } });
    const energyLast = await prisma.energyLoad.findFirst({ where: { stationId: s.id }, orderBy: { timestamp: 'desc' } });
    console.log('EnergyLoad:', {
      count: energyCount,
      earliest: energyFirst?.timestamp,
      latest: energyLast?.timestamp,
    });

    // RenewableGeneration
    const renewCount = await prisma.renewableGeneration.count({ where: { stationId: s.id } });
    const renewFirst = await prisma.renewableGeneration.findFirst({ where: { stationId: s.id }, orderBy: { timestamp: 'asc' } });
    const renewLast = await prisma.renewableGeneration.findFirst({ where: { stationId: s.id }, orderBy: { timestamp: 'desc' } });
    console.log('RenewableGeneration:', {
      count: renewCount,
      earliest: renewFirst?.timestamp,
      latest: renewLast?.timestamp,
    });

    // Generators & Readings
    const gens = await prisma.generator.findMany({ where: { stationId: s.id } });
    const genReadingsCount = await prisma.generatorReading.count({ where: { generator: { stationId: s.id } } });
    const genReadingFirst = await prisma.generatorReading.findFirst({ where: { generator: { stationId: s.id } }, orderBy: { timestamp: 'asc' } });
    const genReadingLast = await prisma.generatorReading.findFirst({ where: { generator: { stationId: s.id } }, orderBy: { timestamp: 'desc' } });
    console.log('Generators:', {
      generatorCount: gens.length,
      readingsCount: genReadingsCount,
      earliest: genReadingFirst?.timestamp,
      latest: genReadingLast?.timestamp,
    });

    // Batteries & Readings
    const bats = await prisma.battery.findMany({ where: { stationId: s.id } });
    const batReadingsCount = await prisma.batteryReading.count({ where: { battery: { stationId: s.id } } });
    const batReadingFirst = await prisma.batteryReading.findFirst({ where: { battery: { stationId: s.id } }, orderBy: { timestamp: 'asc' } });
    const batReadingLast = await prisma.batteryReading.findFirst({ where: { battery: { stationId: s.id } }, orderBy: { timestamp: 'desc' } });
    console.log('Batteries:', {
      batteryCount: bats.length,
      readingsCount: batReadingsCount,
      earliest: batReadingFirst?.timestamp,
      latest: batReadingLast?.timestamp,
    });

    // Critical Loads
    const critCount = await prisma.criticalLoad.count({ where: { stationId: s.id } });
    console.log('CriticalLoads:', { count: critCount });

    // Alerts
    const alertCount = await prisma.alert.count({ where: { stationId: s.id } });
    console.log('Alerts:', { count: alertCount });
  }
}

check()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
