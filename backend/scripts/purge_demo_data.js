/**
 * POLAR-EMS Database Purge Script
 * 
 * Removes all synthetic demo time-series readings:
 * - weather_data
 * - energy_loads
 * - renewable_generation
 * - generator_readings
 * - battery_readings
 * - alerts
 * - simulations & simulation_results
 * 
 * Preserves structural entities:
 * - stations (Maitri, Bharati)
 * - users
 * - generator metadata
 * - battery metadata
 * - critical load metadata
 */

const { prisma } = require('../src/config/database');

async function purgeDemoData() {
  console.log('🧹 Starting cleanup of synthetic demo data in PostgreSQL...');

  try {
    const deletedSimResults = await prisma.simulationResult.deleteMany({});
    console.log(`- Deleted ${deletedSimResults.count} simulation results`);

    const deletedSims = await prisma.simulation.deleteMany({});
    console.log(`- Deleted ${deletedSims.count} simulations`);

    const deletedAlerts = await prisma.alert.deleteMany({});
    console.log(`- Deleted ${deletedAlerts.count} alerts`);

    const deletedGenReadings = await prisma.generatorReading.deleteMany({});
    console.log(`- Deleted ${deletedGenReadings.count} generator readings`);

    const deletedBatReadings = await prisma.batteryReading.deleteMany({});
    console.log(`- Deleted ${deletedBatReadings.count} battery readings`);

    const deletedRenewable = await prisma.renewableGeneration.deleteMany({});
    console.log(`- Deleted ${deletedRenewable.count} renewable generation readings`);

    const deletedEnergy = await prisma.energyLoad.deleteMany({});
    console.log(`- Deleted ${deletedEnergy.count} energy load readings`);

    const deletedWeather = await prisma.weatherData.deleteMany({});
    console.log(`- Deleted ${deletedWeather.count} weather data readings`);

    console.log('✅ All synthetic demo time-series readings successfully purged!');

    const stationCount = await prisma.station.count();
    const userCount = await prisma.user.count();
    const generatorCount = await prisma.generator.count();
    const batteryCount = await prisma.battery.count();
    const criticalLoadCount = await prisma.criticalLoad.count();

    console.log('\n📊 Preserved System Baseline:');
    console.log(`- Stations: ${stationCount}`);
    console.log(`- Users: ${userCount}`);
    console.log(`- Generators: ${generatorCount}`);
    console.log(`- Batteries: ${batteryCount}`);
    console.log(`- Critical Life-Support Loads: ${criticalLoadCount}`);
    console.log('\nReady for manual and batch SCADA telemetry ingestion.');
  } catch (error) {
    console.error('❌ Error purging demo data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

purgeDemoData();
