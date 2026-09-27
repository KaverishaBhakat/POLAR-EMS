const request = require('supertest');
const app = require('../src/app');

describe('RAG API Endpoints (/api/rag/search)', () => {
  test('POST /api/rag/search returns 200 with valid search query', async () => {
    const res = await request(app)
      .post('/api/rag/search')
      .send({
        query: 'What is POLAR-EMS and what does it optimize?',
        topK: 3,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('query');
    expect(res.body).toHaveProperty('results');
    expect(res.body).toHaveProperty('totalMatches');
    expect(res.body).toHaveProperty('provider');
    expect(Array.isArray(res.body.results)).toBe(true);

    if (res.body.results.length > 0) {
      const top = res.body.results[0];
      expect(top).toHaveProperty('chunkId');
      expect(top).toHaveProperty('content');
      expect(top).toHaveProperty('provenance');
      expect(top).toHaveProperty('score');
      // Verify raw embeddings or DB credentials are never returned
      expect(top.embedding).toBeUndefined();
      expect(res.body.DATABASE_URL).toBeUndefined();
    }
  });

  test('GET /api/rag/search returns 200 with query parameters', async () => {
    const res = await request(app)
      .get('/api/rag/search?query=polar+night+resilience+scenario&topK=2');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results.length).toBeLessThanOrEqual(2);
  });

  test('POST /api/rag/search returns 400 for empty query', async () => {
    const res = await request(app)
      .post('/api/rag/search')
      .send({ query: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/rag/search rejects queries exceeding 500 characters', async () => {
    const longQuery = 'a'.repeat(501);
    const res = await request(app)
      .post('/api/rag/search')
      .send({ query: longQuery });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
