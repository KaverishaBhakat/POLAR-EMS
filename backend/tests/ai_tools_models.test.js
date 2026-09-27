const {
  getWeatherForecastTool,
  getOptimizationDispatch,
  runResilienceScenarioTool,
} = require('../src/services/ai-tools');

describe('AI Tools - Models, Forecasting, Optimization & Resilience', () => {
  jest.setTimeout(35000);
  test('getWeatherForecastTool returns 24-hour ML forecast', async () => {
    const res = await getWeatherForecastTool({ stationId: 'MAITRI', horizonHours: 24 });

    expect(res.success).toBe(true);
    expect(res.tool).toBe('get_weather_forecast');
    expect(res.horizonHours).toBe(24);
    expect(res.provenance).toBe('MODELED / SCENARIO');
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBe(24);
  });

  test('getWeatherForecastTool rejects invalid forecast horizon', async () => {
    await expect(
      getWeatherForecastTool({ stationId: 'MAITRI', horizonHours: 72 })
    ).rejects.toThrow();
  });

  test('getOptimizationDispatch returns 24-hour MILP schedule with OPTIMIZATION provenance', async () => {
    const res = await getOptimizationDispatch({ stationId: 'MAITRI', horizonHours: 24 });

    expect(res.success).toBe(true);
    expect(res.tool).toBe('get_optimization_dispatch');
    expect(res.provenance).toBe('OPTIMIZATION');
    expect(res.metrics).toBeDefined();
    expect(Array.isArray(res.dispatchSchedule)).toBe(true);
    expect(res.dispatchSchedule.length).toBe(24);
  });

  test('getOptimizationDispatch rejects non-24h horizons', async () => {
    await expect(
      getOptimizationDispatch({ stationId: 'MAITRI', horizonHours: 12 })
    ).rejects.toThrow();
  });

  test('runResilienceScenarioTool executes polar-night scenario', async () => {
    const res = await runResilienceScenarioTool({
      stationId: 'MAITRI',
      scenarioId: 'polar-night',
      horizonHours: 24,
    });

    expect(res.success).toBe(true);
    expect(res.tool).toBe('run_resilience_scenario');
    expect(res.scenarioId).toBe('polar-night');
    expect(res.provenance).toBe('MODELED / SCENARIO');
    expect(res.assumptions).toBeDefined();
  });

  test('runResilienceScenarioTool rejects unauthorized scenarioId', async () => {
    await expect(
      runResilienceScenarioTool({
        stationId: 'MAITRI',
        scenarioId: 'unregistered-arbitrary-scenario',
      })
    ).rejects.toThrow();
  });
});
