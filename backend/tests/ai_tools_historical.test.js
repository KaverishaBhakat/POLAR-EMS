const {
  getWeatherHistory,
  getEnergyHistory,
  getRenewableHistory,
  getBatteryHistory,
  getGeneratorHistory,
  getSolarResource,
  getHistoricalSolarGeneration,
  getEnergyAnalytics,
} = require('../src/services/ai-tools');

describe('AI Tools - Historical Telemetry & Solar Datasets', () => {
  test('getWeatherHistory enforces bounded limits and returns series', async () => {
    const res = await getWeatherHistory({ stationId: 'MAITRI', limit: 10 });

    expect(res.success).toBe(true);
    expect(res.tool).toBe('get_weather_history');
    expect(res.data.length).toBeLessThanOrEqual(10);
    expect(res.provenance).toBe('REAL / MEASURED');
  });

  test('getEnergyHistory enforces bounded limits', async () => {
    const res = await getEnergyHistory({ stationId: 'MAITRI', limit: 5 });

    expect(res.success).toBe(true);
    expect(res.tool).toBe('get_energy_history');
    expect(res.data.length).toBeLessThanOrEqual(5);
    expect(res.provenance).toBe('MODELED / SCENARIO');
  });

  test('getRenewableHistory returns solar and wind series', async () => {
    const res = await getRenewableHistory({ stationId: 'MAITRI', limit: 5 });

    expect(res.success).toBe(true);
    expect(res.tool).toBe('get_renewable_history');
    expect(res.provenance).toBe('MODELED / SCENARIO');
  });

  test('getBatteryHistory returns battery telemetry', async () => {
    const res = await getBatteryHistory({ stationId: 'MAITRI', limit: 5 });

    expect(res.success).toBe(true);
    expect(res.tool).toBe('get_battery_history');
    expect(res.provenance).toBe('MODELED / SCENARIO');
  });

  test('getGeneratorHistory returns generator readings', async () => {
    const res = await getGeneratorHistory({ stationId: 'MAITRI', limit: 5 });

    expect(res.success).toBe(true);
    expect(res.tool).toBe('get_generator_history');
    expect(res.provenance).toBe('MODELED / SCENARIO');
  });

  test('getSolarResource returns REAL CLIMATOLOGY', async () => {
    const resSummary = await getSolarResource({});
    expect(resSummary.success).toBe(true);
    expect(resSummary.provenance).toBe('REAL CLIMATOLOGY');

    const resMonth = await getSolarResource({ month: 12 });
    expect(resMonth.success).toBe(true);
    expect(Array.isArray(resMonth.data)).toBe(true);
    expect(resMonth.data.length).toBe(24);
    expect(resMonth.provenance).toBe('REAL CLIMATOLOGY');
  });

  test('getHistoricalSolarGeneration returns MODELED / SCENARIO PV yield', async () => {
    const res = await getHistoricalSolarGeneration({ stationId: 'MAITRI', limit: 12 });

    expect(res.success).toBe(true);
    expect(res.tool).toBe('get_historical_solar_generation');
    expect(res.provenance).toBe('MODELED / SCENARIO');
    expect(res.data.length).toBeLessThanOrEqual(12);
  });

  test('getEnergyAnalytics returns summarized KPI metrics', async () => {
    const res = await getEnergyAnalytics({ stationId: 'MAITRI', range: '7d' });

    expect(res.success).toBe(true);
    expect(res.tool).toBe('get_energy_analytics');
    expect(res.summary).toHaveProperty('fuelSavingsPercent');
    expect(res.summary).toHaveProperty('dieselSavedLitres');
    expect(res.summary).toHaveProperty('renewablePenetrationPercent');
  });

  test('rejects invalid date range (end < start)', async () => {
    await expect(
      getWeatherHistory({
        stationId: 'MAITRI',
        start: '2026-12-31T00:00:00Z',
        end: '2026-01-01T00:00:00Z',
      })
    ).rejects.toThrow();
  });
});
