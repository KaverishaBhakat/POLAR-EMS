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
