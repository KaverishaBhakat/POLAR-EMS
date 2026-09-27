const {
  EMBEDDING_DIMENSION,
  LocalDeterministicEmbeddingProvider,
  getEmbeddingProvider,
} = require('../src/services/rag/embeddingProvider');

describe('RAG Embedding Provider Interface', () => {
  const provider = new LocalDeterministicEmbeddingProvider();

  test('returns correct embedding dimension (768)', () => {
    expect(provider.getDimension()).toBe(768);
    expect(EMBEDDING_DIMENSION).toBe(768);
  });

  test('produces L2 normalized unit vectors', async () => {
    const text = 'Polar microgrid optimization with BESS and diesel generators';
    const vec = await provider.embedText(text);

    expect(vec.length).toBe(768);
    let norm = 0;
    for (let i = 0; i < vec.length; i++) {
      norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm);
    expect(norm).toBeCloseTo(1.0, 3);
  });

  test('generates higher similarity for semantically related texts', async () => {
    const vecPV = await provider.embedText('Solar photovoltaic power generation irradiance');
    const vecSolar = await provider.embedText('Solar irradiance and PV panel energy calculation');
    const vecDiesel = await provider.embedText('Diesel generator fuel oil consumption SFOC');

    // Cosine similarity between unit vectors is dot product
    const dot = (a, b) => a.reduce((sum, val, idx) => sum + val * b[idx], 0);

    const simSolar = dot(vecPV, vecSolar);
    const simDiesel = dot(vecPV, vecDiesel);

    expect(simSolar).toBeGreaterThan(simDiesel);
  });

  test('factory returns provider instance', () => {
    const fallback = getEmbeddingProvider('local');
    expect(fallback.getProviderName()).toContain('local-deterministic');
  });
});
