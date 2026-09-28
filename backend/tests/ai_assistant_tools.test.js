const { assistantService, MockAiProvider } = require('../src/services/ai');

describe('AI Assistant - Tool Calling Loop & Multi-Step Execution', () => {
  jest.setTimeout(35000);
  test('Current weather query triggers get_current_weather tool execution', async () => {
    const res = await assistantService.askAssistant({
      message: 'What is the current weather at Maitri?',
      stationId: 'MAITRI',
    });

    expect(res.success).toBe(true);
    expect(res.toolsUsed).toContain('get_current_weather');
    expect(res.evidence.some((e) => e.tool === 'get_current_weather')).toBe(true);
  });

  test('Battery query triggers get_current_battery tool execution', async () => {
    const res = await assistantService.askAssistant({
      message: 'What is the current battery SOC right now?',
      stationId: 'MAITRI',
    });

    expect(res.success).toBe(true);
    expect(res.toolsUsed).toContain('get_current_battery');
    expect(res.evidence.some((e) => e.tool === 'get_current_battery')).toBe(true);
  });

  test('Forecast query triggers get_weather_forecast tool execution', async () => {
    const res = await assistantService.askAssistant({
      message: 'What will the weather forecast be over the next 24 hours at Maitri?',
      stationId: 'MAITRI',
    });

    expect(res.success).toBe(true);
    expect(res.toolsUsed).toContain('get_weather_forecast');
  });

  test('Optimization query triggers get_optimization_dispatch tool execution', async () => {
    const res = await assistantService.askAssistant({
      message: 'How should the system dispatch the generators and battery tomorrow?',
      stationId: 'MAITRI',
    });

    expect(res.success).toBe(true);
    expect(res.toolsUsed).toContain('get_optimization_dispatch');
  });

  test('Bharati current weather triggers get_current_weather with REAL / MEASURED provenance', async () => {
    const res = await assistantService.askAssistant({
      message: 'What is the current weather at Bharati?',
      stationId: 'BHARATI',
    });

    expect(res.success).toBe(true);
    expect(res.toolsUsed).toContain('get_current_weather');
    expect(res.station.code).toBe('BHARATI');
    expect(res.provenance).toContain('REAL / MEASURED');
    expect(res.answer).toContain('Bharati');
  });

  test('Bharati historical weather triggers get_weather_history with REAL / MEASURED provenance', async () => {
    const res = await assistantService.askAssistant({
      message: 'Show me the recent weather history for Bharati.',
      stationId: 'BHARATI',
    });

    expect(res.success).toBe(true);
    expect(res.toolsUsed).toContain('get_weather_history');
    expect(res.station.code).toBe('BHARATI');
    expect(res.provenance).toContain('REAL / MEASURED');
    expect(res.answer).toContain('Bharati');
  });

  test('Bharati latest temperature triggers get_current_weather with REAL / MEASURED provenance', async () => {
    const res = await assistantService.askAssistant({
      message: 'What is the latest Bharati temperature?',
      stationId: 'BHARATI',
    });

    expect(res.success).toBe(true);
    expect(res.toolsUsed).toContain('get_current_weather');
    expect(res.station.code).toBe('BHARATI');
    expect(res.provenance).toContain('REAL / MEASURED');
  });

  test('Bharati battery SOC query returns UNAVAILABLE without fabricated data', async () => {
    const res = await assistantService.askAssistant({
      message: 'What is the current battery SOC at Bharati?',
      stationId: 'BHARATI',
    });

    expect(res.success).toBe(true);
    expect(res.station.code).toBe('BHARATI');
    expect(res.provenance).toContain('UNAVAILABLE');
    expect(res.answer.toLowerCase()).toContain('unavailable');
  });

  test('Bharati renewable generation query returns UNAVAILABLE without fabricated data', async () => {
    const res = await assistantService.askAssistant({
      message: 'How much renewable energy is Bharati generating?',
      stationId: 'BHARATI',
    });

    expect(res.success).toBe(true);
    expect(res.station.code).toBe('BHARATI');
    expect(res.provenance).toContain('UNAVAILABLE');
    expect(res.answer.toLowerCase()).toContain('unavailable');
  });

  test('Bharati Polar Night distinguishes MODEL / SCENARIO from real telemetry', async () => {
    const res = await assistantService.askAssistant({
      message: 'What happens during Polar Night at Bharati?',
      stationId: 'BHARATI',
    });

    expect(res.success).toBe(true);
    expect(res.station.code).toBe('BHARATI');
    expect(res.answer).toContain('MODEL / SCENARIO');
    expect(res.answer).toContain('NOT represent measured');
  });

  test('Maitri current weather remains unchanged with get_current_weather and REAL / MEASURED', async () => {
    const res = await assistantService.askAssistant({
      message: 'What is the current weather at Maitri?',
      stationId: 'MAITRI',
    });

    expect(res.success).toBe(true);
    expect(res.toolsUsed).toContain('get_current_weather');
    expect(res.station.code).toBe('MAITRI');
    expect(res.provenance).toContain('REAL / MEASURED');
  });

  test('Maitri weather history triggers get_weather_history with REAL / MEASURED', async () => {
    const res = await assistantService.askAssistant({
      message: 'Show me the recent weather history for Maitri.',
      stationId: 'MAITRI',
    });

    expect(res.success).toBe(true);
    expect(res.toolsUsed).toContain('get_weather_history');
    expect(res.station.code).toBe('MAITRI');
    expect(res.provenance).toContain('REAL / MEASURED');
  });

  test('Enforces maximum 3 iteration boundary on tool loops without infinite spinning', async () => {
    // Create a mock provider that continuously requests tool calls
    const loopingProvider = new MockAiProvider({
      customHandler: ({ messages }) => {
        return {
          text: 'Looping step...',
          toolCalls: [{ name: 'get_current_energy', arguments: { stationId: 'MAITRI' } }],
          finishReason: 'tool_call',
        };
      },
    });

    const res = await assistantService.askAssistant({
      message: 'What is the energy situation?',
      stationId: 'MAITRI',
      providerOverride: loopingProvider,
    });

    expect(res.success).toBe(true);
    expect(res.answer).toBeDefined();
    // Maximum 3 calls were executed
    expect(loopingProvider.callHistory.length).toBeLessThanOrEqual(3);
  });
});
