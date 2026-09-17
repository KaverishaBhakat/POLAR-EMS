const { PrismaClient } = require('@prisma/client');
const env = require('./env');

const prisma = new PrismaClient({
  log: env.IS_PROD ? ['error'] : ['query', 'info', 'warn', 'error'],
});

/**
 * Verifies live connection to PostgreSQL
 * @returns {Promise<boolean>}
 */
const checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = {
  prisma,
  checkDatabaseConnection,
};
