const { prisma } = require('../backend/src/config/database');

async function runAudit() {
  console.log('================================================================');
  console.log('                 POLAR-EMS DATABASE DATA AUDIT                  ');
  console.log('================================================================\n');

  // 1. Stations
  console.log('--- 1. STATIONS TABLE (stations) ---');
  const stations = await prisma.station.findMany({
    include: {
      pvConfig: true,
      batteries: {
        include: {
          _count: { select: { readings: true } }
        }
      },
      generators: {
        include: {
          _count: { select: { readings: true } }
        }
      },
      criticalLoads: true,
      _count: {
        select: {
          weatherData: true,
          solarGenerationHistory: true,
          energyLoads: true,
          renewableGeneration: true,
          alerts: true,
          simulations: true,
        }
      }
    }
  });
  console.log(`Total Stations: ${stations.length}`);
  stations.forEach(s => {
    console.log(`\nStation: ${s.name} (${s.code})`);
    console.log(`  ID: ${s.id}`);
    console.log(`  Location: ${s.location} (Lat: ${s.latitude}, Lng: ${s.longitude})`);
    console.log(`  Status: ${s.status}`);
    console.log(`  PV Config:`, s.pvConfig);
    console.log(`  Batteries Count: ${s.batteries.length}`);
    s.batteries.forEach(b => console.log(`    - Battery ${b.name} (${b.capacity} kWh, SOC ${b.currentSOC}%): ${b._count.readings} readings`));
    console.log(`  Generators Count: ${s.generators.length}`);
    s.generators.forEach(g => console.log(`    - Generator ${g.name} (${g.capacity} kW, Status: ${g.status}): ${g._count.readings} readings`));
    console.log(`  Critical Loads Count: ${s.criticalLoads.length}`);
    console.log(`  Related Record Counts:`, s._count);
  });

  // 2. Weather Data
  console.log('\n--- 2. WEATHER DATA (weather_data) ---');
  const weatherCount = await prisma.weatherData.count();
  const weatherEarliest = await prisma.weatherData.findFirst({ orderBy: { timestamp: 'asc' } });
  const weatherLatest = await prisma.weatherData.findFirst({ orderBy: { timestamp: 'desc' } });
  const weatherNullRad = await prisma.weatherData.count({ where: { solarRadiation: null } });
  const weatherNullHum = await prisma.weatherData.count({ where: { humidity: null } });
  const weatherNullWindDir = await prisma.weatherData.count({ where: { windDirection: null } });
  const weatherByStation = await prisma.weatherData.groupBy({ by: ['stationId'], _count: { id: true } });

  console.log(`Total Rows: ${weatherCount}`);
  if (weatherCount > 0) {
    console.log(`By Station:`, weatherByStation);
    console.log(`Earliest Timestamp: ${weatherEarliest.timestamp.toISOString()}`);
    console.log(`Latest Timestamp:   ${weatherLatest.timestamp.toISOString()}`);
    console.log(`Null Solar Radiation count: ${weatherNullRad} (${((weatherNullRad/weatherCount)*100).toFixed(1)}%)`);
    console.log(`Null Humidity count:        ${weatherNullHum} (${((weatherNullHum/weatherCount)*100).toFixed(1)}%)`);
    console.log(`Null Wind Direction count:   ${weatherNullWindDir} (${((weatherNullWindDir/weatherCount)*100).toFixed(1)}%)`);
    
    // Check consecutive gap and duplicate timestamps
    const sampleRows = await prisma.weatherData.findMany({
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true },
      take: 1000
    });
    let maxGapHours = 0;
    let duplicateCount = 0;
    const seen = new Set();
    for (let i = 0; i < sampleRows.length; i++) {
      const t = sampleRows[i].timestamp.getTime();
      if (seen.has(t)) duplicateCount++;
      seen.add(t);
      if (i > 0) {
        const gap = (t - sampleRows[i-1].timestamp.getTime()) / (1000 * 3600);
        if (gap > maxGapHours) maxGapHours = gap;
      }
    }
    console.log(`Sample (first 1000): Max timestamp gap between observations: ${maxGapHours} hours, duplicates in sample: ${duplicateCount}`);
  }

  // 3. Solar Radiation Climatology
  console.log('\n--- 3. SOLAR RADIATION CLIMATOLOGY (solar_radiation_climatology) ---');
  const climCount = await prisma.solarRadiationClimatology.count();
  const climEarliestYear = await prisma.solarRadiationClimatology.findFirst({ orderBy: { year: 'asc' } });
  const climLatestYear = await prisma.solarRadiationClimatology.findFirst({ orderBy: { year: 'desc' } });
  const climNullRad = await prisma.solarRadiationClimatology.count({ where: { radiationValue: null } });
  const climNumericRad = await prisma.solarRadiationClimatology.count({ where: { radiationValue: { not: null } } });

  console.log(`Total Rows: ${climCount}`);
  if (climCount > 0) {
    console.log(`Earliest Year: ${climEarliestYear.year}`);
    console.log(`Latest Year:   ${climLatestYear.year}`);
    console.log(`Numeric radiation values: ${climNumericRad}`);
    console.log(`Null radiation values:    ${climNullRad}`);

    // Check unique years and hours
    const years = await prisma.solarRadiationClimatology.groupBy({ by: ['year'], _count: { id: true } });
    console.log(`Unique Years count: ${years.length} (Years: ${years.map(y => y.year).sort().join(', ')})`);
  }

  // 4. Solar Generation History
  console.log('\n--- 4. SOLAR GENERATION HISTORY (solar_generation_history) ---');
  const solarHistCount = await prisma.solarGenerationHistory.count();
  const solarHistEarliest = await prisma.solarGenerationHistory.findFirst({ orderBy: { timestamp: 'asc' } });
  const solarHistLatest = await prisma.solarGenerationHistory.findFirst({ orderBy: { timestamp: 'desc' } });
  const solarHistBySource = await prisma.solarGenerationHistory.groupBy({ by: ['solarSource'], _count: { id: true } });
  const solarHistNullPower = await prisma.solarGenerationHistory.count({ where: { solarPowerKW: null } });
  const solarHistByStation = await prisma.solarGenerationHistory.groupBy({ by: ['stationId'], _count: { id: true } });

  console.log(`Total Rows: ${solarHistCount}`);
  if (solarHistCount > 0) {
    console.log(`By Station:`, solarHistByStation);
    console.log(`Earliest Timestamp: ${solarHistEarliest.timestamp.toISOString()}`);
    console.log(`Latest Timestamp:   ${solarHistLatest.timestamp.toISOString()}`);
    console.log(`By Source Breakdown:`, solarHistBySource);
    console.log(`Null solarPowerKW count: ${solarHistNullPower}`);
  }

  // 5. Energy Loads
  console.log('\n--- 5. ENERGY LOADS (energy_loads) ---');
  const loadCount = await prisma.energyLoad.count();
  const loads = await prisma.energyLoad.findMany({ orderBy: { timestamp: 'asc' } });
  console.log(`Total Rows: ${loadCount}`);
  loads.forEach((l, idx) => {
    console.log(`  Row ${idx + 1}: ID=${l.id}, StationId=${l.stationId}, Timestamp=${l.timestamp.toISOString()}, TotalLoad=${l.totalLoad} kW (Heating=${l.heatingLoad}, Water=${l.waterLoad}, Lab=${l.laboratoryLoad}, Comms=${l.communicationLoad}, Ref=${l.refrigerationLoad}, Flex=${l.flexibleLoad})`);
  });

  // 6. Renewable Generation
  console.log('\n--- 6. RENEWABLE GENERATION (renewable_generation) ---');
  const renCount = await prisma.renewableGeneration.count();
  const ren = await prisma.renewableGeneration.findMany({ orderBy: { timestamp: 'asc' } });
  console.log(`Total Rows: ${renCount}`);
  ren.forEach((r, idx) => {
    console.log(`  Row ${idx + 1}: ID=${r.id}, StationId=${r.stationId}, Timestamp=${r.timestamp.toISOString()}, Solar=${r.solarPower} kW, Wind=${r.windPower} kW, Total=${r.totalRenewable} kW`);
  });

  // 7. Battery Readings
  console.log('\n--- 7. BATTERY READINGS (battery_readings) ---');
  const battReadCount = await prisma.batteryReading.count();
  const battReadings = await prisma.batteryReading.findMany({ orderBy: { timestamp: 'asc' } });
  console.log(`Total Rows: ${battReadCount}`);
  battReadings.forEach((b, idx) => {
    console.log(`  Row ${idx + 1}: ID=${b.id}, BatteryId=${b.batteryId}, Timestamp=${b.timestamp.toISOString()}, SOC=${b.soc}%, Charge=${b.chargePower} kW, Discharge=${b.dischargePower} kW`);
  });

  // 8. Generator Readings
  console.log('\n--- 8. GENERATOR READINGS (generator_readings) ---');
  const genReadCount = await prisma.generatorReading.count();
  const genReadings = await prisma.generatorReading.findMany({ orderBy: { timestamp: 'asc' } });
  console.log(`Total Rows: ${genReadCount}`);
  genReadings.forEach((g, idx) => {
    console.log(`  Row ${idx + 1}: ID=${g.id}, GeneratorId=${g.generatorId}, Timestamp=${g.timestamp.toISOString()}, PowerOutput=${g.powerOutput} kW, FuelConsumed=${g.fuelConsumed} L, Efficiency=${g.efficiency}%, Runtime=${g.runtime} h`);
  });

  // 9. Critical Loads
  console.log('\n--- 9. CRITICAL LOADS (critical_loads) ---');
  const critCount = await prisma.criticalLoad.count();
  const critLoads = await prisma.criticalLoad.findMany({ orderBy: { priority: 'asc' } });
  console.log(`Total Rows: ${critCount}`);
  critLoads.forEach((c) => {
    console.log(`  [Priority ${c.priority}] ${c.name} (${c.category}) — Rated: ${c.ratedPower} kW, Current: ${c.currentPower} kW, Status: ${c.status}, StationId: ${c.stationId}`);
  });

  // 10. Alerts
  console.log('\n--- 10. ALERTS (alerts) ---');
  const alertCount = await prisma.alert.count();
  const alerts = await prisma.alert.findMany({ orderBy: { createdAt: 'desc' } });
  console.log(`Total Rows: ${alertCount}`);
  alerts.forEach((a) => {
    console.log(`  [${a.severity}] ${a.title} (${a.status}) — StationId: ${a.stationId}, Source: ${a.source}, CreatedAt: ${a.createdAt.toISOString()}`);
  });

  console.log('\n================================================================');
  console.log('                 AUDIT RUN COMPLETED                            ');
  console.log('================================================================\n');
}

runAudit().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
