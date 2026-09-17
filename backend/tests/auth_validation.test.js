const request = require('supertest');
const app = require('../src/app');

describe('Input Validation & Auth Guards', () => {
  it('POST /api/auth/register should reject invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test Operator',
      email: 'not-an-email',
      password: 'password123',
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
      ])
    );
  });

  it('POST /api/auth/register should reject short passwords', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test Operator',
      email: 'valid@example.com',
      password: '123',
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ])
    );
  });

  it('GET /api/auth/me should reject request without Authorization header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('GET /api/auth/me should reject request with invalid JWT token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token-xyz');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});
