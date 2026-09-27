const ragService = require('../src/services/rag.service');

describe('RAG Retrieval Service Unit Tests', () => {
  test('rejects empty queries with ApiError', async () => {
    await expect(ragService.search({ query: '' })).rejects.toThrow();
    await expect(ragService.search({ query: '   ' })).rejects.toThrow();
  });

  test('executes semantic search and returns properly structured results', async () => {
    const results = await ragService.search({
      query: 'What is the BESS battery capacity and SOC limits?',
      topK: 3,
    });

    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      const top = results[0];
      expect(top).toHaveProperty('chunkId');
      expect(top).toHaveProperty('documentId');
      expect(top).toHaveProperty('title');
      expect(top).toHaveProperty('content');
      expect(top).toHaveProperty('score');
      expect(top).toHaveProperty('provenance');
      expect(typeof top.score).toBe('number');
      // Verify raw vector is NOT exposed in result
      expect(top).not.toHaveProperty('embedding');
    }
  });

  test('respects topK limit parameter', async () => {
    const results = await ragService.search({
      query: 'Antarctic station microgrid',
      topK: 2,
    });

    expect(results.length).toBeLessThanOrEqual(2);
  });

  test('filters results by category when specified', async () => {
    const results = await ragService.search({
      query: 'Solar photovoltaic yield and irradiance calculation',
      category: 'RENEWABLE',
      topK: 5,
    });

    results.forEach((r) => {
      expect(r.category).toBe('RENEWABLE');
    });
  });

  test('filters results by station when specified', async () => {
    const results = await ragService.search({
      query: 'Station infrastructure and baseline specs',
      station: 'BHARATI',
      topK: 5,
    });

    results.forEach((r) => {
      expect(['BHARATI', 'ALL', null]).toContain(r.station);
    });
  });
});
