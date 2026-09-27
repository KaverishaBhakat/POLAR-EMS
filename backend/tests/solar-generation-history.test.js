const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/config/database');

describe('Solar Generation History API & Provenance', () => {
  let maitriStationId;

  beforeAll(async () => {
    const station = await prisma.station.findUnique({
      where: { code: 'MAITRI' },
    });
    maitriStationId = station.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/solar-generation-history/:stationId/summary', () => {
    it('should return summary metrics with explicit climatological provenance', async () => {
      const res = await request(app)
        .get(`/api/solar-generation-history/${maitriStationId}/summary`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.hasData).toBe(true);
      expect(res.body.data.totalPoints).toBe(8760);
      expect(res.body.data.availablePoints).toBe(8040);
      expect(res.body.data.unavailablePoints).toBe(720);
      expect(res.body.data.provenance).toBe('CLIMATOLOGICAL_ESTIMATE');
      expect(res.body.data.maxSolarPowerKW).toBeGreaterThan(0);
      expect(res.body.data.avgSolarPowerKW).toBeGreaterThan(0);
    });

    it('should return 404 for invalid station ID', async () => {
      await request(app)
        .get('/api/solar-generation-history/00000000-0000-0000-0000-000000000000/summary')
        .expect(404);
    });
  });

  describe('GET /api/solar-generation-history/:stationId', () => {
    it('should return paginated historical records preserving NULL polar night values', async () => {
      const res = await request(app)
        .get(`/api/solar-generation-history/${maitriStationId}?limit=10&page=1`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.records).toHaveLength(10);
      expect(res.body.data.pagination.total).toBe(8760);

      // Verify records are marked CLIMATOLOGICAL_ESTIMATE or UNAVAILABLE, never MEASURED
      for (const rec of res.body.data.records) {
        expect(['CLIMATOLOGICAL_ESTIMATE', 'UNAVAILABLE']).toContain(rec.solarSource);
        expect(rec.solarSource).not.toBe('MEASURED');
      }
    });

    it('should return UNAVAILABLE for June polar night records', async () => {
      const res = await request(app)
        .get(`/api/solar-generation-history/${maitriStationId}?start=2019-06-15T00:00:00Z&end=2019-06-15T23:59:59Z&limit=24`)
        .expect(200);

      expect(res.body.success).toBe(true);
      for (const rec of res.body.data.records) {
        expect(rec.solarPowerKW).toBeNull();
        expect(rec.irradianceWm2).toBeNull();
        expect(rec.solarSource).toBe('UNAVAILABLE');
      }
    });
  });
});
