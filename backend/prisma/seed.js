/**
 * POLAR-EMS Database Seeder
 * 
 * Generates initial relational data including:
 * - 3 Demo accounts (Admin, Operator, Viewer)
 * - 2 Polar Research Stations (Maitri & Bharati)
 * - Distributed microgrid equipment (Generators, Batteries, Critical Loads)
 * - 14 days (336 hours) of physically coupled time-series readings
 *   (Weather -> Renewable Solar/Wind -> Demand Load -> Genset/Battery Dispatch)
 * - Rule-based operational alerts
 * 
 * DISCLAIMER: All operational and telemetry values are DEMO / SYNTHETIC DATA.
 * They do NOT represent real-time NCPOR telemetry.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting POLAR-EMS Database Seeding...');

  // 1. Seed Demo Users
  console.log('👤 Seeding Demo Users...');
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('Admin@123', salt);
  const operatorPassword = await bcrypt.hash('Operator@123', salt);
  const viewerPassword = await bcrypt.hash('Viewer@123', salt);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@polar-ems.ncpor.res.in' },
    update: {},
    create: {
      name: 'Dr. Rajesh Sharma (Chief Station Engineer)',
      email: 'admin@polar-ems.ncpor.res.in',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: 'operator@polar-ems.ncpor.res.in' },
    update: {},
    create: {
      name: 'Priya Patel (Electrical Systems Operator)',
      email: 'operator@polar-ems.ncpor.res.in',
      passwordHash: operatorPassword,
      role: 'OPERATOR',
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@polar-ems.ncpor.res.in' },
    update: {},
    create: {
      name: 'Scientific Research Observer',
      email: 'viewer@polar-ems.ncpor.res.in',
      passwordHash: viewerPassword,
      role: 'VIEWER',
    },
  });

  console.log(`   ✓ Seeded 3 users: Admin (${admin.email}), Operator (${operator.email}), Viewer (${viewer.email})`);

  // 2. Seed Stations (Maitri and Bharati)
  console.log('🏢 Seeding Polar Research Stations...');
  const maitri = await prisma.station.upsert({
    where: { code: 'MAITRI' },
    update: {},
    create: {
      name: 'Maitri Station',
      code: 'MAITRI',
      location: 'Schirmacher Oasis, Queen Maud Land, East Antarctica',
      latitude: -70.767,
      longitude: 11.733,
      status: 'ONLINE',
      description: "India's second permanent research station in Antarctica (Inaugurated 1989). Microgrid features diesel genset primary, wind turbine array, and rooftop PV. (DEMO / SYNTHETIC DATA)",
    },
  });

  const bharati = await prisma.station.upsert({
    where: { code: 'BHARATI' },
    update: {},
    create: {
      name: 'Bharati Station',
      code: 'BHARATI',
      location: 'Larsemann Hills, East Antarctica',
      latitude: -69.406,
      longitude: 76.187,
      status: 'ONLINE',
      description: "India's third modern research station in Antarctica (Commissioned 2012). Features high energy efficiency, integrated thermal cogeneration, and lithium BESS. (DEMO / SYNTHETIC DATA)",
    },
  });

  const stations = [maitri, bharati];

  // 3. For each station, seed microgrid hardware assets
  for (const station of stations) {
    console.log(`⚡ Seeding microgrid assets for ${station.name}...`);

    // Clean existing related data to ensure clean idempotency
    await prisma.generatorReading.deleteMany({
      where: { generator: { stationId: station.id } },
    });
    await prisma.batteryReading.deleteMany({
      where: { battery: { stationId: station.id } },
    });
    await prisma.generator.deleteMany({ where: { stationId: station.id } });
    await prisma.battery.deleteMany({ where: { stationId: station.id } });
    await prisma.criticalLoad.deleteMany({ where: { stationId: station.id } });
    await prisma.alert.deleteMany({ where: { stationId: station.id } });
    await prisma.weatherData.deleteMany({ where: { stationId: station.id } });
    await prisma.energyLoad.deleteMany({ where: { stationId: station.id } });
    await prisma.renewableGeneration.deleteMany({ where: { stationId: station.id } });

    // Generators
    const g1 = await prisma.generator.create({
      data: {
        stationId: station.id,
        name: `${station.code}-GEN-01 (Primary Base)`,
        capacity: 100.0,
        minimumOutput: 20.0,
        efficiency: 39.5,
        fuelType: 'diesel',
        status: 'RUNNING',
        fuelLevel: 82.5,
        totalRuntime: 1420.5,
      },
    });

    const g2 = await prisma.generator.create({
      data: {
        stationId: station.id,
        name: `${station.code}-GEN-02 (Auxiliary Dispatch)`,
        capacity: 80.0,
        minimumOutput: 15.0,
        efficiency: 38.0,
        fuelType: 'diesel',
        status: 'STOPPED',
        fuelLevel: 91.0,
        totalRuntime: 860.0,
      },
    });

    const g3 = await prisma.generator.create({
      data: {
        stationId: station.id,
        name: `${station.code}-GEN-03 (Emergency Cold Standby)`,
        capacity: 80.0,
        minimumOutput: 15.0,
        efficiency: 37.5,
        fuelType: 'diesel',
        status: 'STOPPED',
        fuelLevel: 98.0,
        totalRuntime: 320.0,
      },
    });

    const g4 = await prisma.generator.create({
      data: {
        stationId: station.id,
        name: `${station.code}-GEN-04 (Winter Peaker)`,
        capacity: 60.0,
        minimumOutput: 10.0,
        efficiency: 36.8,
        fuelType: 'diesel',
        status: 'MAINTENANCE',
        fuelLevel: 45.0,
        totalRuntime: 2100.0,
      },
    });

    const primaryGen = g1;

    // Battery Storage (BESS)
    const battery = await prisma.battery.create({
      data: {
        stationId: station.id,
        name: `${station.code} LiFePO4 BESS Container`,
        capacity: 350.0, // kWh
        currentSOC: 74.0, // %
        minimumSOC: 20.0,
        maximumSOC: 95.0,
        maxChargePower: 80.0, // kW
        maxDischargePower: 80.0, // kW
        status: 'IDLE',
      },
    });

    // Critical Loads
    const loadsToCreate = [
      { name: 'Habitation Heating & HVAC Loop', category: 'CRITICAL', priority: 1, ratedPower: 28.0, currentPower: 24.5 },
      { name: 'Satellite & VLF Communication Array', category: 'CRITICAL', priority: 2, ratedPower: 8.5, currentPower: 7.2 },
      { name: 'Medical Bay & Life Support Outlets', category: 'CRITICAL', priority: 3, ratedPower: 6.0, currentPower: 4.8 },
      { name: 'Water Production Snow-Melter Plant', category: 'IMPORTANT', priority: 4, ratedPower: 18.0, currentPower: 12.0 },
      { name: 'Atmospheric Physics Research Laboratory', category: 'IMPORTANT', priority: 5, ratedPower: 15.0, currentPower: 10.5 },
      { name: 'Cryogenic Sample Storage Freezers', category: 'IMPORTANT', priority: 6, ratedPower: 7.5, currentPower: 6.2 },
      { name: 'Workstation Computers & General Lighting', category: 'FLEXIBLE', priority: 7, ratedPower: 12.0, currentPower: 8.0 },
      { name: 'Auxiliary Snow Blower Battery Charging', category: 'FLEXIBLE', priority: 8, ratedPower: 10.0, currentPower: 0.0 },
    ];

    for (const load of loadsToCreate) {
      await prisma.criticalLoad.create({
        data: {
          ...load,
          stationId: station.id,
          status: 'ONLINE',
        },
      });
    }

    console.log(`   ✓ Configured ${loadsToCreate.length} critical load circuits for ${station.name}`);
  }

  console.log('\n========================================================');
  console.log('✅ POLAR-EMS Clean Baseline Initialized Successfully!');
  console.log('No synthetic telemetry seeded. Ready for real SCADA ingestion.');
  console.log('👥 Standard Logins:');
  console.log('   Admin:    admin@polar-ems.ncpor.res.in    / Admin@123');
  console.log('   Operator: operator@polar-ems.ncpor.res.in / Operator@123');
  console.log('   Viewer:   viewer@polar-ems.ncpor.res.in   / Viewer@123');
  console.log('========================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
