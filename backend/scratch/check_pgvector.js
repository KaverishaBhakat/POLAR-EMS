const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const res = await prisma.$queryRawUnsafe(`SELECT name, default_version, installed_version, comment FROM pg_available_extensions WHERE name = 'vector';`);
    console.log('Vector extension available:', res);
    const ext = await prisma.$queryRawUnsafe(`SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';`);
    console.log('Vector extension installed:', ext);
  } catch (e) {
    console.error('Error checking pgvector:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
