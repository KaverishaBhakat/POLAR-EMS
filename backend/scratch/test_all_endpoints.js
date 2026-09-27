const request = require('supertest');
const app = require('../src/app');

async function testAllEndpoints() {
  const routes = [
    '/api/health',
    '/api/stations',
    '/api/solar-resource',
    '/api/weather',
    '/api/energy',
    '/api/renewable',
    '/api/generators',
    '/api/battery',
    '/api/alerts',
    '/api/pv-generation/estimate?stationId=5e70a9cf-fe6b-4c3a-a615-79fd2e453b60&timestamp=2019-12-15T13:00:00Z',
    '/api/solar-generation-history/5e70a9cf-fe6b-4c3a-a615-79fd2e453b60?page=1&limit=5',
    '/api/solar-generation-history/5e70a9cf-fe6b-4c3a-a615-79fd2e453b60/summary',
    '/api/dashboard/5e70a9cf-fe6b-4c3a-a615-79fd2e453b60',
  ];

  for (const r of routes) {
    try {
      const res = await request(app).get(r);
      console.log(`${r} -> Status ${res.status}`, res.status >= 400 ? res.body : '');
    } catch (err) {
      console.error(`${r} -> ERROR:`, err.message);
    }
  }
}

testAllEndpoints().then(() => process.exit(0));
