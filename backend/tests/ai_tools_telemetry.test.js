const {
  getCurrentWeather,
  getCurrentEnergy,
  getCurrentRenewable,
  getCurrentBattery,
  getCurrentGenerators,
  getCurrentAlerts,
  getCriticalLoads,
} = require('../src/services/ai-tools');

describe('AI Tools - Current Telemetry & Operational State', () => {
  test('getCurrentWeather resolves MAITRI (case-insensitive) and returns valid telemetry', async () => {
    const resUpper = await getCurrentWeather({ stationId: 'MAITRI' });
    const resLower = await getCurrentWeather({ stationId: 'maitri' });

    expect(resUpper.success).toBe(true);
    expect(resUpper.tool).toBe('get_current_weather');
    expect(resUpper.station.code).toBe('MAITRI');
    expect(resUpper.data).toHaveProperty('temperature');
    expect(resUpper.data).toHaveProperty('pressure');
    expect(resUpper.data).toHaveProperty('windSpeed');
    expect(resUpper.provenance).toBeDefined();

    expect(resLower.success).toBe(true);
    expect(resLower.station.id).toBe(resUpper.station.id);
  });

  test('getCurrentEnergy returns valid electrical load breakdowns', async () => {
    const res = await getCurrentEnergy({ stationId: 'MAITRI' });

    expect(res.success).toBe(true);
    expect(res.tool).toBe('get_current_energy');
    expect(res.data).toHaveProperty('totalLoadKW');
    expect(res.data).toHaveProperty('heatingLoadKW');
    expect(res.data).toHaveProperty('waterLoadKW');
    expect(res.provenance).toBe('MODELED / SCENARIO');
  });

  test('getCurrentRenewable returns solar and wind generation in kW', async () => {
    const res = await getCurrentRenewable({ stationId: 'MAITRI' });

    expect(res.success).toBe(true);
    expect(res.tool).toBe('get_current_renewable');
    expect(res.data).toHaveProperty('solarPowerKW');
    expect(res.data).toHaveProperty('windPowerKW');
    expect(res.data).toHaveProperty('totalRenewableKW');
    expect(res.provenance).toBe('MODELED / SCENARIO');
  });

  test('getCurrentBattery returns BESS SOC and charge limits', async () => {
    const res = await getCurrentBattery({ stationId: 'MAITRI' });

    expect(res.success).toBe(true);
    expect(res.tool).toBe('get_current_battery');
    expect(res.data).toHaveProperty('currentSOCPercent');
    expect(res.data).toHaveProperty('capacityKWh');
    expect(res.data).toHaveProperty('maxChargePowerKW');
    expect(res.data).toHaveProperty('maxDischargePowerKW');
    expect(res.provenance).toBe('MODELED / SCENARIO');
  });

  test('getCurrentGenerators returns multi-genset fleet status', async () => {
    const res = await getCurrentGenerators({ stationId: 'MAITRI' });

    expect(res.success).toBe(true);
    expect(res.tool).toBe('get_current_generators');
    expect(res.totalGenerators).toBeGreaterThan(0);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data[0]).toHaveProperty('capacityKW');
    expect(res.data[0]).toHaveProperty('status');
    expect(res.data[0]).toHaveProperty('fuelLevelPercent');
    expect(res.provenance).toBe('MODELED / SCENARIO');
  });

  test('getCurrentAlerts returns active station monitoring alerts', async () => {
    const res = await getCurrentAlerts({ stationId: 'MAITRI' });

    expect(res.success).toBe(true);
    expect(res.tool).toBe('get_current_alerts');
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.provenance).toBe('REAL / MEASURED');
  });

  test('getCriticalLoads returns critical life-support priorities', async () => {
    const res = await getCriticalLoads({ stationId: 'MAITRI' });

    expect(res.success).toBe(true);
    expect(res.tool).toBe('get_critical_loads');
    expect(res.totalCriticalLoads).toBeGreaterThan(0);
    expect(res.provenance).toBe('ENGINEERING ASSUMPTION');
  });

  test('rejects non-existent station with controlled error', async () => {
    await expect(getCurrentWeather({ stationId: 'INVALID_STATION_CODE' })).rejects.toThrow();
  });
});
