const { toolSelectionService, INTENT_TYPES } = require('../src/services/ai');

describe('AI Assistant - Intent Classification & Deterministic Routing', () => {
  test('Classifies current weather query as LIVE_TELEMETRY', () => {
    const intents = toolSelectionService.classifyIntent('What is the current weather at Maitri?');
    expect(intents).toContain(INTENT_TYPES.LIVE_TELEMETRY);
  });

  test('Classifies battery SOC query as LIVE_TELEMETRY', () => {
    const intents = toolSelectionService.classifyIntent('What is the current battery SOC right now?');
    expect(intents).toContain(INTENT_TYPES.LIVE_TELEMETRY);
  });

  test('Classifies historical query as HISTORICAL_DATA', () => {
    const intents = toolSelectionService.classifyIntent('Show the last 24 hours of wind generation.');
    expect(intents).toContain(INTENT_TYPES.HISTORICAL_DATA);
  });

  test('Classifies weather prediction query as FORECAST', () => {
    const intents = toolSelectionService.classifyIntent('What will the temperature forecast be over the next 24 hours?');
    expect(intents).toContain(INTENT_TYPES.FORECAST);
  });

  test('Classifies dispatch query as OPTIMIZATION', () => {
    const intents = toolSelectionService.classifyIntent('How should the generators and battery be dispatched tomorrow?');
    expect(intents).toContain(INTENT_TYPES.OPTIMIZATION);
  });

  test('Classifies contingency query as RESILIENCE', () => {
    const intents = toolSelectionService.classifyIntent('What happens during Polar Night contingency?');
    expect(intents).toContain(INTENT_TYPES.RESILIENCE);
  });

  test('Classifies fuel savings query as ANALYTICS', () => {
    const intents = toolSelectionService.classifyIntent('How much diesel fuel was saved over the past period?');
    expect(intents).toContain(INTENT_TYPES.ANALYTICS);
  });

  test('Classifies conceptual question as KNOWLEDGE', () => {
    const intents = toolSelectionService.classifyIntent('Explain how the battery energy storage system works in POLAR-EMS.');
    expect(intents).toContain(INTENT_TYPES.KNOWLEDGE);
  });

  test('Classifies historical weather query as HISTORICAL_DATA', () => {
    const intents = toolSelectionService.classifyIntent('Show me the recent weather history for Bharati.');
    expect(intents).toContain(INTENT_TYPES.HISTORICAL_DATA);
  });

  test('Classifies past date weather query as HISTORICAL_DATA', () => {
    const intents = toolSelectionService.classifyIntent('Show me Bharati weather from January 2018.');
    expect(intents).toContain(INTENT_TYPES.HISTORICAL_DATA);
  });

  test('Classifies temperature change query as HISTORICAL_DATA', () => {
    const intents = toolSelectionService.classifyIntent("How has Bharati's temperature changed historically?");
    expect(intents).toContain(INTENT_TYPES.HISTORICAL_DATA);
  });

  test('Classifies latest temperature query as LIVE_TELEMETRY', () => {
    const intents = toolSelectionService.classifyIntent('What is the latest Bharati temperature?');
    expect(intents).toContain(INTENT_TYPES.LIVE_TELEMETRY);
  });

  test('Classifies how cold right now query as LIVE_TELEMETRY', () => {
    const intents = toolSelectionService.classifyIntent('How cold is Bharati right now?');
    expect(intents).toContain(INTENT_TYPES.LIVE_TELEMETRY);
  });

  test('Classifies mixed question with both telemetry and explanation', () => {
    const intents = toolSelectionService.classifyIntent('Why is the current battery SOC low and what is the system specification?');
    expect(intents.length).toBeGreaterThan(1);
    expect(intents).toContain(INTENT_TYPES.LIVE_TELEMETRY);
    expect(intents).toContain(INTENT_TYPES.KNOWLEDGE);
  });
});
