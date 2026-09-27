const { assistantService } = require('../src/services/ai');

describe('AI Assistant - RAG Knowledge Integration', () => {
  jest.setTimeout(35000);
  test('Conceptual inquiry triggers RAG knowledge retrieval and attaches evidence', async () => {
    const res = await assistantService.askAssistant({
      message: 'Explain how the BESS works and what are its life-support specifications?',
      stationId: 'MAITRI',
    });

    expect(res.success).toBe(true);
    expect(res.ragUsed).toBe(true);
    expect(res.answer).toBeDefined();
    expect(res.evidence.some((e) => e.type === 'KNOWLEDGE')).toBe(true);
    expect(res.provenance).toBeDefined();
  });

  test('Polar Night inquiry combines RAG knowledge with resilience tool simulation', async () => {
    const res = await assistantService.askAssistant({
      message: 'What happens during Polar Night contingency and how does POLAR-EMS respond?',
      stationId: 'MAITRI',
    });

    expect(res.success).toBe(true);
    expect(res.ragUsed).toBe(true);
    expect(res.toolsUsed).toContain('run_resilience_scenario');
    expect(res.evidence.some((e) => e.type === 'RESILIENCE' || e.type === 'KNOWLEDGE')).toBe(true);
  });
});
