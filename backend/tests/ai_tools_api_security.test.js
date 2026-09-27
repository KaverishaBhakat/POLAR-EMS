const request = require('supertest');
const app = require('../src/app');

describe('AI Tools - API Endpoints & Security Boundaries', () => {
  test('GET /api/ai/tools returns discovery list with parameter schemas', async () => {
    const res = await request(app).get('/api/ai/tools');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(16);
    expect(Array.isArray(res.body.tools)).toBe(true);

    const weatherTool = res.body.tools.find((t) => t.name === 'get_current_weather');
    expect(weatherTool).toBeDefined();
    expect(weatherTool.readOnly).toBe(true);
    expect(weatherTool.parameters).toHaveProperty('properties');
  });

  test('POST /api/ai/tools/execute successfully runs a registered tool', async () => {
    const res = await request(app)
      .post('/api/ai/tools/execute')
      .send({
        tool: 'get_current_weather',
        arguments: { stationId: 'MAITRI' },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tool).toBe('get_current_weather');
    expect(res.body.data).toBeDefined();
    expect(res.body.provenance).toBeDefined();
    // Verify credentials are never leaked
    expect(res.body.DATABASE_URL).toBeUndefined();
    expect(res.body.password).toBeUndefined();
  });

  test('POST /api/ai/tools/execute rejects empty tool name', async () => {
    const res = await request(app)
      .post('/api/ai/tools/execute')
      .send({ tool: '', arguments: {} });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // Security test suite: Explicitly verify malicious or unauthorized tool names fail
  test('SECURITY: Rejects arbitrary Prisma / SQL execution attempts', async () => {
    const attempts = [
      'prisma.queryRaw',
      'execute_sql',
      'shell',
      '../../some-file',
      'run_python',
      'eval',
      'DROP TABLE users',
    ];

    for (const badTool of attempts) {
      const res = await request(app)
        .post('/api/ai/tools/execute')
        .send({ tool: badTool, arguments: {} });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNRECOGNIZED_TOOL');
    }
  });

  test('SECURITY: Controlled error response for invalid station without stack traces', async () => {
    const res = await request(app)
      .post('/api/ai/tools/execute')
      .send({
        tool: 'get_current_energy',
        arguments: { stationId: 'NON_EXISTENT_STATION' },
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('code');
    expect(res.body.error).toHaveProperty('message');
    expect(res.body.stack).toBeUndefined();
  });
});
