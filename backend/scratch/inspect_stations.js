const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stations = await prisma.station.findMany();
  console.log('Stations:', JSON.stringify(stations, null, 2));
  const ren = await prisma.renewableGeneration.findMany();
  console.log('RenewableGeneration rows:', JSON.stringify(ren, null, 2));
  const energy = await prisma.energyLoad.findMany({ take: 5 });
  console.log('EnergyLoad sample:', JSON.stringify(energy, null, 2));
}

main().finally(() => prisma.$disconnect());
