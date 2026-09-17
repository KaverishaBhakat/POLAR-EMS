const app = require('./app');
const env = require('./config/env');
const { prisma, checkDatabaseConnection } = require('./config/database');

const server = app.listen(env.PORT, async () => {
  console.log(`========================================================`);
  console.log(`❄️  POLAR-EMS Core Backend Server Started`);
  console.log(`📡 Listening on: http://localhost:${env.PORT}`);
  console.log(`🚀 Base API URL: http://localhost:${env.PORT}/api`);
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
  console.log(`🔒 CORS Client: ${env.CLIENT_URL}`);
  console.log(`========================================================`);

  const dbConnected = await checkDatabaseConnection();
  if (dbConnected) {
    console.log(`✅ PostgreSQL Database connection established.`);
  } else {
    console.warn(`⚠️ PostgreSQL connection not available yet.`);
    console.warn(`💡 Tip: Verify your DATABASE_URL configuration or database service.`);
  }
});

// Graceful Shutdown
const handleShutdown = async (signal) => {
  console.log(`\n[SHUTDOWN] Received ${signal}. Gracefully closing server and database pool...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('✅ PostgreSQL connection pool disconnected.');
      process.exit(0);
    } catch (err) {
      console.error('Error during Prisma disconnect:', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
