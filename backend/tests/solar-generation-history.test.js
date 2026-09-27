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
    it('should return summary metrics with explicit climatological provenance using UUID', async () => {
      const res = await request(app)
        .get(`/api/solar-generation-history/${maitriStationId}/summary`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.hasData).toBe(true);
      expect(res.body.data.station.code).toBe('MAITRI');
      expect(res.body.data.totalPoints).toBe(8760);
      expect(res.body.data.availablePoints).toBe(8040);
      expect(res.body.data.unavailablePoints).toBe(720);
      expect(res.body.data.provenance).toBe('CLIMATOLOGICAL_ESTIMATE');
      expect(res.body.data.maxSolarPowerKW).toBeGreaterThan(0);
      expect(res.body.data.avgSolarPowerKW).toBeGreaterThan(0);
    });

    it('should resolve station code MAITRI for summary', async () => {
      const res = await request(app)
        .get('/api/solar-generation-history/MAITRI/summary')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.station.id).toBe(maitriStationId);
      expect(res.body.data.totalPoints).toBe(8760);
    });

    it('should resolve lowercase station code maitri for summary', async () => {
      const res = await request(app)
        .get('/api/solar-generation-history/maitri/summary')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.station.id).toBe(maitriStationId);
      expect(res.body.data.totalPoints).toBe(8760);
    });

    it('should return 404 for invalid station ID or code', async () => {
      await request(app)
        .get('/api/solar-generation-history/invalid_station_xyz/summary')
        .expect(404);
    });
  });

  describe('GET /api/solar-generation-history/:stationId', () => {
    it('should return paginated historical records using UUID', async () => {
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

    it('should resolve uppercase station code MAITRI', async () => {
      const res = await request(app)
        .get('/api/solar-generation-history/MAITRI?limit=5&page=1')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.station.id).toBe(maitriStationId);
      expect(res.body.data.station.code).toBe('MAITRI');
      expect(res.body.data.pagination.total).toBe(8760);
      expect(res.body.data.records).toHaveLength(5);
    });

    it('should resolve lowercase station code maitri', async () => {
      const res = await request(app)
        .get('/api/solar-generation-history/maitri?limit=5&page=1')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.station.id).toBe(maitriStationId);
      expect(res.body.data.station.code).toBe('MAITRI');
      expect(res.body.data.pagination.total).toBe(8760);
      expect(res.body.data.records).toHaveLength(5);
    });

    it('should return 404 for non-existent station identifier', async () => {
      const res = await request(app)
        .get('/api/solar-generation-history/unknown_station_999')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('STATION_NOT_FOUND');
    });

    it('should return UNAVAILABLE for June polar night records', async () => {
      const res = await request(app)
        .get(`/api/solar-generation-history/MAITRI?start=2019-06-15T00:00:00Z&end=2019-06-15T23:59:59Z&limit=24`)
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
