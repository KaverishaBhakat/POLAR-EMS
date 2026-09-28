const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSample() {
  try {
    const samples = await prisma.weatherData.findMany({
      take: 3,
      orderBy: { timestamp: 'desc' }
    });
    console.log('SAMPLE WEATHER RECORDS:');
    samples.forEach(s => console.log(JSON.stringify(s)));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkSample();
